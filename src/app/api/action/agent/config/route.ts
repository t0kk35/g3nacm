'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';
import { requirePermissions } from '@/lib/permissions/check';
import { AgentConfigAdmin } from "@/app/api/data/agent/types";
import { AuditData } from "@/lib/audit/types";
import { createAuditEntry } from "@/lib/audit/audit-log";

const origin = 'api/action/agent/config'

const query_agent = `
INSERT INTO agent 
(
  code,
  agent_type,
  model_code,
  name,
  description,
  system_prompt,
  max_steps,
  output_schema
) 
VALUES 
  ($1, $2, $3, $4, $5, $6, $7, $8)
`

// Creation of an agent config
export async function POST(request: NextRequest) { 

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.agent.config']);
    if (permissionCheck) return permissionCheck;    
    
    // Get role to create and validate
    const config: AgentConfigAdmin = await request.json();    

    const req_params = [
        { name: 'config.code', field: config.code },
        { name: 'config.name', field: config.name },
        { name: 'config.agentType', field: config.agent_type}, 
        { name: 'config.description', field: config.description },
        { name: 'config.modelConfigCode', field: config.model_config_code}
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

        // Try insert the agent.
        await client.query(query_agent, [
            config.code,
            config.agent_type,
            config.model_config_code,
            config.name,
            config.description,
            config.system_prompt,
            config.max_steps,
            config.output_schema
        ]);

        // Try insert the tool links
        if (config.tools && config.tools.length > 0) {
            const tool_query = `
                INSERT INTO agent_tool_link(agent_code, tool_code)
                VALUES ${config.tools.map((_, i) => `($1, $${i+2})`).join(',')}
            `
            const params = [config.code, ...config.tools];
            await client.query(tool_query, params);
        }

        const auditData: AuditData = {
            category: 'agent',
            action: 'create-agent-config',
            target_type: 'agent',
            target_id_string: config.code,
            after_data: {
                code: config.code,
                agent_type: config.agent_type,
                model_code: config.model_config_code,
                name: config.name,
                description: config.description,
                system_prompt: config.system_prompt,
                max_steps: config.max_steps,
                output_schema: config.output_schema,
                tools: config.tools
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