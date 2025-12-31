'use server'

import { auth } from '@/auth';
import * as db from "@/db"
import { requirePermissions } from '@/lib/permissions/check';
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';
import { AgentToolAdmin } from '../types';

const origin = 'api/data/agent/tool'

const query_text = `
SELECT 
  code,
  agent_group,
  description
FROM agent_tool
`

export async function GET(_request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";
    
    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.agent.config']);
    if (permissionCheck) return permissionCheck;

    if (!useMockData) {
        try {
            const tool = await db.pool.query(query_text, []);
            const res:AgentToolAdmin[] = tool.rows;
            return NextResponse.json(res);
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get Agent Tools', error as Error);
        }
    }
}