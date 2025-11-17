'use client'

import { useEffect, useState } from 'react'
import { CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AlertTriangle, Users, Clock, TrendingUp, RefreshCw } from 'lucide-react'
import { getTypeIcon } from '@/components/alert/AlertTypeIcon'
import Link from 'next/link'

interface AlertSummaryWidgetProps {
  timeRange?: '1h' | '24h' | '7d' | '30d' | '90d'
  showCharts?: boolean
  title?: string
  refreshInterval?: number
}

interface AlertSummary {
  total_alerts: number
  by_type: { [key: string]: number }
  by_status: { [key: string]: number }
  assigned_to_me: number
  unassigned: number
  recent_activity: {
    id: string
    alert_identifier: string
    alert_type: string
    description: string
    create_date_time: string
    entity_state: string
  }[]
  trends: {
    period: string
    counts: { date: string; count: number }[]
  }
}

export function AlertSummaryWidget({
  timeRange = '24h',
  showCharts = true,
  title = 'Alert Summary',
  refreshInterval = 300000 // 5 minutes
}: AlertSummaryWidgetProps) {
  const [summary, setSummary] = useState<AlertSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchSummary = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/data/alert/summary?timeRange=${timeRange}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch alert summary: ${response.status}`)
      }

      const data = await response.json()
      setSummary(data)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alert summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
    
    const interval = setInterval(fetchSummary, refreshInterval)
    return () => clearInterval(interval)
  }, [timeRange, refreshInterval])

  const getTimeRangeLabel = (range: string) => {
    const labels: { [key: string]: string } = {
      '1h': 'Last Hour',
      '24h': 'Last 24 Hours',
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days',
      '90d': 'Last 90 Days'
    }
    return labels[range] || 'Custom Period'
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'new': 'bg-blue-100 text-blue-800',
      'assigned': 'bg-yellow-100 text-yellow-800',
      'investigating': 'bg-orange-100 text-orange-800',
      'resolved': 'bg-green-100 text-green-800',
      'closed': 'bg-gray-100 text-gray-800'
    }
    return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800'
  }

  if (loading && !summary) {
    return <div className="animate-pulse">Loading...</div>
  }

  if (error) {
    return (
      <>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-destructive">{title} - Error</h3>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchSummary} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </>
    )
  }

  if (!summary) {
    return null
  }

  return (
    <>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {getTimeRangeLabel(timeRange)}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchSummary}
              disabled={loading}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{summary.total_alerts}</div>
              <div className="text-xs text-muted-foreground">Total Alerts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{summary.assigned_to_me}</div>
              <div className="text-xs text-muted-foreground">Assigned to Me</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{summary.unassigned}</div>
              <div className="text-xs text-muted-foreground">Unassigned</div>
            </div>
          </div>

          {/* Alert Types */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              By Type
            </h4>
            <div className="space-y-2">
              {Object.entries(summary.by_type).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(type)}
                    <span>{type}</span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Status Breakdown */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              By Status
            </h4>
            <div className="space-y-2">
              {Object.entries(summary.by_status).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{status}</span>
                  <Badge className={getStatusColor(status)}>{count}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Recent Activity
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {summary.recent_activity.slice(0, 3).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between text-xs p-2 bg-accent/10 rounded">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(alert.alert_type)}
                    <Link href={`/alert/${alert.id}`} className="hover:underline font-medium">
                      {alert.alert_identifier}
                    </Link>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {alert.entity_state}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Trend Indicator */}
          {showCharts && summary.trends.counts.length > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Trend
              </span>
              <div className="flex items-center space-x-1">
                {summary.trends.counts.slice(-7).map((point, index) => (
                  <div
                    key={index}
                    className="w-1 bg-primary rounded-full"
                    style={{ height: `${Math.max(4, (point.count / Math.max(...summary.trends.counts.map(c => c.count))) * 16)}px` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/alert">View All</Link>
            </Button>
          </div>

          {/* Last Updated */}
          <div className="text-xs text-muted-foreground text-center">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
      </CardContent>
    </>
  )
}