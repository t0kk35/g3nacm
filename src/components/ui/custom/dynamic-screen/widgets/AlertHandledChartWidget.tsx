'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWidgetData } from './helpers/useWidgetData'
import { CardHeader, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { UserHandled } from '@/lib/data/queries/user/user'
import { DynamicScreenError } from '../DynamicScreenError'
import { ChartTrendIndicator } from './helpers/ChartTrendIndicator'
import { TimeRangeSelector } from './helpers/TimeRangeSelector'
import { useTranslations } from 'next-intl'
import { useFormatter } from "next-intl"

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
  
  const t = useTranslations('DynamicScreen.Widgets.AlertHandledChart')  
  const tc = useTranslations('Common')
  const format = useFormatter();
  const router = useRouter();

  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange)

  const { data: data, loading, error, lastRefresh, refresh: fetchData } = useWidgetData<UserHandled>(
    `/api/data/user/entities_handled?time_range=${selectedTimeRange}`,
    refreshInterval,
    () => router.push('/'),
  )

  const options = [
    { key: '24h', value: tc('dateTimeLast24Hours') },
    { key: '7d', value: tc('dateTimeLast7Days') },
    { key: '30d', value: tc('dateTimeLast30Days') },
    { key: '90d', value: tc('dateTimeLast90Days') },
    { key: '6w', value: tc('dateTimeLast6Weeks') },
    { key: '12w', value: tc('dateTimeLast12Weeks') },
    { key: '6m', value: tc('dateTimeLast6Months') }
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
              <div className="text-xs text-muted-foreground">{t('SummaryAlertCount')}</div>
              <div className="text-sm font-bold">
                {data.alerts.length > 0 ? format?.number(data.alerts.reduce((sum,d) => sum + d.count, 0)) : '0'}
              </div>
            </div>
          </div>  
        )}

        <Separator className="mt-4" />
        <div className="mt-4 text-xs text-muted-foreground text-center">
          {tc('lastUpdated')}: {format?.dateTime(lastRefresh, {timeStyle: "medium"})}
        </div>    
      
      </CardContent>
    </div>
  )
}