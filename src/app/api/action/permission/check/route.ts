'use server'

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { ErrorCreators } from '@/lib/api-error-handling';
import { hasPermissions, hasAnyPermission } from "@/lib/permissions/core"

const origin = 'api/action/permission/check'

/**
 * Permission check API to call from client components via the permission guard and hook
 * @param request A list of permissions to check + the require all flag.
 * @returns JSON object with { hasPermission: true/false }
 */
export async function POST(request: NextRequest) {
    
    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    const { permissions, requireAll = true } = await request.json()

    if (!permissions) return ErrorCreators.param.urlMissing(origin, 'permissions');
    if (!Array.isArray(permissions)) return ErrorCreators.param.typeInvalid(origin, 'permissions', 'Array', 'Unknown')

    try {
      const hasRequiredPermissions = requireAll 
        ? await hasPermissions(user.name, permissions)
        : await hasAnyPermission(user.name, permissions)
      return NextResponse.json({ hasPermission: hasRequiredPermissions })
    } catch (error) {
      console.error('Permission check API error:', error)
      // This will 95% of the time be a DB error from the cache.
      return ErrorCreators.db.queryFailed(origin, 'Check Permission', error as Error);
    }
}