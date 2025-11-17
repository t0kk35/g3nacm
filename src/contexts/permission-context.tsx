'use client'

import { createContext, useContext, ReactNode } from 'react'

interface PermissionContextValue {
  userName: string
  permissions: string[]
  hasPermission: (permission: string) => boolean
  hasPermissions: (permissions: string[], requireAll?: boolean) => boolean
}

const PermissionContext = createContext<PermissionContextValue | null>(null)

interface PermissionProviderProps {
  children: ReactNode
  userName: string
  permissions: string[]
}

/**
 * Permission context provider - pass user permissions down to avoid repeated API calls
 * Use this at the page/layout level to provide permissions to child components
 */
export function PermissionProvider({ children, userName, permissions }: PermissionProviderProps) {
  const value: PermissionContextValue = {
    userName,
    permissions,
    hasPermission: (permission: string) => permissions.includes(permission),
    hasPermissions: (requiredPermissions: string[], requireAll = true) => {
      if (requireAll) {
        return requiredPermissions.every(p => permissions.includes(p))
      } else {
        return requiredPermissions.some(p => permissions.includes(p))
      }
    }
  }

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  )
}

/**
 * Hook to access permission context
 */
export function usePermissionContext() {
  const context = useContext(PermissionContext)
  if (!context) {
    throw new Error('usePermissionContext must be used within a PermissionProvider')
  }
  return context
}

/**
 * Client component that uses permission context (no API calls needed)
 */
interface PermissionGuardContextProps {
  permissions: string[]
  children: ReactNode
  fallback?: ReactNode
  requireAll?: boolean
}

export function PermissionGuardContext({ 
  permissions, 
  children, 
  fallback = null,
  requireAll = true 
}: PermissionGuardContextProps) {
  const { hasPermissions } = usePermissionContext()
  
  const hasRequiredPermissions = hasPermissions(permissions, requireAll)
  return hasRequiredPermissions ? children : fallback
}