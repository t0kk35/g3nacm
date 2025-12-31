'use server'

import { auth } from '@/auth';
import * as db from "@/db"
import { requirePermissions } from '@/lib/permissions/check';
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';
import { removeNullsAndEmptyObjects } from '@/lib/json';
import { AgentConfigAdmin } from '../types';

const origin = 'api/data/agent/config'

const query_text = `
SELECT 
  a.code,
  a.agent_type AS "type",
  a.model_code AS "model_config_code",   
  a.name,
  a.description,
  a.system_prompt,
  a.max_steps,
  a.output_schema,
  ARRAY_REMOVE(ARRAY_AGG(DISTINCT at.code), NULL) AS "tools"
FROM agent a 
LEFT JOIN agent_tool_link atl ON atl.agent_code = a.code
LEFT JOIN agent_tool at ON atl.tool_code = at.code
WHERE a.code = $1::text IS NULL or a.code = $1
GROUP BY a.code, a.agent_type, a.name, a.description, a.system_prompt, a.max_steps, a.output_schema
`

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";
    
    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.agent.config']);
    if (permissionCheck) return permissionCheck;
 
    // See if we have optional parameters
    const searchParams = request.nextUrl.searchParams
    const configCode = searchParams.get("code");

    if (!useMockData) {
        try {
           // const config = await getCachedAgentConfig(configCode)
            const modelConfig = await db.pool.query(query_text, [configCode]);
            const res:AgentConfigAdmin[] = modelConfig.rows;
            return NextResponse.json(res.map(c => removeNullsAndEmptyObjects(c)));           
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get Agent Config', error as Error);
        }
    }
}