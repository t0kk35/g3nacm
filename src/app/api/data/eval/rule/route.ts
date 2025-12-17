'use server'

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { getCachedEvalEngineRuleConfig } from "@/lib/cache/eval-engine-rule-cache";
import { ErrorCreators } from '@/lib/api-error-handling';

const origin = 'api/data/eval/rule'

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";
    // Check user
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    
    // Get the URL params. Throw errors if we can't find the mandatory ones.
    const searchParams = request.nextUrl.searchParams;
    const group = searchParams.get('group');
    if (!group) return ErrorCreators.param.urlMissing(origin, "group");

    // Get from the cache.
    if (!useMockData) {
        try {
            const rules = await getCachedEvalEngineRuleConfig(group)
            return NextResponse.json(rules);
        } catch (error) {
            return ErrorCreators.rule.cacheError(origin, error as Error);
        }
    }
}