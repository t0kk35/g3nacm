'use client'

import { useEffect, useState } from 'react'
import { CardHeader, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { UserHandled } from '@/app/api/data/user/user'
import { DynamicScreenError } from '../DynamicScreenError'
import { ChartTrendIndicator } from './helpers/ChartTrendIndicator'
import { TimeRangeSelector } from './helpers/TimeRangeSelector'

const HEADER_SIZE = 60;
const SUMMARY_SIZE = 45;
const FOOTER_SIZE = 40;

interface AlertHandledChartWidgetProps {
  timeRange?: '24h' | '7d' | '30d' | '90d' | '6w' | '12w' | '6m' 
  title?: string
  refreshInterval?: number
  width: number
  height: number
}

export function AlertHandledChartWidget({
  timeRange = '7d',
  title = 'Alerts Handled',
  refreshInterval = 300000, // 5 minutes
  width,
  height
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

  const options = [
    { key: '24h', value: 'Last 24 Hours' },
    { key: '7d', value: 'Last 7 Days' },
    { key: '30d', value: 'Last 30 Days' },
    { key: '90d', value: 'Last 90 Days' },
    { key: '6w', value: 'Last 6 Weeks' },
    { key: '12w', value: 'Last 12 Weeks' },
    { key: '6m', value: 'Last 6 Months' }
  ] as const
  
  // Calculate the available height for the chart
  const chartHeight = height - HEADER_SIZE - SUMMARY_SIZE - FOOTER_SIZE;

  const chartConfig:ChartConfig = {
    count: {
      label: 'Count',
      color: 'var(--chart-1)'
    }   
  }

  if (error) return <DynamicScreenError title={title} error={error} onClick={fetchData} />

  return (
    <div className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>

          { /* Trend indicator */ } 
          <ChartTrendIndicator data={data?.alerts.map(a => a.count)} />
          
          { /* Time Range selector */ }
          <TimeRangeSelector
            value={selectedTimeRange}
            onChange={setSelectedTimeRange}
            options={options}
            onRefresh={fetchData}
            loading={loading}
          />
        </div>
        
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        {!data ? (
          <div style={{ height: `${chartHeight}px` }} className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Chart */}
            <div style={{ height: `${chartHeight}px` }}>
              <ChartContainer config={chartConfig} className='aspect-auto w-full h-full'>
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
    </div>
  )
}