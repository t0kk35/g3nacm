'use client'

import { useEffect, useState } from 'react'

interface PermissionState {
  hasPermission: boolean
  loading: boolean
  error: string | null
}

/**
 * Client-side hook for checking permissions in client components
 * Makes API call to check permissions endpoint
 * 
 * @param permissions - Array of required permissions
 * @param requireAll - If true, user must have ALL permissions. If false, user needs ANY permission (default: true)
 * @returns Object with hasPermission, loading, and error state
 */
export function usePermissions(permissions: string[], requireAll: boolean = true): PermissionState {
  const [state, setState] = useState<PermissionState>({
    hasPermission: false,
    loading: true,
    error: null
  })

  useEffect(() => {
    const checkPermissions = async () => {
      if (permissions.length === 0) {
        setState({ hasPermission: true, loading: false, error: null })
        return
      }

      try {
        const response = await fetch('/api/permissions/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ permissions, requireAll })
        })

        if (!response.ok) {
          throw new Error(`Permission check failed: ${response.status}`)
        }

        const result = await response.json()
        setState({ 
          hasPermission: result.hasPermission, 
          loading: false, 
          error: null 
        })
      } catch (error) {
        setState({ 
          hasPermission: false, 
          loading: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    checkPermissions()
  }, [permissions, requireAll])

  return state
}