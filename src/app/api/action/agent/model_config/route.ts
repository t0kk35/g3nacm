'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';
import { requirePermissions } from '@/lib/permissions/check';
import { AgentModelConfig } from "@/lib/cache/agent-model-config-cache";
import { AuditData } from "@/lib/audit/types";
import { createAuditEntry } from "@/lib/audit/audit-log";

const origin = 'api/action/agent/model_config'

const query_agent_model = `
INSERT INTO agent_model 
( 
  code,
  name,
  provider,
  model,
  temperature,
  max_tokens,
  top_p,
  api_key,
  headers,
  provider_options
) 
VALUES 
  ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
`;

// Creation of an agent model config
export async function POST(request: NextRequest) {

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.agent.model.config']);
    if (permissionCheck) return permissionCheck;
    
    // Get role to create and validate
    const config: AgentModelConfig = await request.json();    

    const req_params = [
        { name: 'config.code', field: config.code },
        { name: 'config.name', field: config.name }, 
        { name: 'config.provider', field: config.provider },
        { name: 'config.model', field: config.model}
    ]
    for (var param of req_params) {
        if (!param.field) return ErrorCreators.param.bodyMissing(origin, param.name);
    }

    // Set up a connection and transactions
    let client;
    let transactionStarted = false;
    
    try {     
        client = await db.pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;

        await client.query(query_agent_model, [
            config.code,
            config.name,
            config.provider,
            config.model,
            config.temperature,
            config.max_tokens,
            config.top_p,
            config.api_key,
            config.headers,
            config.provider_options 
        ]);

        const auditData: AuditData = {
            category: 'agent',
            action: 'create-agent-model-config',
            target_type: 'agent-model-config',
            target_id_string: config.code,
            after_data: {
                code: config.code,
                name: config.name,
                provider: config.provider,
                model: config.model,
                temperature: config.temperature,
                max_tokens: config.max_tokens,
                top_p: config.top_p,
                api_key: config.api_key,
                headers: config.headers,
                provider_options: config.provider_options
            }
        }
        await createAuditEntry(client, user.name, auditData );
        // And Commit at the end.
        await client.query('COMMIT');
        return NextResponse.json({ 'success': true });
    } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        console.error('Error creating user', error);
        return ErrorCreators.db.queryFailed(origin, 'create agent model config', error as Error);
    } finally {
        if (client) client.release();
    }
}