import { pool } from '@/db';

interface UserPermissionCache {
  [userName: string]: {
    permissions: string[];
    expires: number;
  };
}

const permissionCache: UserPermissionCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const query_text = `
  SELECT DISTINCT up.permission as permission
  FROM users u
  JOIN user_role_link url ON u.id = url.user_id
  JOIN user_role_permission_link urpl ON url.role_id = urpl.role_id
  JOIN user_permission up ON urpl.permission_id = up.id
  WHERE u.name = $1 AND u.deleted = false
`

/**
 * Get all permissions for a user from their assigned roles
 * @param userName - The username to get permissions for
 * @returns Array of permission strings
 */
export async function getUserPermissions(userName: string): Promise<string[]> {
  // Check cache first
  const cached = permissionCache[userName];
  if (cached && Date.now() < cached.expires) {
    return cached.permissions;
  }
  
  try {
    // Query database for user permissions via roles
    const query = {
      name: 'lib/core/permission/cache',
      text: query_text,
      values:[userName]
    };
    const result = await pool.query(query);
    const permissions = result.rows.map(row => row.permission);
    
    // Cache the result
    permissionCache[userName] = {
      permissions,
      expires: Date.now() + CACHE_TTL
    };
    
    return permissions;
  } catch (error) {
    console.error('Failed to fetch user permissions:', error);
    // Fail closed - return empty permissions on error
    return [];
  }
}

/**
 * Check if a user has specific permissions
 * @param userName - The username to check
 * @param requiredPermissions - Array of required permissions
 * @returns True if user has all required permissions
 */
export async function hasPermissions(userName: string, requiredPermissions: string[]): Promise<boolean> {
  const userPermissions = await getUserPermissions(userName);
  return requiredPermissions.every(permission => userPermissions.includes(permission));
}

/**
 * Check if a user has any of the specified permissions
 * @param userName - The username to check
 * @param permissions - Array of permissions to check
 * @returns True if user has at least one of the permissions
 */
export async function hasAnyPermission(userName: string, permissions: string[]): Promise<boolean> {
  const userPermissions = await getUserPermissions(userName);
  return permissions.some(permission => userPermissions.includes(permission));
}

/**
 * Clear permission cache for a specific user or all users
 * @param userName - Optional specific user to clear, if not provided clears all
 */
export function clearPermissionCache(userName?: string) {
  if (userName) {
    delete permissionCache[userName];
  } else {
    Object.keys(permissionCache).forEach(key => delete permissionCache[key]);
  }
}