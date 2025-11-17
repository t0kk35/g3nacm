'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { NextRequest, NextResponse } from 'next/server';
import { UserRoleRequest } from './user-role';
import { ErrorCreators } from '@/lib/api-error-handling';
import { requirePermissions } from '@/lib/permissions/check';

const origin = 'api/action/role'

const query_role = `
    INSERT INTO user_role(
        name,
        description
    )
    VALUES ($1, $2)
    RETURNING 
        id,
        name,
        description
`;

// Creation of a new role
export async function POST(request: NextRequest) {

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.role']);
    if (permissionCheck) return permissionCheck;
    
    // Get role to create and validate
    const role: UserRoleRequest = await request.json();

    const req_params = [
        { name: 'role.name', field: role.name },
        { name: 'role.description', field: role.description }, 
        { name: 'role.permission_ids', field: role.permission_ids }
    ]
    for (var param of req_params) {
        if (!param.field) return ErrorCreators.param.bodyMissing(origin, param.name);
    }

    // Set up a connection and transactions
    let client;
    let transactionStarted = false;

    try {     
        client = await db.pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;
        const newRole = await client.query(query_role, [role.name, role.description]);
        if (newRole.rows.length === 0) {
            await client.query('ROLLBACK');
            return ErrorCreators.db.noReturning(origin, `Insert role ${role.name}`);
        }
        // Get the newly created id
        const newRoleId: number = newRole.rows[0].id;
        
        if (role.permission_ids.length > 0) {
            // Link the permissions in the user_role_permission_link table.
            const permission_query = `
                INSERT INTO user_role_permission_link(role_id, permission_id)
                VALUES ${role.permission_ids.map((_, i) => `($1, $${i+2})`).join(',')}
            `
            const params = [newRoleId, ...role.permission_ids];
            await client.query(permission_query, params);
        }
        await client.query('COMMIT');
        return NextResponse.json({ 'success': true });
    } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        console.error('Error creating role', error);
        return ErrorCreators.db.queryFailed(origin, 'create role', error as Error);
    } finally {
        if (client) client.release();
    }
}