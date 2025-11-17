'use server'

import * as db from "@/db"
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from 'crypto';
import { ErrorCreators } from "@/lib/api-error-handling";

const origin = 'api/action/user/validation'

const query_text = 'SELECT password FROM users WHERE name = $1'

/**
 * Validation of user credentials
 * 
 * This has a specific authentication mechanism, clearly you can not be logged-on when you run this. 
 * So this has a lightweight bearer token authentication.
 * 
 */
export async function POST(req: NextRequest) {
    
    // Check if the call comes from our application.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return ErrorCreators.auth.missingAuthHeader(origin);
    const authToken = authHeader.split("Bearer ").at(1);
    if (authToken !== process.env.USER_VALIDATION_SECRET) return ErrorCreators.auth.failedBearerCheck(origin);

    // Get credentials from the request. Create the password hash
    const { userName, password } = await req.json();
    const pwdHash = createHmac('sha256', password).update('MyCusT0mS@lt').digest('hex');
    
    // Get User password from the database
    try {
        const pwd = await db.pool.query(query_text, [userName])

        // Check if the hashes match
        if (pwd.rows.length === 0 || pwd.rows.length > 1) return ErrorCreators.auth.userNotFound(origin, userName);
        if (pwd.rows[0].password !== pwdHash) return ErrorCreators.auth.passwordFail(origin, userName);
    
        // If we get here, the user is authenticated
        return NextResponse.json({ name: userName });
    } catch (error) {
        return ErrorCreators.db.queryFailed(origin, 'validating user', error as Error);
    }
}