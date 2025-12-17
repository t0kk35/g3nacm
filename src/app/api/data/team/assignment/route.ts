'use server'

import { auth } from '@/auth';
import * as db from '@/db'
import { NextRequest, NextResponse } from 'next/server';
import { TeamAssignment } from '../types';
import { ErrorCreators } from '@/lib/api-error-handling';

const origin = 'api/data/team/assignment/'

const query_text = `
SELECT
  ut.id,
  ut.name,
  COALESCE(SUM(1), 0) AS total, 
  COALESCE(SUM(CASE WHEN wes.priority = 'High' THEN 1 END), 0) AS high_priority,
  COALESCE(SUM(CASE WHEN wes.priority = 'Medium' THEN 1 END), 0) AS medium_priority,
  COALESCE(SUM(CASE WHEN wes.priority = 'Low' THEN 1 END), 0) AS low_priority
FROM user_team ut
JOIN user_team_link utl ON ut.id = utl.team_id
JOIN users u on utl.user_id = u.id
JOIN workflow_entity_state wes on wes.assigned_to_team_id = ut.id
WHERE u.name = $1
GROUP BY ut.id, ut.name
`

export async function GET(_request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";
        
    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    if (!useMockData) {
        const query = {
            name: origin,
            text: query_text,
            values:[user.name]
        };
        try {
            const team_stats = await db.pool.query(query);
            const res:TeamAssignment[] = team_stats.rows;
            return NextResponse.json(res);
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get team assigments', error as Error);
        }        
    }
    

}