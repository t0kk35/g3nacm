'use server'

import { auth } from '@/auth';
import * as db from '@/db'
import { NextRequest, NextResponse } from 'next/server';
import { createWorkflowContext, executeWorkflowAction } from '@/lib/workflow/workflow-engine';
import { workflowConfigCache } from '@/lib/workflow/workflow-cache';
import { ErrorCreators } from '@/lib/api-error-handling';
import { GetNextResponse } from './types';

const origin = 'api/action/get_next'

const query_team_text = `
SELECT team_id 
FROM user_team_link utl 
JOIN users u on u.id = utl.user_id
WHERE u.name = $1
`

const query_get_lease_text = `
WITH candidate AS (
  SELECT entity_id, entity_code
  FROM workflow_entity_state wes
  WHERE wes.assigned_to_team_id  = ANY($2)
  AND (wes.get_lease_user_name IS NULL OR wes.get_lease_expires < now())
  ORDER BY 
    CASE wes.priority
      WHEN 'Low' THEN 1
      WHEN 'Medium' THEN 2
      WHEN 'High' THEN 3 
    END DESC,
    wes.date_time ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE workflow_entity_state wes
SET 
  get_lease_user_name = $1,
  get_lease_expires = now() + interval '60 seconds'
FROM candidate c
WHERE wes.entity_id = c.entity_id
AND wes.entity_code = c.entity_code
RETURNING wes.entity_id, wes.entity_code, wes.org_unit_code, wes.from_state_code, wes.to_state_code
`

/**
 * Post function that performs a GetNext Operation. It will fetch the next alert for the user from the team assignments. 
 * A user can be linked to various teams and alerts can be assigned to a team. Think of the teams as being queues. 
 * This function gets the next alert from the team queues and assigns it to the user.
 * 
 * In order to avoid duplicate assignements, the user needs to get a lease/lock, before they can actually get the alert.
 * 
 * @param None 
 * @returns NextResponse containing a GetNextResponse. I will contain a code, optional message and optional redirectURL.
 * If the 
 */

export async function POST(_req: NextRequest) {

    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin); 

    // No need to get anything from the request
    let client;
    let transactionStarted = false;
    let leased_entity_id: string = "";
    let leased_entity_code: string = "";
    let leased_org_unit_code: string = "";
    let leased_entity_from_state_code: string = "";
    let leased_entity_to_state_code: string = "";
    let redirectUrl: string|null = null;
  
    // Get the Teams of the user
    try {
        // Get Team-id's of the user
        const teams_query = {
            name: origin + '/teams',
            text: query_team_text,
            values:[user.name]
        }
        const teamRes = await db.pool.query(teams_query);
        const teamIds = teamRes.rows.map(r => r.team_id);

        // If user has no teams, then no need to continue.
        if (teamIds.length === 0) {
          const response: GetNextResponse = {
            code: 1,
            message: 'User is not part of any team. Can not get next'
          }
          return NextResponse.json(response)
        }

        // Find next alert and get get A lease on the entity
        client = await db.pool.connect();     
        await client.query('BEGIN');
        transactionStarted = true;
        const query_get_lease = {
            name: origin + '/get_lease',
            text: query_get_lease_text,
            values:[user.name, teamIds]
        }
        const lease = await client.query(query_get_lease);

        // If we can not get a lease, no alerts are ready for get_next.
        if (lease.rows.length === 0) {
          const response: GetNextResponse = {
            'code' : 2,
            'message': 'No Selectable Team alerts'           
          }
          return NextResponse.json(response);
        };

        leased_entity_id = lease.rows[0].entity_id;
        leased_entity_code = lease.rows[0].entity_code;
        leased_org_unit_code = lease.rows[0].org_unit_code;
        leased_entity_from_state_code = lease.rows[0].from_state_code;
        leased_entity_to_state_code = lease.rows[0].to_state_code;
        // We're going to commit here when we have the lease, this will reduce the locking time in the query.
        await client.query('COMMIT');
    } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        console.error('Error getting lease', error);
        return ErrorCreators.db.queryFailed(origin, 'Getting Lease', error as Error);
    } finally {
        if (client) client.release();
    }

    // Get the workflow config (with caching)
    const workflowConfig = await workflowConfigCache.getWorkflowConfig(
      leased_entity_code, // entityCode
      leased_org_unit_code  // orgUnitCode
    );

    // Now find the action that is of type 'get' and had the correct from_state. The from state of the action 
    // should be the to_state of the current entity. 
    const action = workflowConfig.actions.find(a => a.from_state_code === leased_entity_to_state_code && a.trigger === 'get');
    if (!action) return ErrorCreators.workflow.noGetNextAction(origin, leased_entity_code, leased_entity_id, leased_org_unit_code, leased_entity_to_state_code)
    
    // Now call the workflow
    const systemFields = {
      userName: user.name,
      actionCode: action.code,
      entityCode: leased_entity_code,
      entityId: leased_entity_id,
      fromStateCode: '',
      toStateCode: '',
      entityData: {}
    };
    const ctx = createWorkflowContext({}, systemFields);

    transactionStarted = false;
    client = null;
    
    try {
        client = await db.pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;
        redirectUrl = await executeWorkflowAction(client, workflowConfig, ctx);
        await client.query('COMMIT');
        // Normal End. We have a lease. Called the workflow and hopefully reset the lease.
        const response: GetNextResponse = (redirectUrl) ? {
          code: 0,
          redirectUrl: redirectUrl
        } : { 
          code: 0
        };
        return NextResponse.json(response);
    } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        console.error('Error getting Calling workflow', error);
        return ErrorCreators.db.queryFailed(origin, 'Calling workflow', error as Error);
    } finally {
        if (client) client.release();
    }
}