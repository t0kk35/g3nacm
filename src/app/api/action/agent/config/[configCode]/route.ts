'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { authorizedFetch } from "@/lib/org-filtering";
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';
import { requirePermissions } from '@/lib/permissions/check';
import { AuditData } from "@/lib/audit/types";
import { createAuditEntry } from "@/lib/audit/audit-log";
import { AgentConfigAdmin } from "@/app/api/data/agent/types";

type Props = { params: Promise<{ configCode: string }> }

const origin = 'api/action/agent/config/[configCode]'

const query_update_agent = `
UPDATE agent SET
  agent_type = $2,
  model_code = $3,
  name = $4,
  description = $5,
  system_prompt = $6,
  max_steps = $7,
  output_schema = $8,
  updated_timestamp = now()
WHERE code = $1
`

const query_delete_agent = `DELETE FROM agent WHERE code = $1`

const query_delete_agent_tool_link = `DELETE FROM agent_tool_link WHERE agent_code = $1`

// Update of an agent
export async function PUT(request: NextRequest, { params }: Props) {

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.agent.config']);
    if (permissionCheck) return permissionCheck;

    const configCode = (await params).configCode;
    if (!configCode) return ErrorCreators.param.urlMissing(origin, 'configCode');

    // Get config to update and validate
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

    // Get before state for audit
    let beforeData:AgentConfigAdmin;
    try {
        beforeData = await getBeforeData(configCode)
    } catch(error) {
        return ErrorCreators.agent.notFound(origin, configCode)
    }    

    // Set up a connection and transactions
    let client;
    let transactionStarted = false;

    try {     
        client = await db.pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;

        // Delete all the tool links.
        await client.query(query_delete_agent_tool_link, [configCode]);

        // Re-insert the tools links
        if (config.tools && config.tools.length > 0) {
            const tool_query = `
                INSERT INTO agent_tool_link(agent_code, tool_code)
                VALUES ${config.tools.map((_, i) => `($1, $${i+2})`).join(',')}
            `
            const params = [config.code, ...config.tools];
            await client.query(tool_query, params);
        }        

        // Update agent table
        await client.query(query_update_agent, [
            config.code,
            config.agent_type,
            config.model_config_code,
            config.name,
            config.description,
            config.system_prompt,
            config.max_steps,
            config.output_schema 
        ])
        // Audit our changes
        const auditData: AuditData = {
            category: 'agent',
            action: 'update-agent-config',
            target_type: 'agent-model-config',
            target_id_string: configCode,
            before_data: {
                code: beforeData.code,
                agent_type: beforeData.agent_type,
                model_config_code: beforeData.model_config_code,
                name: beforeData.name,
                description: beforeData.description,
                system_prompt: beforeData.system_prompt,
                max_steps: beforeData.max_steps,
                output_schema: beforeData.output_schema,
                tools: beforeData.tools
            },
            after_data: {
                code: config.code,
                agent_type: config.agent_type,
                model_config_code: config.model_config_code,
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
        console.error('Error updating agent config', error);
        return ErrorCreators.db.queryFailed(origin, 'update agent config', error as Error);
    } finally {
        if (client) client.release();
    }

}

// Delete of an agent config code.
export async function DELETE(_request: NextRequest, { params }: Props) { 

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.agent.config']);
    if (permissionCheck) return permissionCheck;

    const configCode = (await params).configCode;
    if (!configCode) return ErrorCreators.param.urlMissing(origin, 'configCode');

    // Get before state for audit
    let beforeData:AgentConfigAdmin;
    try {
        beforeData = await getBeforeData(configCode)
    } catch(error) {
        return ErrorCreators.agent.notFound(origin, configCode)
    }

    // Set up a connection and transactions
    let client;
    let transactionStarted = false;

    try {     
        client = await db.pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;

        // Delete all the tool links.
        await client.query(query_delete_agent_tool_link, [configCode]);
        // Delete the agent
        await client.query(query_delete_agent, [configCode])

        // Audit our changes
        const auditData: AuditData = {
            category: 'agent',
            action: 'delete-agent-config',
            target_type: 'agent-model-config',
            target_id_string: configCode,
            before_data: {
                code: beforeData.code,
                agent_type: beforeData.agent_type,
                model_config_code: beforeData.model_config_code,
                name: beforeData.name,
                description: beforeData.description,
                system_prompt: beforeData.system_prompt,
                max_steps: beforeData.max_steps,
                output_schema: beforeData.output_schema,
                tools: beforeData.tools
            }
        }
        await createAuditEntry(client, user.name, auditData );
        // And Commit at the end.
        await client.query('COMMIT');
        return NextResponse.json({ 'success': true });        

    } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        console.error('Error deleting agent config', error);
        return ErrorCreators.db.queryFailed(origin, 'delete agent config', error as Error);
    } finally {
        if (client) client.release();
    }
}

async function getBeforeData(configCode: string) {
    const before = await authorizedFetch(`${process.env.DATA_URL}/api/data/agent/config?code=${configCode}`)
        .then(res => { if (!res.ok) throw new Error('Error fetching agent config'); else return res.json() })
        .then(j => j as AgentConfigAdmin[])
    if (before.length < 1) throw new Error ('Got empty agent config')
    return before[0];    
}