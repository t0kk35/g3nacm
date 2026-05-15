'use server'

import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';
import { processJob } from '@/lib/jobs/processor';
import '@/lib/jobs/index';

const origin = 'api/worker/process';

export async function POST(request: NextRequest) {
    // Verify shared secret — this endpoint is called by cloud queue providers, not browsers
    const authHeader = request.headers.get('Authorization');
    const workerSecret = process.env.JOB_WORKER_SECRET;

    if (!workerSecret) return ErrorCreators.job.workerSecretMissing(origin);
    if (!authHeader || authHeader !== `Bearer ${workerSecret}`) return ErrorCreators.auth.failedBearerCheck(origin);

    const body = await request.json();
    if (!body.jobId) return ErrorCreators.param.bodyMissing(origin, 'jobId');

    try {
        await processJob(body.jobId);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(`[worker/process] Failed to process job ${body.jobId}:`, error);
        // Return 500 so the queue provider retries the message
        return ErrorCreators.job.error(origin, body.jobId, error as Error);
    }
}