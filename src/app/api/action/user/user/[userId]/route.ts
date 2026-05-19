'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { queryUserListAdmin } from "@/lib/data/queries/user/list_admin";
import { NextRequest, NextResponse } from 'next/server';
import { UserRequest } from '../types';
import { ErrorCreators } from '@/lib/api-error-handling';
import { requirePermissions } from '@/lib/permissions/check';
import { AuditData } from "@/lib/audit/types";
import { createAuditEntry } from "@/lib/audit/audit-log";

type Props = {params: Promise<{ userId: string }>}

const origin = 'api/action/user/user/[userId]'

const query_role_link_delete = `
DELETE FROM user_role_link
WHERE user_id = $1
`;

const query_team_link_delete = `
DELETE FROM user_team_link
WHERE user_id = $1
` 

const query_org_link_delete = `
DELETE FROM org_unit_user_access
WHERE user_id = $1
`

const query_update_user = `
UPDATE users SET 
    first_name = $2,
    last_name = $3,
    locale = $4
WHERE id = $1
`

const query_delete_user =  `
UPDATE users 
SET deleted = TRUE
WHERE id = $1
`

// Update of a user
export async function PUT(request: NextRequest, { params }: Props) {

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.user']);
    if (permissionCheck) return permissionCheck;

    const userId = (await params).userId;
    if (!userId) return ErrorCreators.param.urlMissing(origin, 'userId');

    // Get user to create and validate
    const userRequest: UserRequest = await request.json();
    const req_params = [
        { name: 'name', field: userRequest.name },
        { name: 'first_name', field: userRequest.first_name },
        { name: 'last_name', field: userRequest.last_name },
        { name: 'role_ids', field: userRequest.role_ids },
    ]
    for (const param of req_params) {
        if (!param.field) return ErrorCreators.param.bodyMissing(origin, param.name);
    }

    // Set up a connection and transactions
    let client; 
    let transactionStarted = false;
    try {     
        client = await db.pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;

        // Get before state for audit
        const before = await queryUserListAdmin({user_id: parseInt(userId)}, {userName: user.name, client: client});
        if (before.length < 1) return ErrorCreators.user.notFound(origin, parseInt(userId));
        const beforeData = before[0];

        // First delete existing role and team links
        await client.query(query_role_link_delete, [userId]);
        await client.query(query_team_link_delete, [userId]);
        await client.query(query_org_link_delete, [userId]);

        // Then recreate them
        if (userRequest.role_ids.length > 0) {
            const role_link_query = `
                INSERT INTO user_role_link(user_id, role_id)
                VALUES ${userRequest.role_ids.map((_, i) => `($1, $${i+2})`).join(',')}
            `
            const params = [userId, ...userRequest.role_ids];
            await client.query(role_link_query, params);
        }
        if (userRequest.team_infos.length > 0) {
            const team_link_query = `
                INSERT INTO user_team_link(user_id, team_id, rank)
                VALUES ${userRequest.team_infos.map((_, i) => `($1, $${i+2}, $${i+2+userRequest.team_infos.length})`).join(',')}
            `
            const params = [
                userId,
                ...userRequest.team_infos.map((ti) => ti.team_id),
                ...userRequest.team_infos.map((ti) => ti.team_rank)
            ];
            await client.query(team_link_query, params);
        }
        if (userRequest.org_unit_ids.length > 0) {
            const org_access_query = `
                INSERT INTO org_unit_user_access(user_id, org_unit_id)
                VALUES ${userRequest.org_unit_ids.map((_, i) => `($1, $${i+2})`).join(',')}
            `
            const params = [userId, ...userRequest.org_unit_ids]
            await client.query(org_access_query, params);
        }
        
        // Update user data. Though it might not have changed.
        await client.query(query_update_user, [
            userId, 
            userRequest.first_name, 
            userRequest.last_name,
            userRequest.locale
        ])

        // Audit our changes
        const auditData: AuditData = {
            category: 'user',
            action: 'update-user',
            target_type: 'user',
            target_id_string: userRequest.name,
            before_data: {
                id: beforeData.id,
                name: beforeData.name,
                firstName: beforeData.first_name,
                lastName: beforeData.last_name,
                locale: beforeData.locale,
                roleIds: beforeData.role_ids,
                teamInfos: beforeData.team_infos,
                orgUnitIds: beforeData.org_ids
            },
            after_data: {
                id: beforeData.id,
                name: userRequest.name,
                firstName: userRequest.first_name,
                lastName: userRequest.last_name,
                locale: userRequest.locale,
                roleIds: userRequest.role_ids,
                teamInfos: userRequest.team_infos,
                orgUnitIds: userRequest.org_unit_ids
            }
        }
        await createAuditEntry(client, user.name, auditData );
        // And Commit at the end.
        await client.query('COMMIT');  
        return NextResponse.json({success: true});
    } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        console.error('Error updating role', error);
        return ErrorCreators.db.queryFailed(origin, 'update user', error as Error);
    } finally {
        if (client) client.release();
    }
}

// Delete of a user
export async function DELETE(_request: NextRequest, { params }: Props) {

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.user']);
    if (permissionCheck) return permissionCheck;

    const userId = (await params).userId;
    if (!userId) return ErrorCreators.param.urlMissing(origin, 'userId');

    // Set up a connection and transactions
    let client;
    let transactionStarted = false;
    try {
        client = await db.pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;

        // Get before state for audit
        const before = await queryUserListAdmin({user_id: parseInt(userId)}, {userName: user.name, client: client});
        if (before.length < 1) return ErrorCreators.user.notFound(origin, parseInt(userId));
        const beforeData = before[0];

        // First delete existing role and team links
        await client.query(query_role_link_delete, [userId]);
        await client.query(query_team_link_delete, [userId]);
        await client.query(query_org_link_delete, [userId]);
        // Then logically delete the user
        await client.query(query_delete_user, [userId]);

        // Audit our changes
        const auditData: AuditData = {
            category: 'user',
            action: 'delete-user',
            target_type: 'user',
            target_id_string: beforeData.name,
            before_data: {
                id: beforeData.id,
                name: beforeData.name,
                firstName: beforeData.first_name,
                lastName: beforeData.last_name,
                locale: beforeData.locale,
                roleIds: beforeData.role_ids,
                teamInfos: beforeData.team_infos,
                orgUnitIds: beforeData.org_ids
            }
        }
        await createAuditEntry(client, user.name, auditData );
        // And Commit our change
        await client.query('COMMIT');
        return NextResponse.json({ success: true });
    } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        console.error('Error deleting user', error);
        return ErrorCreators.db.queryFailed(origin, 'delete user', error as Error);
    } finally {
        if (client) client.release();
    }
}