'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { NextRequest } from "next/server"
import { UserTeam } from "../user";
import { ErrorCreators } from "@/lib/api-error-handling";
import { requirePermissions } from "@/lib/permissions/check";

// I'm going to have to change this later. The returned teams will have to be restricted to maybe an org?
// Second change ... Need to figure out if I ame this an admin access, it might be needed for workflows.

const origin = 'api/data/user/team'

const query_text = `
SELECT 
    id AS "id",
    name AS "name",
    description AS "description",
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT utl.user_id), NULL) AS "user_ids"
FROM user_team ut
LEFT JOIN user_team_link utl ON ut.id = utl.team_id
WHERE $1::integer IS NULL OR ut.id = $1
GROUP BY ut.id, ut.name, ut.description
`

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";    
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    // See if we have optional parameters
    const searchParams = request.nextUrl.searchParams
    const teamId = searchParams.get("team_id");

    if (!useMockData) {
        try {
            const user_teams = await db.pool.query(query_text, [teamId]);
            const res:UserTeam[] = user_teams.rows;
            return Response.json(res);
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get user_team', error as Error);
        }
    }
};