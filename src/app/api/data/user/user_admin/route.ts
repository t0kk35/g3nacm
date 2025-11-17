'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { NextRequest } from "next/server"
import { UserAdmin } from "../user";
import { ErrorCreators } from "@/lib/api-error-handling";
import { requirePermissions } from "@/lib/permissions/check";

const origin = 'api/data/user/user_admin'

const query_text = `
SELECT 
    id,
    name,
    first_name,
    last_name,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT url.role_id), NULL) AS "role_ids",
    COALESCE(
        jsonb_agg(DISTINCT
            jsonb_build_object(
                'team_id', utl.team_id, 
                'team_rank', utl.rank
            )
        ) 
        FILTER (WHERE utl.team_id IS NOT NULL), 
        '[]'::jsonb) AS "team_infos",
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT ouua.org_unit_id), NULL) AS "org_ids"
FROM users u
LEFT JOIN user_role_link url ON u.id = url.user_id
LEFT JOIN user_team_link utl ON u.id = utl.user_id
LEFT JOIN org_unit_user_access ouua ON u.id = ouua.user_id
WHERE ($1::integer IS NULL OR u.id = $1)
AND (u.deleted = FALSE OR ($2::boolean AND u.deleted = TRUE))
GROUP BY id, name, first_name, last_name
`

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";
    
    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.user']);
    if (permissionCheck) return permissionCheck;

    // See if we have optional parameters
    const searchParams = request.nextUrl.searchParams
    const user_id = searchParams.get("user_id")
    const include_del_string = searchParams.get("include_deleted");
    const include_deleted = 
        (
            include_del_string?.toLocaleLowerCase() === 'true' || 
            include_del_string?.toLocaleLowerCase() === 'y'
        ) ? true : false;

    if (!useMockData) {
        try {
            const users = await db.pool.query(query_text, [user_id, include_deleted]);
            const res:UserAdmin[] = users.rows;
            return Response.json(res);        
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get user_admin', error as Error);
        }

    }
}