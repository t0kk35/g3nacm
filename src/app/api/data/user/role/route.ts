'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { NextRequest, NextResponse } from "next/server"
import { UserRole } from "../user";
import { ErrorCreators } from "@/lib/api-error-handling";
import { requirePermissions } from "@/lib/permissions/check";

const origin = 'api/data/user/role'

const query_text = `
SELECT 
    ur.id AS "id",
    ur.name AS "name",
    ur.description AS "description",
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT urpl.permission_id), NULL) AS "permission_ids",
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT url.user_id), NULL) AS "user_ids"
FROM user_role ur
LEFT JOIN user_role_permission_link urpl ON ur.id = urpl.role_id
LEFT JOIN user_role_link url ON ur.id = url.role_id  
WHERE $1::integer IS NULL OR ur.id = $1 
GROUP BY ur.id, ur.name
`

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";
    
    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.role']);
    if (permissionCheck) return permissionCheck;
    
    // See if we have optional parameters
    const searchParams = request.nextUrl.searchParams
    const roleId = searchParams.get("role_id");

    if (!useMockData) {
        try {
            const roles = await db.pool.query(query_text, [roleId]);
            const res:UserRole[] = roles.rows;
            return NextResponse.json(res);
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get user_role', error as Error);
        }

    }
}