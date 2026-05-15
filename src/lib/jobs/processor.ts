import * as db from '@/db';
import { JobContext, JobPriority } from './types';
import { JobRegistry } from './registry';
import { hasPermissions } from '@/lib/permissions/core';

export async function processJob(jobId: string): Promise<void> {
    const client = await db.pool.connect();
    try {
        // Atomically claim the job — only one worker wins for a given jobId
        const claim = await client.query<{
            job_type: string;
            priority: number;
            payload: Record<string, unknown>;
            user_name: string;
            org_unit_code: string | null;
        }>(
            `UPDATE job
             SET status = 'running', start_datetime = NOW()
             WHERE id = $1 AND status = 'pending'
             RETURNING job_type, priority, payload, user_name, org_unit_code`,
            [jobId]
        );

        if (claim.rows.length === 0) {
            // Already running or completed — idempotent, not an error
            return;
        }

        const row = claim.rows[0];
        const ctx: JobContext = {
            jobId,
            jobType: row.job_type,
            priority: row.priority as JobPriority,
            payload: row.payload,
            userName: row.user_name,
            orgUnitCode: row.org_unit_code,
        };

        const requiredPermission = JobRegistry.getRequiredPermission(ctx.jobType);
        if (requiredPermission) {
            const permitted = await hasPermissions(ctx.userName, [requiredPermission]);
            if (!permitted) {
                await client.query(
                    `UPDATE job SET status = 'failed', error_message = $2, complete_datetime = NOW(),
                     retry_count = retry_count + 1 WHERE id = $1`,
                    [jobId, `Permission denied: user '${ctx.userName}' does not hold required permission '${requiredPermission}'`]
                );
                return;
            }
        }

        const handler = JobRegistry.get(ctx.jobType);
        const result = await handler(ctx);

        if (result.success) {
            await client.query(
                `UPDATE job SET status = 'completed', result = $2, complete_datetime = NOW() WHERE id = $1`,
                [jobId, JSON.stringify(result.data ?? null)]
            );
        } else {
            await client.query(
                `UPDATE job
                 SET status = 'failed', error_message = $2, completed_datetime = NOW(),
                     retry_count = retry_count + 1
                 WHERE id = $1`,
                [jobId, result.errorMessage ?? 'Handler returned success: false']
            );
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[jobs] Error processing job ${jobId}:`, message);
        try {
            await client.query(
                `UPDATE job
                 SET status = 'failed', error_message = $2, complete_datetime = NOW(),
                     retry_count = retry_count + 1
                 WHERE id = $1`,
                [jobId, message]
            );
        } catch (updateErr) {
            console.error(`[jobs] Failed to mark job ${jobId} as failed:`, updateErr);
        }
    } finally {
        client.release();
    }
}