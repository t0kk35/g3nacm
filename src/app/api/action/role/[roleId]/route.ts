'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { NextRequest, NextResponse } from 'next/server';
import { UserRoleRequest } from '../user-role';
import { ErrorCreators } from '@/lib/api-error-handling';
import { requirePermissions } from '@/lib/permissions/check';

type Props = { params: Promise<{ roleId: string }> }

const origin = 'api/action/role/[id]'

const query_role_update = `
UPDATE user_role SET 
    name = $2,
    description = $3
WHERE id = $1
`

const query_permission_delete = `
DELETE FROM user_role_permission_link
WHERE role_id = $1
`;

const query_role_delete = `
DELETE FROM user_role
WHERE id = $1    
`

// Update of a role
export async function PUT(request: NextRequest, { params }: Props) {

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.role']);
    if (permissionCheck) return permissionCheck;

    const roleId = (await params).roleId;
    if (!roleId) return ErrorCreators.param.urlMissing(origin, 'roleId');

    // Get role to update and validate
    const role: UserRoleRequest = await request.json();
    const req_param = [
        { name: 'role.name', field: role.name },
        { name: 'role.permission_ids', field: role.permission_ids }
    ]
    for (var param of req_param) {
        if (!param.field) return ErrorCreators.param.bodyMissing(origin, param.name);
    }

    // Set up a connection and transactions
    let client;
    let transactionStarted = false;
    try {     
        client = await db.pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;
        // First delete existing permission links
        await client.query(query_permission_delete, [roleId]);
        // Now recreate
        if (role.permission_ids.length > 0) {
            // Link the permissions in the user_role_permission_link table.
            const permission_query = `
                INSERT INTO user_role_permission_link(role_id, permission_id)
                VALUES ${role.permission_ids.map((_, i) => `($1, $${i+2})`).join(',')}
            `
            const params = [roleId, ...role.permission_ids];
            await client.query(permission_query, params);
        }
        // Update the role name (though it might not have changed)
        await client.query(query_role_update, [roleId, role.name, role.description]);
        await client.query('COMMIT');
        return NextResponse.json({success: true});
    } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        console.error('Error updating role', error);
        return ErrorCreators.db.queryFailed(origin, 'updating role', error as Error);
    } finally {
        if (client) client.release();
    }
}

// Delete of a role
export async function DELETE(_request: NextRequest, { params }: Props) {

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.role']);
    if (permissionCheck) return permissionCheck;

    const roleId = (await params).roleId;
    if (!roleId) return ErrorCreators.param.urlMissing(origin, 'roleId');

    // Set up a connection and transactions
    let client;
    let transactionStarted = false;
    try {     
        client = await db.pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;
        // First delete existing permission links
        await client.query(query_permission_delete, [roleId]);
        // Then the role
        await client.query(query_role_delete, [roleId]);
        await client.query('COMMIT');
        return NextResponse.json({ success: true });
    } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        console.error('Error deleting role', error);
        return ErrorCreators.db.queryFailed(origin, 'delete role', error as Error);
    } finally {
        if (client) client.release();
    }    
}