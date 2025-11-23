/**
 * Rate Limiting for Login Attempts
 *
 * Uses the existing audit_log table to track failed login attempts and enforce rate limits.
 * This prevents brute force attacks by limiting login attempts per IP address and username.
 */

import { PoolClient } from 'pg';

export interface RateLimitConfig {
    maxAttemptsPerIp: number;      // Max failed attempts per IP in the time window
    maxAttemptsPerUser: number;    // Max failed attempts per username in the time window
    windowMinutes: number;         // Time window in minutes to check attempts
}

export interface RateLimitResult {
    allowed: boolean;
    reason?: string;
    retryAfter?: number;           // Seconds until they can try again
}

/**
 * Get rate limit configuration from environment variables with defaults
 */
export function getRateLimitConfig(): RateLimitConfig {
    return {
        maxAttemptsPerIp: parseInt(process.env.LOGIN_MAX_ATTEMPTS_PER_IP || '10'),
        maxAttemptsPerUser: parseInt(process.env.LOGIN_MAX_ATTEMPTS_PER_USER || '5'),
        windowMinutes: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES || '15')
    };
}

/**
 * Check if a login attempt should be allowed based on recent failed attempts
 *
 * @param client Database client (must be within a transaction)
 * @param userName Username attempting to log in
 * @param clientIp IP address of the client
 * @returns RateLimitResult indicating if the attempt is allowed
 */
export async function checkLoginRateLimit(client: PoolClient, userName: string, clientIp: string): Promise<RateLimitResult> {
    const config = getRateLimitConfig();

    // Query for recent failed login attempts in the time window
    const windowStart = `NOW() - INTERVAL '${config.windowMinutes} minutes'`;

    // Check IP-based rate limit
    const ipQuery = `
        SELECT COUNT(*) as attempt_count,
               MAX(recorded_date_time) as last_attempt
        FROM audit_log
        WHERE category = 'access'
          AND action = 'failed log-in'
          AND metadata->>'ip' = $1
          AND recorded_date_time > ${windowStart}
    `;

    const ipResult = await client.query(ipQuery, [clientIp]);
    const ipAttempts = parseInt(ipResult.rows[0]?.attempt_count || '0');

    if (ipAttempts >= config.maxAttemptsPerIp) {
        const lastAttempt = new Date(ipResult.rows[0].last_attempt);
        const retryAfter = Math.ceil(
            (config.windowMinutes * 60 * 1000 - (Date.now() - lastAttempt.getTime())) / 1000
        );

        return {
            allowed: false,
            reason: `Too many failed login attempts from this IP address. Please try again later.`,
            retryAfter: Math.max(retryAfter, 0)
        };
    }

    // Check username-based rate limit
    const userQuery = `
        SELECT COUNT(*) as attempt_count,
               MAX(recorded_date_time) as last_attempt
        FROM audit_log
        WHERE category = 'access'
          AND action = 'failed log-in'
          AND user_name = $1
          AND recorded_date_time > ${windowStart}
    `;

    const userResult = await client.query(userQuery, [userName]);
    const userAttempts = parseInt(userResult.rows[0]?.attempt_count || '0');

    if (userAttempts >= config.maxAttemptsPerUser) {
        const lastAttempt = new Date(userResult.rows[0].last_attempt);
        const retryAfter = Math.ceil(
            (config.windowMinutes * 60 * 1000 - (Date.now() - lastAttempt.getTime())) / 1000
        );

        return {
            allowed: false,
            reason: `Too many failed login attempts for this account. Please try again later.`,
            retryAfter: Math.max(retryAfter, 0)
        };
    }

    // Rate limit check passed
    return {
        allowed: true
    };
}
