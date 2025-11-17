'use server'

import { auth } from '@/auth';
import * as db from '@/db'
import { NextRequest, NextResponse } from 'next/server';
import { createWorkflowContext, executeWorkflowAction } from '@/lib/workflow/workflow-engine';
import { ErrorCreators } from '@/lib/api-error-handling';
import { DevBundlerService } from 'next/dist/server/lib/dev-bundler-service';

const origin = 'api/action/get_next'

const query_team_text = `
SELECT id 
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
RETURNING wes.entity_id, wes.entity_code
`

export async function POST(req: NextRequest) {

    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin); 

    // No need to get anything from the request
    
    let client;
    let transactionStarted = false;
    let leased_entity_id: string = "";
    let leased_entity_code: string = "";

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

        // Get A lease on the entity
        client = await db.pool.connect();     
        await client.query('BEGIN');
        transactionStarted = true;
        const query_get_lease = {
            name: origin + '/get_lease',
            text: query_get_lease_text,
            values:[user.name, teamIds]
        }
        const lease = await client.query(query_get_lease);
        if (lease.rows.length === 0) return NextResponse.json({
            'code' : 0,
            'message': 'No entity leased' 
        });
        leased_entity_id = lease.rows[0].entity_id;
        leased_entity_code = lease.rows[0].entity_code;

        // We're going to commit here when we have the lease, this will reduce the locking time in the query.
        await client.query('BEGIN');

    } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        console.error('Error getting lease', error);
        return ErrorCreators.db.queryFailed(origin, 'Getting Lease', error as Error);
    } finally {
        if (client) client.release();
    }

    transactionStarted = false;
    // Now call the workflow
    try {
        // Need to add org-unit to entity_state
        client = await db.pool.connect();     
        await client.query('BEGIN');
        transactionStarted = true;
    } catch (error) {

    }

}