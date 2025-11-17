'use client'

import { useEffect, useState } from 'react'
import { CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, TrendingDown, RefreshCw, AlertTriangle } from 'lucide-react'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { UserHandled } from '@/app/api/data/user/user'

interface AlertHandledChartWidgetProps {
  timeRange?: '24h' | '7d' | '30d' | '90d' | '6w' | '12w' | '6m' 
  title?: string
  refreshInterval?: number
}

export function AlertHandledChartWidget({
  timeRange = '7d',
  title = 'Alerts Handled',
  refreshInterval = 300000 // 5 minutes
}: AlertHandledChartWidgetProps) {

  const [data, setData] = useState<UserHandled | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/data/user/entities_handled?time_range=${selectedTimeRange}`)
      if (!response.ok) throw new Error(`Failed to fetch alert handled: ${response.status}`)
      const data = await response.json();
      setData(data);
      setLastRefresh(new Date());  
    } catch (err) {
      setError('Failed to load alert handled data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [selectedTimeRange, refreshInterval])

  const getTimeRangeLabels = () => {
    const labels = [
      { key: '24h', value: 'Last 24 Hours' },
      { key: '7d', value: 'Last 7 Days' },
      { key: '30d', value: 'Last 30 Days' },
      { key: '90d', value: 'Last 90 Days' },
      { key: '6w', value: 'Last 6 Weeks' },
      { key: '12w', value: 'Last 12 Weeks' },
      { key: '6m', value: 'Last 6 Months' }
    ]
    return labels
  }

  const calculateTrend = () => {
    if (!data) return undefined
    if (data.alerts.length < 2) return undefined
    
    const recent = data.alerts.slice(-3).reduce((sum, d) => sum + d.count, 0) / 3
    const previous = data.alerts.slice(-6, -3).reduce((sum, d) => sum + d.count, 0) / 3
    
    if (previous === 0) return undefined
    const change = ((recent - previous) / previous) * 100
    return {
      direction: change > 0 ? 'up' : 'down',
      percentage: Math.abs(change).toFixed(1)
    }
  }

  const trend = calculateTrend()

  const chartConfig:ChartConfig = {
    count: {
      label: 'Count',
      color: 'var(--chart-1)'
    }   
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
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </>
    )
  }

  return (
    <>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          
          { /* Trend indicator */ }
          {trend && (
            <Badge variant="outline" className="text-xs">
              {trend.direction === 'up' ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 " />
              )}
              {trend.percentage}%
            </Badge>
          )}

          { /* Time Range selector */ }
          <div className="flex items-center space-x-2">
            <Select value={selectedTimeRange} onValueChange={(value: any) => setSelectedTimeRange(value)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                { getTimeRangeLabels().map((l, i) => {
                    return <SelectItem key={i} value={l.key}>{l.value}</SelectItem>
                  })}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchData}
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
        {!data ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Chart */}
            <div className="h-56">
              <ChartContainer config={chartConfig} className='aspect-auto h-[220px] w-full'>
                <BarChart accessibilityLayer data={data?.alerts}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey='period' />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey='count' fill={`var(--color-count)`} />
                </BarChart>
              </ChartContainer>
            </div>
            
            {/* Summary */}
            <div className='flex flex-col gap-1 items-center'>
              <div className="text-xs text-muted-foreground">Total Alert Count</div>
              <div className="text-sm font-bold">
                {data.alerts.length > 0 ? data.alerts.reduce((sum,d) => sum + d.count, 0).toLocaleString() : '0'}
              </div>
            </div>
          </div>  
        )}

        <Separator className="mt-4" />
        <div className="mt-4 text-xs text-muted-foreground text-center">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>    
      
      </CardContent>
    </>
  )
}