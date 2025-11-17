/* Revoke a team or role for a list of users */
'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { NextRequest, NextResponse } from 'next/server';
import { UserRevokeRequest } from '../user/user';
import { ErrorCreators } from '@/lib/api-error-handling';
import { requirePermissions } from '@/lib/permissions/check';

const origin = 'api/action/user/revoke'

const query_role_revoke = `
DELETE FROM user_role_link
WHERE user_id = ANY($1) AND role_id = $2
`

const query_team_revoke = `
DELETE FROM user_team_link
WHERE user_id = ANY($1) AND team_id = $2
`

// (Bulk) revoke role or team from a list users.
export async function POST(request: NextRequest) {

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.user']);
    if (permissionCheck) return permissionCheck;

    // Get user to create and validate
    const userRevokeRequest: UserRevokeRequest = await request.json();
    // User ids should be present and it should be an array
    if (!userRevokeRequest.user_ids) return ErrorCreators.param.bodyMissing(origin, 'user_ids');
    if (!Array.isArray(userRevokeRequest.user_ids)) return ErrorCreators.param.typeInvalid(origin, 'user_ids', 'Array', 'unknown');
    
    // Set up a connection and transactions
    let client;
    let transactionStarted = false;
    
    try {
        client = await db.pool.connect();
        const queries = [];
        if (userRevokeRequest.role_id) queries.push(client.query(query_role_revoke, [userRevokeRequest.user_ids, userRevokeRequest.role_id]));
        if (userRevokeRequest.team_id) queries.push(client.query(query_team_revoke, [userRevokeRequest.user_ids, userRevokeRequest.team_id]));
        await client.query('BEGIN');
        transactionStarted = true
        if (queries.length > 0) await Promise.all(queries);
        await client.query('COMMIT');
        return NextResponse.json({ 'sucess': true });
    } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        console.error('Error creating revoking teams/roles', error);
        return ErrorCreators.db.queryFailed(origin, 'revoke teams/roles', error as Error);
    } finally {
        if (client) client.release();
    }
}