'use server'

import { auth } from '@/auth';
import * as db from "@/db"
import { requirePermissions } from '@/lib/permissions/check';
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';
import { AgentUserPreference } from '../types';

const origin = 'api/data/agent/user_preference'

const query_text = `
SELECT 
  u.id as "user_id",
  u.name as "user_name",
  aup.communication_style,
  aup.explantion_depth,
  aup.risk_perspective,
  aup.output_format,
  aup.use_visual,
  aup.planning_mode,
  aup.show_confidence_scores,
  aup.highlight_assumptions,
  aup.preferred_language
FROM agent_user_preference aup
JOIN users u on aup.user_id = u.id
WHERE u.name = $1
`

export async function GET(_request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";
    
    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['user.agent.preference']);
    if (permissionCheck) return permissionCheck;

    if (!useMockData) {
        try {
            // const config = await getCachedAgentConfig(configCode)
            const userPreference = await db.pool.query(query_text, [user.name]);
            if (userPreference.rows.length === 0) return (NextResponse.json(null))
            const res:AgentUserPreference = userPreference.rows[0];
            return NextResponse.json(res);           
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get Agent User Preference', error as Error);
        }
    }
}