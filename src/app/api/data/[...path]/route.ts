'use server'

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermissions } from '@/lib/permissions/core';
import { getQueryRegistry } from '@/lib/data/registry';
import { ErrorCreators } from '@/lib/api-error-handling';
import { DataNotFoundError, DataNotUniqueError, DataQueryError } from '@/lib/data/errors';
import '@/lib/data/index';

// Main Data Entry point, this catches all requests for business data and forwards it the to 
// appropriate entry in the data registry
export async function GET(request: NextRequest,{ params }: { params: Promise<{ path: string[] }> }) {
    const { path: pathSegments } = await params;
    const path = pathSegments.join('/');
    const origin = `api/data/${path}`;

    const def = getQueryRegistry().get(path);
    if (!def) return NextResponse.json({ error: `No query registered for path: ${path}` }, { status: 404 });

    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    if (def.permissions?.length) {
        const ok = await hasPermissions(user.name, def.permissions);
        if (!ok) return ErrorCreators.perm.insufficientPermissions(origin, def.permissions);
    }

    const rawParams: Record<string, string> = {};
    request.nextUrl.searchParams.forEach((v, k) => { rawParams[k] = v; });

    const parsed = def.params.safeParse(rawParams);
    if (!parsed.success) {
        const field = parsed.error.errors[0]?.path.join('.') ?? 'unknown';
        return ErrorCreators.param.urlMissing(origin, field);
    }

    try {
        const result = await def.execute(parsed.data, { userName: user.name });
        return NextResponse.json(result);
    } catch (err) {
        if (err instanceof DataNotFoundError)
            return ErrorCreators.db.entityNotFound(origin, err.entity, err.id);
        if (err instanceof DataNotUniqueError)
            return ErrorCreators.db.entityNotUnique(origin, err.entity, err.id);
        if (err instanceof DataQueryError)
            return ErrorCreators.db.queryFailed(origin, path, (err.cause ?? err) as Error);
        return ErrorCreators.db.queryFailed(origin, path, err as Error);
    }
}