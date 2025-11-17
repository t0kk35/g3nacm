'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { NextRequest, NextResponse } from 'next/server';
import { OrgUnitRequest } from './org-unit';
import { ErrorCreators } from '@/lib/api-error-handling';
import { requirePermissions } from '@/lib/permissions/check';

const origin = 'api/action/org_unit/'

const query_code_unique_validation = `
SELECT COUNT(*) AS code_count
FROM org_unit
WHERE code = $1
`

const query_insert_org = `
    INSERT INTO org_unit(
        code,
        name,
        parent_id,
        path
    )
    VALUES ($1, $2, $3, 'temp')
    RETURNING 
        id,
        code,
        name
`;

const query_update_path = `
    UPDATE org_unit
        SET path = 
        CASE 
            WHEN $2::integer IS NULL THEN $1::text 
            ELSE (SELECT CONCAT(path, '/', $1) FROM org_unit WHERE id = $2::integer) 
        END
    WHERE id = $1
`

// Creation of a new org-unit
export async function POST(request: NextRequest) {

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.org_unit']);
    if (permissionCheck) return permissionCheck;

    // Get org to create and validate. Parent can be null for root orgs
    const org: OrgUnitRequest = await request.json();
    
    const req_param = [
        { name:'org.code', field: org.code},
        { name:'org.name', field: org.name}
    ]
    for (const param of req_param) {
        if (!param.field) return ErrorCreators.param.bodyMissing(origin, param.name);
    }

    // Set up a connection and transactions
    let client;
    let transactionStarted=false;
    
    try {
        client = await db.pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;
        // Run validation
        const validation = await client.query(query_code_unique_validation, [org.code]);
        const { code_count } = await validation.rows[0];
        if (code_count > 0) {
            await client.query('ROLLBACK');
            return ErrorCreators.org.notUnique(origin, org.code);
        }
        // First insert. Cause we need to know the id we're going to get.
        const newOrg = await client.query(query_insert_org, [org.code, org.name, org.parent_id]);
        const newOrgId:number = newOrg.rows[0].id;
        // Knowing the new id we can set the path
        await client.query(query_update_path, [newOrgId, org.parent_id]);
        await client.query('COMMIT');
        return NextResponse.json({ 'success': true });
    } catch (error) {
        if (client && transactionStarted) client.query('ROLLBACK');
        console.error('Error creating org-unit', error);
        return ErrorCreators.db.queryFailed(origin, 'create org-unit', error as Error);
    } finally {
        if (client) client.release();
    }
}