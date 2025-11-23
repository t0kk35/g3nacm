/* Create a new user */
'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { NextRequest, NextResponse } from 'next/server';
import { UserRequest } from './types';
import { ErrorCreators } from '@/lib/api-error-handling';
import { requirePermissions } from '@/lib/permissions/check';
import { AuditData } from "@/lib/audit/types";
import { createAuditEntry } from "@/lib/audit/audit-log";
import { UserAudit } from "./types";

const origin = 'api/action/user/user'

const query_user = `
    INSERT INTO users(
        name,
        first_name,
        last_name
    )
    VALUES ($1, $2, $3)
    RETURNING 
        id
`;

// Creation of a new user
export async function POST(request: NextRequest) {

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.user']);
    if (permissionCheck) return permissionCheck;
    
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
        const newUser = await client.query(query_user, [
          userRequest.name, 
          userRequest.first_name,   
          userRequest.last_name
        ]);
        if (newUser.rows.length === 0) {
            await client.query('ROLLBACK');
            return ErrorCreators.db.noReturning(origin, 'insert user');
        }
        // Get the newly created user-id
        const newUserId: number = newUser.rows[0].id;

        // Link the roles and the teams
        const insert_queries = [];
        if (userRequest.role_ids.length > 0) {
            const role_query = `
                INSERT INTO user_role_link(user_id, role_id)
                VALUES ${userRequest.role_ids.map((_, i) => `($1, $${i+2})`).join(',')}
            `
            const params = [newUserId, ...userRequest.role_ids];
            insert_queries.push(client.query(role_query, params));
        };
        if (userRequest.team_infos.length > 0) {
            const team_link_query = `
                INSERT INTO user_team_link(user_id, team_id, rank)
                VALUES ${userRequest.team_infos.map((_, i) => `($1, $${i+2}, $${i+2+userRequest.team_infos.length})`).join(',')}
            `
            const params = [
                newUserId, 
                ...userRequest.team_infos.map((ti) => ti.team_id),
                ...userRequest.team_infos.map((ti) => ti.team_rank)
            ];
            insert_queries.push(client.query(team_link_query, params));
        };
        if (insert_queries.length > 0) await Promise.all(insert_queries);
        
        // Audit the insert
        const addedUser: UserAudit = {
            user: {
                id: newUserId,
                name: userRequest.name,
                firstName: userRequest.first_name,
                lastName: userRequest.last_name,
                deleted: false
            },
            org_ids: userRequest.org_unit_ids,
            role_ids: userRequest.org_unit_ids,
            team_ids: userRequest.team_infos.map(ti => ti.team_id)
        }
        const auditData: AuditData = {
            category: 'user',
            action: 'create-user',
            target_type: 'user',
            target_id_string: userRequest.name,
            after_data: {
                user: addedUser
            }
        }
        await createAuditEntry(client, user.name, auditData );
        
        // And Commit
        await client.query('COMMIT');
        return NextResponse.json({ 'success': true });
    } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        console.error('Error creating user', error);
        return ErrorCreators.db.queryFailed(origin, 'create user', error as Error);
    } finally {
        if (client) client.release();
    }
}