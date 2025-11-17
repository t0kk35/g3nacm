import { auth } from "@/auth";
import { ErrorCreators } from "@/lib/api-error-handling";
import { hasPermissions, hasAnyPermission } from "./core";

/**
 * Permission middleware that checks if the authenticated user has required permissions
 * @param origin - The API endpoint origin for error tracking
 * @param permissions - Array of required permissions
 * @returns Error response if unauthorized, null if authorized
 */
export async function requirePermissions(userName: string, origin: string, permissions: string[], requireAll = true) {

  try {
    // Check permissions
    const permissionsOk = requireAll 
      ? await hasPermissions(userName, permissions)
      : await hasAnyPermission(userName, permissions)    
    
    if (!permissionsOk) return ErrorCreators.perm.insufficientPermissions(origin, permissions) // Permission NOK
    return null; // Success - no error
  } catch (error) {
    return ErrorCreators.db.queryFailed(origin, 'Permission check', error as Error);
  }
}

/**
 * Get the authenticated user from session (after permission check)
 * @param origin - The API endpoint origin for error tracking
 * @returns User object or error response
 */
export async function getAuthenticatedUser(origin: string) {
  const session = await auth();
  if (!session) return { error: ErrorCreators.auth.missingSession(origin) };
  const user = session.user;
  if (!user?.name) return { error: ErrorCreators.auth.missingUser(origin) };
  
  return { user, error: null };
}