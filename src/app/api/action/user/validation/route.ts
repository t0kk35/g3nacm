'use server'

import * as db from "@/db"
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from 'crypto';
import { ErrorCreators } from "@/lib/api-error-handling";
import { AuditData } from "@/lib/audit/types";
import { createAuditEntry } from "@/lib/audit/audit-log";
import { checkLoginRateLimit } from "@/lib/auth/rate-limit";

const origin = 'api/action/user/validation'

const query_password_text = 'SELECT password FROM users WHERE name = $1'

const query_update_user_text = `
UPDATE users 
SET last_login_date_time = now()
WHERE name = $1
`

/**
 * Validation of user credentials
 * 
 * This end-point has a specific authentication mechanism, clearly you can not be logged-on when you run this. 
 * So we can not get the session and user like the other end-points.
 * This has a lightweight bearer token authentication to avoid unwaranted access. The bearer token secret 
 * is stored in the .env.local file.
 * 
 */
export async function POST(req: NextRequest) {
    
    // Check if the call comes from our application.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return ErrorCreators.auth.missingAuthHeader(origin);
    const authToken = authHeader.split("Bearer ").at(1);
    if (authToken !== process.env.USER_VALIDATION_SECRET) return ErrorCreators.auth.failedBearerCheck(origin);

    // Get credentials from the request. Create the password hash
    const { userName, password, clientMetadata } = await req.json();
    const passWordSecret = process.env.PASSWORD_SECRET;
    if (!passWordSecret) return ErrorCreators.auth.passwordSecretNotFound(origin);
    const pwdHash = createHmac('sha256', passWordSecret).update(password).digest('hex');

    // Set up a connection and transactions
    let client;
    let transactionStarted = false;

    // Get User password from the database
    try {
        client = await db.pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;

        // Check rate limiting before validating credentials
        const clientIp = clientMetadata?.ip || 'unknown';
        const rateLimitCheck = await checkLoginRateLimit(client, userName, clientIp);

        if (!rateLimitCheck.allowed) {
            // Log rate limit violation to audit log
            const rateLimitLog: AuditData = {
                category: 'access',
                action: 'rate-limit-exceeded',
                target_type: 'user',
                target_id_string: userName,
                metadata: {
                    ...clientMetadata,
                    reason: rateLimitCheck.reason,
                    retryAfter: rateLimitCheck.retryAfter
                }
            };
            createAuditEntry(client, userName, rateLimitLog);
            await client.query('COMMIT');

            return NextResponse.json(
                { error: rateLimitCheck.reason, retryAfter: rateLimitCheck.retryAfter },
                { status: 429 }
            );
        }

        const pwd = await client.query(query_password_text, [userName])

        // Check if the hashes match
        if (pwd.rows.length === 0 || pwd.rows.length > 1) {
            // Log failed login attempt - user not found
            const failedLog: AuditData = {
                category: 'access',
                action: 'failed log-in',
                target_type: 'user',
                target_id_string: userName,
                metadata: {
                    ...clientMetadata,
                    reason: 'user not found'
                }
            };
            createAuditEntry(client, userName, failedLog);
            await client.query('COMMIT');
            return ErrorCreators.auth.userNotFound(origin, userName);
        }

        if (pwd.rows[0].password !== pwdHash) {
            // Log failed login attempt - incorrect password
            const failedLog: AuditData = {
                category: 'access',
                action: 'failed log-in',
                target_type: 'user',
                target_id_string: userName,
                metadata: {
                    ...clientMetadata,
                    reason: 'incorrect password'
                }
            };
            createAuditEntry(client, userName, failedLog);
            await client.query('COMMIT');
            return ErrorCreators.auth.passwordFail(origin, userName);
        }
    
        // If we get here, the user is authenticated
        // Update the last login date
        await client.query(query_update_user_text, [userName]);
        // Create audit log
        const logData: AuditData = {
            category: 'access',
            action: 'successful log-in',
            target_type: 'user',
            target_id_string: userName,
            metadata: clientMetadata || {}
        }
        createAuditEntry(client, userName, logData);
        await client.query('COMMIT');
        return NextResponse.json({ name: userName });
    } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        return ErrorCreators.db.queryFailed(origin, 'validating user', error as Error);
    }
    finally {
        if (client) client.release();
    }
}