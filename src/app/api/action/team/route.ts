'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { NextRequest, NextResponse } from 'next/server';
import { UserTeamRequest } from './user-team';
import { ErrorCreators } from '@/lib/api-error-handling';
import { requirePermissions } from '@/lib/permissions/check';
import { AuditData } from "@/lib/audit/types";
import { createAuditEntry } from "@/lib/audit/audit-log";

const origin = 'api/action/team'

const query_team = `
    INSERT INTO user_team(
        name,
        description
    )
    VALUES ($1, $2)
    RETURNING 
        id,
        name,
        description
`;

// Creation of a new team
export async function POST(request: NextRequest) {

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['admin.team']);
    if (permissionCheck) return permissionCheck;

    // Get team to create and validate
    const team: UserTeamRequest = await request.json();
    const req_params = [
        { name: 'team.name', field: team.name },
        { name: 'team.description', field: team.description }
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
        const newTeam = await client.query(query_team, [team.name, team.description]);
        if (newTeam.rows.length === 0) {
            await client.query('ROLLBACK');
            return ErrorCreators.db.noReturning(origin, `Insert team with name ${team.name}`);
        }
        // Get the newly created id
        const newTeamId: number = newTeam.rows[0].id;
        
        const auditData: AuditData = {
            category: 'team',
            action: 'create-team',
            target_type: 'team',
            target_id_num: newTeamId,
            after_data: {
                id: newTeamId,
                name: team.name,
                description: team.description
            }
        }
        await createAuditEntry(client, user.name, auditData );
        // And Commit at the end.
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