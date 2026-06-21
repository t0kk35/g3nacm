'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseWidgetDataResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  lastRefresh: Date
  refresh: () => Promise<void>
}

/**
 * Fetches JSON from `url` on mount, on interval, and whenever `url` changes.
 * Pass `onUnauthorized` to handle 401 responses (e.g. redirect to login).
 */
export function useWidgetData<T>(
  url: string,
  refreshInterval: number,
  onUnauthorized?: () => void,
): UseWidgetDataResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Keep a stable ref so the callback doesn't need to re-register on every render.
  const onUnauthorizedRef = useRef(onUnauthorized)
  useEffect(() => { onUnauthorizedRef.current = onUnauthorized }, [onUnauthorized])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(url)
      if (response.status === 401) {
        onUnauthorizedRef.current?.()
        return
      }
      if (!response.ok) throw new Error(`Failed to fetch data: ${response.status}`)
      const json: T = await response.json()
      setData(json)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchData, refreshInterval])


  return { data, loading, error, lastRefresh, refresh: fetchData}
}
