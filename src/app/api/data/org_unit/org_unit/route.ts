'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { NextRequest, NextResponse } from "next/server";
import { OrgUnit } from "../org_unit";
import { ErrorCreators } from "@/lib/api-error-handling";

const query_text = `
SELECT 
    id,
    code,
    name,
    path
FROM org_unit ou
WHERE ou.deleted = FALSE OR ($1 AND ou.deleted = TRUE)
`

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";

    // Check user
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    // See if we have an optional param
    const searchParams = request.nextUrl.searchParams;
    const include_del_string = searchParams.get("include_deleted");
    const include_del = 
        (
            include_del_string?.toLocaleLowerCase() == 'true' || 
            include_del_string?.toLocaleLowerCase() == 'y'
        ) ? true : false

    if (!useMockData) {
        const orgs = await db.pool.query(query_text, [include_del]);
        const res:OrgUnit[] = orgs.rows;
        return NextResponse.json(res);
    }
}