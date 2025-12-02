'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { NextRequest } from "next/server"
import { User } from "../user";
import { ErrorCreators } from "@/lib/api-error-handling";
import { requirePermissions } from "@/lib/permissions/check";

const origin = 'api/data/user/user';

const query_text = `
SELECT 
    id,
    name,
    first_name AS "firstName",
    last_name AS "lastName",
    deleted AS "deleted"
FROM users u
WHERE (
    $1::integer[] IS NOT NULL AND u.id = ANY($1::integer[]) 
    OR 
    $2::text IS NOT NULL AND (name ILIKE $2 OR (first_name || ' ' || last_name ILIKE $2))
    OR 
    ($1 IS NULL AND $2 IS NULL)
)
`

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";    
    
    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['data.list.users.non-admin']);
    if (permissionCheck) return permissionCheck;

    // See if we have optional parameters
    const searchParams = request.nextUrl.searchParams
    const user_ids = searchParams.getAll('user_ids')
    const searchQuery = searchParams.get('search')
    const searchQueryPattern = searchQuery ? '%' + searchQuery + '%' : searchQuery
    // Can be empty or an array if multiple user ids were fed.
    const user_ids_number = 
        user_ids.length === 0 ? null : 
        Array.isArray(user_ids) ? 
        user_ids.map(n=> parseInt(n)) : 
        [parseInt(user_ids)]
    
    if (!useMockData) {
        try {
            const users = await db.pool.query(query_text, [user_ids_number, searchQueryPattern]);
            const res:User[] = users.rows
            return Response.json(res);
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get user', error as Error);
        }
    }
};