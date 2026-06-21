'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWidgetData } from './helpers/useWidgetData'
import { CardHeader, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { AgentUsage } from '@/lib/data/queries/agent/types'
import { DynamicScreenError } from '../DynamicScreenError'
import { ChartTrendIndicator } from './helpers/ChartTrendIndicator'
import { TimeRangeSelector } from './helpers/TimeRangeSelector'
import { uniqueBy } from '@/lib/json'
import { useTranslations } from 'next-intl'
import { useFormatter } from "next-intl"

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
  
  const t = useTranslations('DynamicScreen.Widgets.AlertUsageChart')  
  const tc = useTranslations('Common')
  const format = useFormatter();
  const router = useRouter();

  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange)

  const { data: data, loading, error, lastRefresh, refresh: fetchData } = useWidgetData<AgentUsage[]>(
    `/api/data/agent/usage?time_range=${selectedTimeRange}`,
    refreshInterval,
    () => router.push('/'),
  )

  const options = [
    { key: '24h', value: tc('dateTimeLast24Hours') },
    { key: '7d', value: tc('dateTimeLast7Days')},
    { key: '30d', value: tc('dateTimeLast30Days')},
    { key: '90d', value: tc('dateTimeLast90Days')},
    { key: '6w', value: tc('dateTimeLast6Weeks')},
    { key: '12w', value: tc('dateTimeLast12Weeks')},
    { key: '6m', value: tc('dateTimeLast6Months')}
  ] as const

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
                  <ChartTooltip content={<ChartTooltipContent className="min-w-50" labelClassName="mb-1" />} />
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
              <div className="text-xs text-muted-foreground">{t('SummaryTokenCost')}</div>
              <div className="text-sm font-bold">
                {chartData.length > 0 ? format?.number(data.reduce((sum,d) => sum + d.total_token_cost, 0)) : '0'}
              </div>
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground text-center mt-2 pt-2 border-t">
          {tc('lastUpdated')}: {format?.dateTime(lastRefresh, {timeStyle: "medium"})}
        </div>

      </CardContent>
    </div>
  )
}