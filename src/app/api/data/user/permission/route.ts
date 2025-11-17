'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { NextRequest } from "next/server"
import { UserPermission } from "../user";
import { ErrorCreators } from "@/lib/api-error-handling";
import { requirePermissions } from "@/lib/permissions/check";

const origin = 'api/data/user/permission';

const query_text = `
SELECT 
    id AS "id",
    permission_group AS "group",
    permission AS "permission",
    description AS "description"
FROM user_permission up
`

export async function GET(_request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";    
    
    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.role']);
    if (permissionCheck) return permissionCheck;

    if (!useMockData) {
        try {
            const user_permissions = await db.pool.query(query_text);
            const res:UserPermission[] = user_permissions.rows
            return Response.json(res);
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get user_permissions', error as Error);
        }
    }
};
