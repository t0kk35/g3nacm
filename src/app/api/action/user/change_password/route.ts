'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';
import { AuditData } from "@/lib/audit/types";
import { createAuditEntry } from "@/lib/audit/audit-log";
import { requirePermissions } from '@/lib/permissions/check';

const origin = 'api/action/user/change_password'

const query_update_password_text = `
UPDATE users 
SET password = $2
WHERE name = $1
`

// (Bulk) revoke role or team from a list users.
export async function POST(request: NextRequest) {

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    // Get the new password and validate
    const { changeUserName, newPassword } = await request.json();    
    if (!newPassword) return ErrorCreators.param.bodyMissing(origin, 'newPassword');
    if (!changeUserName) return ErrorCreators.param.bodyMissing(origin, 'changeUserName');
    // TODO Consider checking the complexity and better validation
    
    // If you are not changing your own password you need the admin right.
    if (user.name !== changeUserName) {
        const permissionCheck = await requirePermissions(user.name, origin, ['admin.change_password']);
        if (permissionCheck) return permissionCheck;
    } else {
        const permissionCheck = await requirePermissions(user.name, origin, ['user.change_password']);
        if (permissionCheck) return permissionCheck;

    }
    // Encode the password
    const passWordSecret = process.env.PASSWORD_SECRET;
    if (!passWordSecret) return ErrorCreators.auth.passwordSecretNotFound(origin);
    const pwdHash = createHmac('sha256', passWordSecret).update(newPassword).digest('hex');

    // Set up a connection and transactions
    let client;
    let transactionStarted = false;

    try {
        client = await db.pool.connect();
        await client.query('BEGIN');
        transactionStarted = true
        await client.query(query_update_password_text, [changeUserName, pwdHash])
        
        // Audit the change
        const auditData: AuditData = {
            category: 'user',
            action: 'password-change',
            target_type: 'user',
            target_id_string: changeUserName,
        }
        await createAuditEntry(client, user.name, auditData);
        await client.query('COMMIT');
        // If we get here we're good.
        return NextResponse.json({result: 'success'});
    } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        console.error('Setting password', error);
        return ErrorCreators.db.queryFailed(origin, 'set password', error as Error);
    } finally {
        if (client) client.release();
    }
}