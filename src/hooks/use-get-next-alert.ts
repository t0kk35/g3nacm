'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { GetNextResponse } from '@/app/api/action/get_next/types'

/**
 * Custom hook for handling the "Get Next Alert" operation.
 *
 * This hook encapsulates all business logic for fetching and assigning
 * the next available team alert to the current user.
 *
 * @returns {Object} Hook state and functions
 * @returns {Function} getNextAlert - Function to trigger the get next operation
 * @returns {boolean} isLoading - Whether the operation is in progress
 *
 * @example
 * const { getNextAlert, isLoading } = useGetNextAlert()
 *
 * <button onClick={getNextAlert} disabled={isLoading}>
 *   {isLoading ? 'Loading...' : 'Get Next Alert'}
 * </button>
 */
export function useGetNextAlert() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const getNextAlert = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/action/get_next', {
        method: 'POST'
      })

      if (!response.ok) {
        toast.error('Failed to get next alert')
        return
      }

      const data: GetNextResponse = await response.json()

      if (data.code === 0) {
        // Success
        toast.success('Alert assigned successfully')
        if (data.redirectUrl) {
          router.push(data.redirectUrl)
        }
      } else {
        // code 1 or 2 - show warning with API message
        toast.warning(data.message || 'No alerts available')
      }
    } catch (error) {
      // Network/unexpected errors
      console.error('Error getting next alert:', error)
      toast.error('An error occurred while getting the next alert')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  return { getNextAlert, isLoading }
}
