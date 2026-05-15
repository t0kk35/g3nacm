import * as db from '@/db';
import { CreateJobParams, JobPriority } from './types';
import { getQueueAdapter } from './queue';

export async function createJob(params: CreateJobParams): Promise<string> {
    const { jobType, payload, userName, orgUnitCode, options } = params;
    const priority = options?.priority ?? JobPriority.NORMAL;
    const maxRetries = options?.maxRetries ?? 3;

    const client = await db.pool.connect();
    try {
        const insert = await client.query<{ id: string }>(
            `INSERT INTO job (job_type, priority, payload, user_name, org_unit_code, max_retries)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [jobType, priority, JSON.stringify(payload), userName, orgUnitCode ?? null, maxRetries]
        );

        const jobId: string = insert.rows[0].id;

        const adapter = getQueueAdapter();
        const queueJobId = await adapter.enqueue(jobId, jobType, options);

        await client.query(
            `UPDATE job SET queue_job_id = $2 WHERE id = $1`,
            [jobId, queueJobId]
        );

        return jobId;
    } finally {
        client.release();
    }
}
