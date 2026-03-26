'use server'

import { auth } from "@/auth";
import * as db from "@/db";
import { authorizedGetJSON } from "@/lib/org-filtering";
import { NextRequest, NextResponse } from 'next/server';
import { UserTeamRequest } from '../user-team';
import { UserTeam } from "@/app/api/data/user/user";
import { ErrorCreators } from '@/lib/api-error-handling';
import { requirePermissions } from '@/lib/permissions/check';
import { AuditData } from "@/lib/audit/types";
import { createAuditEntry } from "@/lib/audit/audit-log";

type Props = {params: Promise<{ teamId: string }>}

const origin = 'api/action/team/[id]'

const query_team_update = `
UPDATE user_team SET
    name = $2,
    description = $3
WHERE id = $1
`

const query_team_delete = `
DELETE FROM user_team
WHERE id = $1
`

// Update of a team
export async function PUT(request: NextRequest, { params }: Props) {

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.team']);
    if (permissionCheck) return permissionCheck;

    const teamId = (await params).teamId;
    if (!teamId) return ErrorCreators.param.urlMissing(origin, 'teamId');
    
    // Get team to update and validate
    const team: UserTeamRequest = await request.json();
    const req_params = [
        { name: 'team.name', field: team.name },
        { name: 'team.description',  field: team.description }
    ];
    for (var param of req_params) {
        if (!param.field) return ErrorCreators.param.bodyMissing(origin, param.name);
    }

    // Get audit before data
    let beforeData;
    try {
        const before = await authorizedGetJSON<UserTeam[]>(`${process.env.DATA_URL}/api/data/user/team?team_id=${teamId}`)
        if (before.length < 1) return ErrorCreators.db.entityNotFound(origin, "Team", teamId)
        beforeData = before[0]
    } catch (error) {
        return ErrorCreators.api.failedCall(origin, error as Error)
    }

    // Set up a connection and transactions
    let client;
    let transactionStarted = false;
    try {
        client = await db.pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;
        // Update the team record
        await client.query(query_team_update, [teamId, team.name, team.description]);

        const auditData: AuditData = {
            category: 'team',
            action: 'update-team',
            target_type: 'team',
            target_id_num: beforeData.id,
            before_data: {
                id: beforeData.id,
                name: beforeData.name,
                description: beforeData.description
            },
            after_data: {
                id: teamId,
                name: team.name,
                description: team.description
            }
        }
        await createAuditEntry(client, user.name, auditData );
        // And Commit at the end.
        await client.query('COMMIT');
        return NextResponse.json({ sucess : true });
    } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        console.error('Error updating team', error);
        return ErrorCreators.db.queryFailed(origin, 'updating team', error as Error);
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
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.team']);
    if (permissionCheck) return permissionCheck;

    const teamId = (await params).teamId;
    if (!teamId) return ErrorCreators.param.urlMissing(origin, 'teamId');

    // Get audit before data
    let beforeData;
    try {
        const before = await authorizedGetJSON<UserTeam[]>(`${process.env.DATA_URL}/api/data/user/team?team_id=${teamId}`)
        if (before.length < 1) return ErrorCreators.db.entityNotFound(origin, "Team", teamId)
        beforeData = before[0]
    } catch (error) {
        return ErrorCreators.api.failedCall(origin, error as Error)
    }

    // Set up a connection and transactions
    let client;
    let transactionStarted = false;

    try {
        client = await db.pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;
        await client.query(query_team_delete, [teamId]);

        const auditData: AuditData = {
            category: 'team',
            action: 'delete-team',
            target_type: 'team',
            target_id_num: beforeData.id,
            before_data: {
                id: beforeData.id,
                name: beforeData.name,
                description: beforeData.description,
            }
        }
        await createAuditEntry(client, user.name, auditData );
        // And Commit at the end.
        await client.query('COMMIT');
        return NextResponse.json({ 'success' : true });
    } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        console.error('Error deleting team', error);
        return ErrorCreators.db.queryFailed(origin, 'delete team', error as Error);
    } finally {
        if (client) client.release();
    }
}