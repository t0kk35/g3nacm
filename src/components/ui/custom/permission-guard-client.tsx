'use client'

import { ReactNode } from 'react'
import { usePermissions } from '@/hooks/usePermissions'

type Props = {
  permissions: string[]
  children: ReactNode
  fallback?: ReactNode
  loadingFallback?: ReactNode
  errorFallback?: ReactNode
  requireAll?: boolean
}

/**
 * Client-side permission guard component that conditionally renders children
 * based on user permissions. Use this in client components.
 * 
 * @param permissions - Array of required permissions
 * @param children - Content to render if user has permissions
 * @param fallback - Optional content to render if user lacks permissions
 * @param loadingFallback - Optional content to render while checking permissions
 * @param errorFallback - Optional content to render if permission check fails
 * @param requireAll - If true, user must have ALL permissions. If false, user needs ANY permission (default: true)
 */
export function PermissionGuardClient({ permissions, children, fallback = null, loadingFallback = null, errorFallback = null, requireAll = true }: Props) {
  const { hasPermission, loading, error } = usePermissions(permissions, requireAll)

  if (loading) {
    return loadingFallback
  }

  if (error) {
    console.error('Permission check error:', error)
    return errorFallback || fallback
  }

  return hasPermission ? children : fallback
}