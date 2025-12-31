import { getUserPermissions } from '../cache/permission-cache';

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