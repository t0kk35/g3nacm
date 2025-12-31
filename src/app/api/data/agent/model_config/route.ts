'use server'

import { auth } from '@/auth';
import * as db from "@/db"
import { requirePermissions } from '@/lib/permissions/check';
import { NextRequest, NextResponse } from 'next/server';
import { AgentModelConfigAdmin } from '../types';
import { ErrorCreators } from '@/lib/api-error-handling';
import { removeNullsAndEmptyObjects } from '@/lib/json';

const origin = 'api/data/agent/model_config'

const query_text = `
SELECT 
  am.code,
  am.name,
  am.provider,
  am.model,
  am.temperature,
  am.max_tokens,
  am.top_p,
  am.api_key,
  am.headers,
  am.provider_options,
  ARRAY_REMOVE(ARRAY_AGG(DISTINCT a.code), NULL) AS "agent_codes"
FROM agent_model am
LEFT JOIN agent a ON a.model_code = am.code
WHERE $1::text IS NULL or am.code = $1
GROUP BY am.code, am.name, am.provider, am.model, am.temperature, am.max_tokens, am.top_p, am.headers, am.provider_options
`

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";
    
    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.agent.model.config']);
    if (permissionCheck) return permissionCheck;
 
    // See if we have optional parameters
    const searchParams = request.nextUrl.searchParams
    const modelConfigCode = searchParams.get("code");

    if (!useMockData) {
        try {
            const modelConfig = await db.pool.query(query_text, [modelConfigCode]);
            const res:AgentModelConfigAdmin[] = modelConfig.rows;
            return NextResponse.json(res.map(c => removeNullsAndEmptyObjects(c)));
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get Agent Model Config', error as Error);
        }
    }
}