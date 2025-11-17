'use server'

import { auth } from "@/auth";
import * as db from '@/db'
import { NextRequest, NextResponse } from "next/server";
import { ErrorCreators } from "@/lib/api-error-handling";

const origin = 'api/data/org_unit/access'

export type OrgUnitUserAccess = {
    user_id: number;
    org_unit_id: number;
    path: string;
}

const query_text = `
SELECT 
    u.id as "user_id",
    ou.id as "org_unit_id",
    ou.path
FROM users u
JOIN org_unit_user_access oua on oua.user_id = u.id
JOIN org_unit ou on ou.id = oua.org_unit_id
WHERE u.name = $1
`

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";
    
    // Check User
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    
    // Get the URL params. Throw errors if we can't find the mandatory ones.
    const searchParams = request.nextUrl.searchParams
    const user_name = searchParams.get("user_name")
    if (!user_name) return ErrorCreators.param.urlMissing(origin, "user_name");
    if (user_name !== user.name) return ErrorCreators.perm.onlyOwnUser(origin, user.name, user_name);
    
    if (!useMockData) {
        const query = {
            name: origin,
            text: query_text,
            values:[user_name]
        };
        const org_access = await db.pool.query(query);
        const res:OrgUnitUserAccess[] = org_access.rows;
        return NextResponse.json(res);
    }
}