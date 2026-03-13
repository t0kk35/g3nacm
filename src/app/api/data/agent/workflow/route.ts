'use server'

import { auth } from '@/auth';
import * as db from "@/db"
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';

const origin = 'api/data/agent/workflow'

const query_text = `
SELECT agent_code 
FROM agent_workflow_state_link
WHERE workflow_state_code = $1 
`

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";
    
    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    // See if we have optional parameters
    const searchParams = request.nextUrl.searchParams
    const workflowStateCode = searchParams.get("workflow_state_code");
    if (!workflowStateCode) return ErrorCreators.param.urlMissing(origin, "workflow_state_code");

    try {
        const query = {
            name: origin,
            text: query_text,
            values:[workflowStateCode]
        };
        const workflowState = await db.pool.query(query);
        if (workflowState.rows.length === 0) return ErrorCreators.agent.agentWorkflowNotFound(origin, workflowStateCode);
        const res = workflowState.rows[0];
        return NextResponse.json(res);           
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Agent code for workflow', error as Error);
        }
}