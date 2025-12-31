'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { authorizedFetch } from "@/lib/org-filtering";
import { NextRequest, NextResponse } from 'next/server';
import { AgentModelConfig } from "@/lib/cache/agent-model-config-cache";
import { ErrorCreators } from '@/lib/api-error-handling';
import { requirePermissions } from '@/lib/permissions/check';
import { AuditData } from "@/lib/audit/types";
import { createAuditEntry } from "@/lib/audit/audit-log";

type Props = { params: Promise<{ configCode: string }> }

const origin = 'api/action/agent/model_config/[configCode]'

const query_agent_model_update = `
UPDATE agent_model SET
  name = $2,
  provider = $3,
  model = $4,
  temperature = $5,
  max_tokens = $6,
  top_p = $7,
  api_key = $8,
  headers = $9,
  provider_options = $10,
  updated_timestamp = now()
WHERE code = $1
`

const query_agent_model_delete = `DELETE FROM agent_model WHERE code = $1`

// Update of an agent model config
export async function PUT(request: NextRequest, { params }: Props) {

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.agent.model.config']);
    if (permissionCheck) return permissionCheck;

    const configCode = (await params).configCode;
    if (!configCode) return ErrorCreators.param.urlMissing(origin, 'configCode');

    // Get config to update and validate
    const config: AgentModelConfig = await request.json();    

    const req_params = [
        { name: 'config.name', field: config.name }, 
        { name: 'config.provider', field: config.provider },
        { name: 'config.model', field: config.model}
    ]
    for (var param of req_params) {
        if (!param.field) return ErrorCreators.param.bodyMissing(origin, param.name);
    }

    // Get before state for audit
    let beforeData:AgentModelConfig;
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
        
        await client.query(query_agent_model_update, [
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
            action: 'update-agent-model-config',
            target_type: 'agent-model-config',
            target_id_string: config.code,
            before_data: {
                code: beforeData.code,
                name: beforeData.name,
                provider: beforeData.provider,
                model: beforeData.model,
                temperature: beforeData.temperature,
                max_tokens: beforeData.max_tokens,
                top_p: beforeData.top_p,
                api_key: beforeData.api_key,
                headers: beforeData.headers,
                provider_options: beforeData.provider_options
            },
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
        console.error('Error updating agent model config', error);
        return ErrorCreators.db.queryFailed(origin, 'update agent model config', error as Error);
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
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.agent.model.config']);
    if (permissionCheck) return permissionCheck;

    const configCode = (await params).configCode;
    if (!configCode) return ErrorCreators.param.urlMissing(origin, 'configCode');

    // Get before state for audit
    let beforeData:AgentModelConfig;
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

        await client.query(query_agent_model_delete, [configCode]);

        const auditData: AuditData = {
            category: 'agent',
            action: 'delete-agent-model-config',
            target_type: 'agent-model-config',
            target_id_string: configCode,
            before_data: {
                code: beforeData.code,
                name: beforeData.name,
                provider: beforeData.provider,
                model: beforeData.model,
                temperature: beforeData.temperature,
                max_tokens: beforeData.max_tokens,
                top_p: beforeData.top_p,
                api_key: beforeData.api_key,
                headers: beforeData.headers,
                provider_options: beforeData.provider_options
            }
        }
        await createAuditEntry(client, user.name, auditData );
        
        // And Commit at the end.
        await client.query('COMMIT');
        return NextResponse.json({ 'success': true });        
    } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        console.error('Error deleting agent model config', error);
        return ErrorCreators.db.queryFailed(origin, 'delete agent model config', error as Error);
    } finally {
        if (client) client.release();
    }
}

async function getBeforeData(configCode: string) {
    const before = await authorizedFetch(`${process.env.DATA_URL}/api/data/agent/model_config?code=${configCode}`)
        .then(res => { if (!res.ok) throw new Error('Error fetching model config'); else return res.json() })
        .then(j => j as AgentModelConfig[])
    if (before.length < 1) throw new Error ('Got empty model config')
    return before[0];    
}