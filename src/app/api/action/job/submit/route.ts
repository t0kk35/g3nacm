'use server'

import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';
import { createJob } from '@/lib/jobs/producer';
import { JobRegistry } from '@/lib/jobs/registry';
import { JobPriority } from '@/lib/jobs/types';
import { hasPermissions } from '@/lib/permissions/core';
import { isOrgUnitAccessibleToUser } from '@/lib/org-filtering';
import '@/lib/jobs/index';

const origin = 'api/action/job/submit';

/* End point to register a Job run */
export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    const body = await request.json();
    
    if (!body.jobType) return ErrorCreators.param.bodyMissing(origin, 'jobType');
    if (!JobRegistry.has(body.jobType)) return ErrorCreators.job.unknownType(origin, body.jobType, JobRegistry.registeredTypes().join(', '))

    // Check if the user submitting has permission to submit the job
    const requiredPermission = JobRegistry.getRequiredPermission(body.jobType);
    if (requiredPermission) {
        const permitted = await hasPermissions(user.name, [requiredPermission]);
        if (!permitted) return ErrorCreators.perm.insufficientPermissions(origin, [requiredPermission]);
    }

    // Check if the user has access to the Org-unit they are submitting a job for
    const orgUnitCode: string | null = body.orgUnitCode ?? null;
    if (orgUnitCode) {
        const accessible = await isOrgUnitAccessibleToUser(user.name, orgUnitCode);
        if (!accessible) return ErrorCreators.perm.resourceAccessDenied(origin, `org_unit:${orgUnitCode}`);
    }

    const priority: JobPriority = body.priority ?? JobPriority.NORMAL;
    if (!Object.values(JobPriority).includes(priority)) return ErrorCreators.job.invalidPriority(origin, priority)

    try {
        const jobId = await createJob({
            jobType: body.jobType,
            payload: body.payload ?? {},
            userName: user.name,
            orgUnitCode,
            options: {
                priority,
                maxRetries: body.maxRetries,
                delayMs: body.delayMs,
            },
        });

        return NextResponse.json({ jobId });
    } catch (error) {
        console.error(`[${origin}] Failed to create job:`, error);
        return ErrorCreators.db.queryFailed(origin, 'create job', error as Error);
    }
}