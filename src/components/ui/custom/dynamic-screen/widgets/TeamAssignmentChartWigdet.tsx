'use client'

import { useEffect, useState } from 'react'
import { CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { TeamAssignment } from '@/app/api/data/team/types'
import { RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { DynamicScreenError } from '../DynamicScreenError'

const HEADER_SIZE = 60;
const SUMMARY_SIZE = 45;
const FOOTER_SIZE = 40;

interface TeamAssignmentChartWidgetProps {
  title?: string
  refreshInterval?: number
  width: number
  height: number
}

export function TeamAssignmentChartWidget({ 
  title = 'Team Assignment Chart', 
  refreshInterval = 60000,
  width,
  height
}: TeamAssignmentChartWidgetProps) {
 
  const [data, setData] = useState<TeamAssignment[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())    

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/data/team/assignment`)
      if (!response.ok) throw new Error(`Failed to fetch team assignment: ${response.status}`)
        const data = await response.json();
        setData(data);
        setLastRefresh(new Date());  
      } catch (err) {
        setError('Failed to load team assingment data')
      } finally {
        setLoading(false)
      }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  const chartConfig:ChartConfig = {
    high_priority: {
      label: 'High',
      color: 'var(--priority-high)'
    },
    medium_priority: {
      label: 'Medium',
      color: 'var(--priority-medium)'
    },
    low_priority: {
      label: 'Low',
      color: 'var(--priority-low)'
    }
  }

  // Calculate the available height for the chart
  const chartHeight = height - HEADER_SIZE - SUMMARY_SIZE - FOOTER_SIZE;

  if (error) return <DynamicScreenError title={title} error={error} onClick={fetchData} />

  return (
    <div className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
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
                <BarChart accessibilityLayer data={data} layout="vertical">
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey='high_priority' 
                    fill={`var(--color-high_priority)`} 
                    stackId="a"
                  />
                  <Bar
                    dataKey='medium_priority' 
                    fill={`var(--color-medium_priority)`} 
                    stackId="a"
                  />
                  <Bar
                    dataKey='low_priority' 
                    fill={`var(--color-low_priority)`} 
                    stackId="a"
                  />
                </BarChart>
              </ChartContainer>
            </div>
            
            {/* Summary */}
            <div className='flex flex-col gap-1 items-center'>
              <div className="text-xs text-muted-foreground">Total Alert Count</div>
              <div className="text-sm font-bold">
                {data.length > 0 ? data.reduce((sum,d) => sum + d.total, 0).toLocaleString() : '0'}
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