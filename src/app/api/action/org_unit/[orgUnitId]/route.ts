'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { NextRequest, NextResponse } from 'next/server';
import { authorizedGetJSON } from "@/lib/org-filtering";
import { OrgUnitRequest } from '../org-unit';
import { ErrorCreators } from '@/lib/api-error-handling';
import { requirePermissions } from '@/lib/permissions/check';
import { OrgUnit } from "@/app/api/data/org_unit/org_unit";
import { AuditData } from "@/lib/audit/types";
import { createAuditEntry } from "@/lib/audit/audit-log";

type Props = {params: Promise<{ orgUnitId: string }>}

const origin = 'api/action/org_unit/[orgUnitId]'

const query_parent_validation = `
SELECT COUNT(*) AS child_count 
FROM org_unit 
WHERE parent_id = $1
`

const query_update = `
UPDATE org_unit
SET name = $2
WHERE id = $1
`

const query_delete = `
UPDATE org_unit
SET deleted = TRUE
WHERE id = $1
`

export async function PUT(request: NextRequest, { params }: Props) {

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.org_unit']);
    if (permissionCheck) return permissionCheck;

    const orgUnitId = (await params).orgUnitId;
    if (!orgUnitId) return ErrorCreators.param.urlMissing(origin, 'orgUnitId');

    const org: OrgUnitRequest = await request.json();
    const req_params = [
        { name: 'code', field: org.code },
        { name: 'name', field: org.name}
    ]
    for (var param of req_params) {
        if (!param.field) return ErrorCreators.param.bodyMissing(origin, param.name);
    }

    // Get audit before data
    let beforeData;
    try {
        const before = await authorizedGetJSON<OrgUnit[]>(`${process.env.DATA_URL}/api/data/org_unit/org_unit?org_unit_id=${orgUnitId}`)
        if (before.length < 1) return ErrorCreators.db.entityNotFound(origin, "OrgUnit", orgUnitId)
        beforeData = before[0]
    } catch (error) {
        return ErrorCreators.api.failedCall(origin, error as Error)
    }

    // Set up a connection and transactions
    let client;
    let transactionStarted=false;

    try { 
        client = await db.pool.connect();    
        await client.query('BEGIN');
        transactionStarted = true;
        // Really the only thing that can change is the name
        await client.query(query_update, [orgUnitId, org.name]);
        const auditData: AuditData = {
            category: 'org-unit',
            action: 'update-org-unit',
            target_type: 'org-unit',
            target_id_num: beforeData.id,
            before_data: {
                id: beforeData.id,
                code: beforeData.code,
                name: beforeData.name,
                parent_id: beforeData.parent_id,
                path: beforeData.path,
                deleted: false
            },
            after_data: {
                id: beforeData.id,
                code: beforeData.code,
                name: org.name,
                parent_id: beforeData.parent_id,
                path: beforeData.path,
                deleted: false
            },            
        }
        await createAuditEntry(client, user.name, auditData );
        // And Commit at the end.
        await client.query('COMMIT');
        return NextResponse.json({ 'success': true });
    } catch (error) {
        if (client && transactionStarted) client.query('ROLLBACK');
        console.error('Error updating org-unit', error);
        return ErrorCreators.db.queryFailed(origin, 'update org-unit', error as Error);
    } finally {
        if (client) client.release();
    }
}

export async function DELETE(_request: NextRequest, { params }: Props) {

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.org_unit']);
    if (permissionCheck) return permissionCheck;

    const orgUnitId = (await params).orgUnitId;
    if (!orgUnitId) return ErrorCreators.param.urlMissing(origin, 'orgUnitId');

    // Get audit before data
    let beforeData;
    try {
        const before = await authorizedGetJSON<OrgUnit[]>(`${process.env.DATA_URL}/api/data/org_unit/org_unit?org_unit_id=${orgUnitId}`)
        if (before.length < 1) return ErrorCreators.db.entityNotFound(origin, "OrgUnit", orgUnitId)
        beforeData = before[0]
    } catch (error) {
        return ErrorCreators.api.failedCall(origin, error as Error)
    }

    // Set up a connection and transactions
    let client;
    let transactionStarted=false;
    try { 
        client = await db.pool.connect();    
        await client.query('BEGIN');
        transactionStarted = true;
        // Run Validations
        const parent = await client.query(query_parent_validation, [orgUnitId]);
        const { child_count } = parent.rows[0];
        if (child_count > 0) {
            await client.query('ROLLBACK');
            return ErrorCreators.org.hasChildren(origin, orgUnitId);
        }
        await client.query(query_delete, [orgUnitId]);

        const auditData: AuditData = {
            category: 'org-unit',
            action: 'delete-org-unit',
            target_type: 'org-unit',
            target_id_num: beforeData.id,
            before_data: {
                id: beforeData.id,
                code: beforeData.code,
                name: beforeData.name,
                parent_id: beforeData.parent_id,
                path: beforeData.path,
                deleted: false
            },
            after_data: {
                id: beforeData.id,
                code: beforeData.code,
                name: beforeData.name,
                parent_id: beforeData.parent_id,
                path: beforeData.path,
                deleted: true
            },            
        }
        await createAuditEntry(client, user.name, auditData );
        // And Commit at the end.
        await client.query('COMMIT');
        return NextResponse.json({ 'success': true });
    } catch (error) {
        if (client && transactionStarted) client.query('ROLLBACK');
        console.error('Error deleting org-unit', error);
        return ErrorCreators.db.queryFailed(origin, 'delete org-unit', error as Error);
    } finally {
        if (client) client.release();
    }
}