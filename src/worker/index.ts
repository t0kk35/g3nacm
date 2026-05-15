/**
 * Redis worker for jobs. This is an batch job option for non-cloud deployments or for test purposes.
 * Make sure to have a redis deployment for this and set up a redis and set following parameters in the .env.worker
 *
 * # JOB set-up
 * JOB_QUEUE_PROVIDER=bullmq
 * JOB_WORKER_SECRET=<SET_A_WORKER_SECRET>
 * REDIS_HOST=localhost
 * REDIS_PORT=6379
 */

import './env'; // must be first — loads .env.local before @/db pool initializes
import '@/lib/jobs/index';
import { Worker, UnrecoverableError } from 'bullmq';
import Redis from 'ioredis';
import { processJob } from '@/lib/jobs/processor';
import { JobPriority, PRIORITY_QUEUE_NAMES } from '@/lib/jobs/types';

function makeRedis(): Redis {
    return new Redis({
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
    });
}

const tiers: Array<{ priority: JobPriority; concurrency: number }> = [
    { priority: JobPriority.HIGH,       concurrency: parseInt(process.env.JOB_WORKER_CONCURRENCY_HIGH       ?? '5') },
    { priority: JobPriority.NORMAL,     concurrency: parseInt(process.env.JOB_WORKER_CONCURRENCY_NORMAL     ?? '3') },
    { priority: JobPriority.LOW,        concurrency: parseInt(process.env.JOB_WORKER_CONCURRENCY_LOW        ?? '2') },
    { priority: JobPriority.BACKGROUND, concurrency: parseInt(process.env.JOB_WORKER_CONCURRENCY_BACKGROUND ?? '1') },
];

const workers = tiers.map(({ priority, concurrency }) => {
    const queueName = PRIORITY_QUEUE_NAMES[priority];
    const worker = new Worker(
        queueName,
        async (job) => {
            const jobId: string = job.data.jobId;
            if (!jobId) throw new UnrecoverableError(`BullMQ job ${job.id} has no jobId in data`);
            await processJob(jobId);
        },
        { connection: makeRedis(), concurrency }
    );

    worker.on('completed', (job) => console.log(`[${queueName}] completed job ${job.data.jobId}`));
    worker.on('failed', (job, err) => console.error(`[${queueName}] failed job ${job?.data.jobId}:`, err.message));
    worker.on('error', (err) => console.error(`[${queueName}] worker error:`, err.message));

    return worker;
});

console.log(`[worker] started ${workers.length} queue workers`);

// Prevent a single job's leaked async error from killing all queues.
process.on('uncaughtException', (err) => {
    console.error('[worker] uncaughtException (job isolated, worker continuing):', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('[worker] unhandledRejection (job isolated, worker continuing):', reason);
});

async function shutdown() {
    console.log('[worker] shutting down...');
    await Promise.all(workers.map(w => w.close()));
    process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
