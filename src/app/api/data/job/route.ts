'use server'

import { auth } from '@/auth';
import * as db from '@/db';
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';
import { requirePermissions } from '@/lib/permissions/check';

const origin = 'api/data/job';

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    const { searchParams } = new URL(request.url);
    const status    = searchParams.get('status');
    const jobType   = searchParams.get('jobType');
    const limit     = Math.min(parseInt(searchParams.get('limit')  ?? '50'), 200);
    const offset    = parseInt(searchParams.get('offset') ?? '0');

    // Admin users can see all jobs; regular users only see their own
    const isAdmin = !(await requirePermissions(user.name, origin, ['admin.jobs']));
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (!isAdmin) {
        conditions.push(`user_name = $${idx++}`);
        params.push(user.name);
    }
    if (status) {
        conditions.push(`status = $${idx++}`);
        params.push(status);
    }
    if (jobType) {
        conditions.push(`job_type = $${idx++}`);
        params.push(jobType);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit, offset);
    const limitIdx  = idx++;
    const offsetIdx = idx;

    const query = `
        SELECT id, job_type, status, priority, user_name, org_unit_code,
               create_datetime, start_datetime, completed_at, retry_count, max_retries,
               result, error_message
        FROM job
        ${where}
        ORDER BY create_datetime DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    try {
        const result = await db.pool.query(query, params);
        return NextResponse.json({ jobs: result.rows });
    } catch (error) {
        return ErrorCreators.db.queryFailed(origin, 'list jobs', error as Error);
    }
}
