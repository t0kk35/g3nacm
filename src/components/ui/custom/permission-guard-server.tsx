'use server'

import { auth } from "@/auth"
import { hasPermissions, hasAnyPermission } from "@/lib/permissions/core"
import { ReactNode } from "react"

type Props = {
  permissions: string[]
  children: ReactNode
  fallback?: ReactNode
  requireAll?: boolean
  userName: string | undefined | null // Optional - pass this to skip auth() call
}

/**
 * Optimized server-side permission guard that accepts userName to avoid repeated auth() calls
 * 
 * @param permissions - Array of required permissions
 * @param children - Content to render if user has permissions
 * @param fallback - Optional content to render if user lacks permissions
 * @param requireAll - If true, user must have ALL permissions. If false, user needs ANY permission (default: true)
 * @param userName - Optional userName to skip auth() call - use when you already have the user
 */
export async function PermissionGuard({ permissions, children, fallback = null, requireAll = true, userName }: Props) {
  let userNameToCheck = userName
  
  // Only call auth() if userName not provided
  if (!userNameToCheck) {
    const session = await auth()
    if (!session?.user?.name) {
      return fallback
    }
    userNameToCheck = session.user.name
  }

  try {
    const hasRequiredPermissions = requireAll 
      ? await hasPermissions(userNameToCheck, permissions)
      : await hasAnyPermission(userNameToCheck, permissions)

    return hasRequiredPermissions ? children : fallback
  } catch (error) {
    console.error('Permission check failed:', error)
    return fallback
  }
}