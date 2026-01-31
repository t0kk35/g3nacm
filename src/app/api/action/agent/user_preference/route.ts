'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { authorizedFetch } from "@/lib/org-filtering";
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';
import { requirePermissions } from '@/lib/permissions/check';
import { AgentUserPreference } from "@/app/api/data/agent/types";
import { AuditData } from "@/lib/audit/types";
import { createAuditEntry } from "@/lib/audit/audit-log";

const origin = 'api/action/agent/user_preference'

const query_insert_agent_preference = `
INSERT INTO agent_user_preference
(
  user_id,
  communication_style,
  explantion_depth,
  risk_perspective,
  output_format,
  use_visual,
  planning_mode,
  preferred_language
) VALUES
  ((SELECT id FROM users WHERE name=$1), $2, $3, $4, $5, $6, $7, $8)
`

const query_update_agent_preference = `
UPDATE agent_user_preference SET
  communication_style = $2,
  explanation_depth = $3,
  risk_perspective = $4,
  output_format = $5,
  use_visual = $6,
  planning_mode = $7,
  show_confidence_scores = $8,
  highlight_assumptions = $9,
  preferred_language = $10
WHERE user_id = (SELECT id from users WHERE name = $1)
`

// Creation of an agent model config
export async function POST(request: NextRequest) {

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['user.agent.preference']);
    if (permissionCheck) return permissionCheck;

    // Get role to create and validate
    const preference: AgentUserPreference = await request.json();    
    if (checkRequest(preference)) return checkRequest(preference);

    // You can only create a preference for your own user.
    if (user.name !== preference.user_name) return ErrorCreators.perm.onlyOwnUser(origin, user.name, preference.user_name);

    // Set up a connection and transactions
    let client;
    let transactionStarted = false;
    
    try {     
        client = await db.pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;

        await client.query(query_insert_agent_preference, [
            preference.user_name,
            preference.communication_style,
            preference.explantion_depth,
            preference.risk_perspective,
            preference.output_format,
            preference.use_visual,
            preference.planning_mode,
            preference.preferred_language
        ]);

        const auditData: AuditData = {
            category: 'agent',
            action: 'create-agent-user-preference',
            target_type: 'agent-user-preference',
            target_id_string: user.name,
            after_data: {
                user_name: preference.user_name,
                communication_style: preference.communication_style,
                explantion_depth: preference.explantion_depth,
                risk_perspective: preference.risk_perspective,
                output_format: preference.output_format,
                use_visual: preference.use_visual,
                planning_mode: preference.planning_mode,
                preferred_language: preference.preferred_language
            }
        }
        await createAuditEntry(client, user.name, auditData );
        // And Commit at the end.
        await client.query('COMMIT');
        return NextResponse.json({ 'success': true });        
    } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        console.error('Error creating preference', error);
        return ErrorCreators.db.queryFailed(origin, 'Create agent user Preference', error as Error);
    } finally {
        if (client) client.release();
    }
}

// Update of an agent model config
export async function PUT(request: NextRequest) {

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.agent.model.config']);
    if (permissionCheck) return permissionCheck;

    // Get role to create and validate
    const preference: AgentUserPreference = await request.json();    
    if (checkRequest(preference)) return checkRequest(preference);

    // You can only create a preference for your own user.
    if (user.name !== preference.user_name) return ErrorCreators.perm.onlyOwnUser(origin, user.name, preference.user_name);

    // Set up a connection and transactions
    let client;
    let transactionStarted = false;

    try {     
        client = await db.pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;
        
        // First get current state for the audit.
        const before = await authorizedFetch(`${process.env.DATA_URL}/api/data/agent/user_preference`)
            .then(res => { if (!res.ok) throw new Error('Error fetching agent user preference'); else return res.json() })
            .then(j => j as AgentUserPreference)
        if (!before) throw new Error ('Got empty agent user preference') 

        // Update current data
        await client.query(query_update_agent_preference, [
            user.name,
            preference.communication_style,
            preference.explantion_depth,
            preference.risk_perspective,
            preference.output_format,
            preference.use_visual,
            preference.planning_mode,
            false,
            false,
            preference.preferred_language
        ]);

        const auditData: AuditData = {
            category: 'agent',
            action: 'update-agent-model-config',
            target_type: 'agent-model-config',
            target_id_string: user.name,
            before_data: {
                user_name: before.user_name,
                communication_style: before.communication_style,
                explantion_depth: before.explantion_depth,
                risk_perspective: before.risk_perspective,
                output_format: before.output_format,
                use_visual: before.use_visual,
                planning_mode: before.planning_mode,
                preferred_language: before.preferred_language
            },
            after_data: {
                user_name: preference.user_name,
                communication_style: preference.communication_style,
                explantion_depth: preference.explantion_depth,
                risk_perspective: preference.risk_perspective,
                output_format: preference.output_format,
                use_visual: preference.use_visual,
                planning_mode: preference.planning_mode,
                preferred_language: preference.preferred_language
            }
        }
        await createAuditEntry(client, user.name, auditData );
        // And Commit at the end.
        await client.query('COMMIT');
        return NextResponse.json({ 'success': true });   
    } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        console.error('Error updating preference', error);
        return ErrorCreators.db.queryFailed(origin, 'Update agent user Preference', error as Error);
    } finally {
        if (client) client.release();
    }

}

function checkRequest(preference: AgentUserPreference) {
    const req_params = [
        { name: 'preference.user_name', field: preference.user_name },
        { name: 'preference.communication_style', field: preference.communication_style }, 
        { name: 'preference.explantion_depth', field: preference.explantion_depth },
        { name: 'preference.risk_perspective', field: preference.risk_perspective},
        { name: 'preference.output_format', field: preference.output_format },
        { name: 'preference.use_visual', field: preference.use_visual},
        { name: 'preference.planning_mode', field: preference.planning_mode},
        { name: 'preference.preferred_language.', field: preference.preferred_language}
    ]
    for (var param of req_params) {
        if (!param.field) return ErrorCreators.param.bodyMissing(origin, param.name);
    }
}