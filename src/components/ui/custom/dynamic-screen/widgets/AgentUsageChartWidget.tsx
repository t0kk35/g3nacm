'use client'

import { useEffect, useState } from 'react'
import { CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw } from 'lucide-react'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { AgentUsage } from '@/app/api/data/agent/types'
import { DynamicScreenError } from '../DynamicScreenError'
import { ChartTrendIndicator } from './helpers/ChartTrendIndicator'
import { uniqueBy } from '@/lib/json'

const HEADER_SIZE = 60;
const SUMMARY_SIZE = 45;
const FOOTER_SIZE = 40;

interface AgentUsageChartWidgetProps {
  timeRange?: '24h' | '7d' | '30d' | '90d' | '6w' | '12w' | '6m'
  title?: string
  refreshInterval?: number
  width: number
  height: number
}

export function AgentUsageChartWidget({
  timeRange = '7d',
  title = 'Alerts Handled',
  refreshInterval = 300000, // 5 minutes
  width,
  height
}: AgentUsageChartWidgetProps) {
  
  const [data, setData] = useState<AgentUsage[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/data/agent/usage?time_range=${selectedTimeRange}`)
      if (!response.ok) throw new Error(`Failed to fetch alert handled: ${response.status}`)
      const data:AgentUsage[] = await response.json();
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

  // Calculate the available height for the chart
  const chartHeight = height - HEADER_SIZE - SUMMARY_SIZE - FOOTER_SIZE;

  // Set-up the chart config. Make sure we have a config object per each agent in the original data
  const agents = data ? uniqueBy(data, "agent_code") : []
  const chartConfig: ChartConfig = agents.reduce((acc, agent, index) => {
    acc[agent] = {
      label: agent,
      color: `var(--chart-${index + 1})`
    };
    return acc;
  }, {} as ChartConfig);

  // Remap the input data a little bit. We need to get it into a format rechart likes.
  // Get Unique periods
  const periods = data ? uniqueBy(data, "period").sort() : []
  const costLookup = new Map<string, Map<string, number>>();

  // Build a look-up table
  for (const item of data ? data : []) {
    if (!item.agent_code) continue;

    if (!costLookup.has(item.period)) costLookup.set(item.period, new Map());
    
    costLookup
      .get(item.period)!
      .set(item.agent_code, item.total_token_cost);
  }

  // Build Normalize Recharts data.
  const chartData = periods.map(period => {
    const row: Record<string, string | number> = { period };
    for (const agent of agents) {
      row[agent] =
        costLookup.get(period)?.get(agent) ?? 0;
    }
    return row;
  });

  if (error) return <DynamicScreenError title={title} error={error} onClick={fetchData} />

  return (
    <div className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>

          { /* Trend indicator */ }
          <ChartTrendIndicator data={data?.map(d => d.total_token_cost)} />
          
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
      <CardContent className="pt-4 pb-2">
        {!data ? (
          <div style={{ height: `${chartHeight}px` }} className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Chart */}
            <div style={{ height: `${chartHeight}px` }}>
              <ChartContainer config={chartConfig} className='aspect-auto w-full h-full'>
                <BarChart accessibilityLayer data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey='period' />
                  <YAxis/>
                  <ChartTooltip content={<ChartTooltipContent className="min-w-[200px]" labelClassName="mb-1" />} />
                  {agents.map(a => (
                    <Bar
                      key={a}
                      dataKey={`${a}`}
                      fill={`var(--color-${a})`}
                      stackId="a"
                    />
                  ))}
                </BarChart>
              </ChartContainer>
            </div>

            {/* Summary */}
            <div className='flex flex-col gap-1 items-center'>
              <div className="text-xs text-muted-foreground">Total Token Cost</div>
              <div className="text-sm font-bold">
                {chartData.length > 0 ? data.reduce((sum,d) => sum + d.total_token_cost, 0).toLocaleString() : '0'}
              </div>
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground text-center mt-2 pt-2 border-t">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>

      </CardContent>
    </div>
  )
}