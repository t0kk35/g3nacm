'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { NextRequest, NextResponse } from "next/server";
import { ErrorCreators } from '@/lib/api-error-handling';
import { OrgUnit, OrgUnitNode } from "../org_unit";

const origin = 'api/data/org_unit/hierarchy'

const query = `
SELECT 
    id,
    code, 
    name,
    parent_id, 
    path,
    deleted
FROM org_unit
WHERE (deleted = FALSE OR ($1 AND deleted = TRUE)) 
ORDER BY path
`

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";
    
    // Check the user
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    
    // See if we have an optional param
    const searchParams = request.nextUrl.searchParams;
    const include_del_string = searchParams.get("include_deleted");
    const include_del = (
        include_del_string?.toLocaleLowerCase() == 'true' || include_del_string?.toLocaleLowerCase() == 'y'
    ) ? true : false

    if (!useMockData) {
        try {
            const orgs = await db.pool.query(query, [include_del]);
            const hierarchy = buildTree(orgs.rows)
            return NextResponse.json(hierarchy);       
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin,'get org_unit_hierarchy', error as Error)
        }
    }
}

function buildTree(org_units: OrgUnit[]): OrgUnitNode[] {
    const map = new Map<number, OrgUnitNode>();
    const roots: OrgUnitNode[] = [];

    // First pass: create node entries
    org_units.forEach(unit => {
        map.set(unit.id, { ...unit, children: [] });
    });

    // Second pass: build tree relationships
    org_units.forEach(unit => {
        const node = map.get(unit.id)!;
        if (unit.parent_id) {
            const parent = map.get(unit.parent_id);
            if (parent) parent.children.push(node);
        }
        else { roots.push(node) }
    });

    return roots;
}