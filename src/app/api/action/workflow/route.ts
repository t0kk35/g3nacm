'use server'

import { auth } from '@/auth';
import * as db from '@/db'
import { NextRequest, NextResponse } from 'next/server';
import { createWorkflowContext, executeWorkflowAction } from '@/lib/workflow/workflow-engine';
import { getCachedWorkflowConfig } from "@/lib/cache/workflow-cache";
import { WorkflowConfig } from '../../data/workflow/types';
import { PerformWorkflowAction } from './workflow';
import { PoolClient } from 'pg';
import { ErrorCreators } from '@/lib/api-error-handling';

const origin = 'api/action/workflow'

async function parseRequestBody(req: NextRequest): Promise<{ actions: PerformWorkflowAction[], files: Map<string, File> }> {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        // Handle JSON requests (backward compatibility)
        const actions = await req.json();
        return { actions, files: new Map() };
    } else if (contentType.includes('multipart/form-data')) {
        // Handle FormData requests with files
        const formData = await req.formData();
        const actionsData = formData.get('actions') as string;
        
        if (!actionsData) {
            throw new Error('Missing actions data in FormData');
        }
        
        const actions = JSON.parse(actionsData);
        const files = new Map<string, File>();
        
        // Extract files from FormData
        for (const [key, value] of formData.entries()) {
            if (key !== 'actions' && value instanceof File) {
                files.set(key, value);
            }
        }
        
        return { actions, files };
    } else {
        throw new Error('Unsupported content type');
    }
}

export async function POST(req: NextRequest) {

    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin); 
    
    // Parse request body - handle both JSON and FormData. Form data is mainly if there is a file.
    const { actions, files } = await parseRequestBody(req);

    if (!Array.isArray(actions)) return ErrorCreators.param.typeInvalid(origin, 'actions', 'array', 'unknown'); 

    for (const a of actions) {
      const params = [
        {name: 'entityCode', field:a.entityCode},
        {name: 'entityId', field: a.entityId},
        {name: 'actionCode', field: a.actionCode},
        {name: 'userName', field: a.orgUnitCode},
        {name: 'entityData', field: a.entityData}
      ];
      for (const param of params) {
        if (!param.field) return ErrorCreators.param.bodyMissing(origin, param.name); 
      }    
    }

    const unique = [... new Set(actions.map((a)=> [a.entityCode, a.orgUnitCode]))]
    if (unique.length > 1) return ErrorCreators.workflow.notUnique(origin, actions[0].actionCode, actions[0].orgUnitCode)
    
    // Get the workflow config (with caching)
    const workflowConfig = await getCachedWorkflowConfig(
      unique[0][0], // entityCode
      unique[0][1]  // orgUnitCode
    );

    // Set up a connection and start main logic
    let client;
    let transactionStarted = false;
    let redirectUrls: string[] = [];

    try {
        client = await db.pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;
        redirectUrls = await executeActions(client, user.name, workflowConfig, actions, files);
        await client.query('COMMIT');
    } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        console.error('Error executing workflow actions', error);
        return ErrorCreators.db.queryFailed(origin, 'Executing Workflow', error as Error);
    } finally {
        if (client) client.release();
    }
    return NextResponse.json({ message: 'Workflow Action Performed', redirectUrls });
}

async function executeActions(client: PoolClient, userName: string, workflowConfig: WorkflowConfig, actions: PerformWorkflowAction[], files: Map<string, File>): Promise<string[]> {

    const redirectUrls: string[] = [];

    for (const a of actions) {
        const systemFields = {
            userName: userName,
            orgUnitCode: workflowConfig.org_unit_code,
            actionCode: a.actionCode,
            entityCode: a.entityCode,
            entityId: a.entityId,
            fromStateCode: '',
            toStateCode: '',
            entityData: a.entityData || {}
        };

        // Merge files into the data context using their field names
        const actionData = { ...(a.data || {}) };
        for (const [fieldName, file] of files.entries()) {
            actionData[fieldName] = file;
        }

        // Create a workflow context to store data needed by the functions
        const ctx = createWorkflowContext(actionData, systemFields);
        // Execute the action and collect redirect URL
        const redirectUrl = await executeWorkflowAction(client, workflowConfig, ctx);
        if (redirectUrl) {
            redirectUrls.push(redirectUrl);
        }
    }

    return redirectUrls;
}