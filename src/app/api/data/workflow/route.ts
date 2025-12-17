'use server'

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server"
import { getCachedWorkflowConfig } from "@/lib/cache/workflow-cache";
import { ErrorCreators } from "@/lib/api-error-handling";

const origin = 'api/data/workflow';

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";

    // Check User
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    // Get the URL params. Throw errors if we can't find the mandatory ones.
    const searchParams = request.nextUrl.searchParams;
    const org_unit_code = searchParams.get("org_unit_code")
    if (!org_unit_code) return ErrorCreators.param.urlMissing(origin, "org_unit_code");
    const entity_code = searchParams.get("entity_code")
    if (!entity_code) return ErrorCreators.param.urlMissing(origin, "entity_code");
    
    // Get the workflow from the cache.
    if (!useMockData) {
        try {
          const res = await getCachedWorkflowConfig(entity_code, org_unit_code);
          return NextResponse.json(res);
        } catch (error) {
          return ErrorCreators.workflow.cacheError(origin, error as Error);
        }
  }
}