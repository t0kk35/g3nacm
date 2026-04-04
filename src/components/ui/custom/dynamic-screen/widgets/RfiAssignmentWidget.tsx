'use client'

import { useEffect, useState } from 'react'
import { CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ArrowLeftRight, ArrowBigRight, Check } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RfiRequest } from '@/app/api/data/rfi/type'
import { DynamicScreenError } from '../DynamicScreenError'
import { TimeRangeSelector } from './helpers/TimeRangeSelector'
import { formatDateToInterval } from '@/lib/date-time/formatting'
import Link from 'next/link'

const HEADER_SIZE = 60;
const FOOTER_SIZE = 40;

interface RfiAssignmentWidgetProps {
  timeRange?: '1h' | '24h' | '7d' | '30d' | '90d'
  title?: string
  refreshInterval?: number,
  userName: string,
  width: number,
  height: number
}

export function RfiAssignmentWidget({
  timeRange = '7d',
  title = 'My RFI Requests',
  userName,
  refreshInterval = 300000, // 5 minutes
  width,
  height
}: RfiAssignmentWidgetProps) {
  const [rfis, setRfis] = useState<RfiRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange)  

  const fetchRfis = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/data/rfi/rfi_request?time_range=${selectedTimeRange}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch rfi_requests: ${response.status}`)
      }

      const data = await response.json()
      setRfis(data)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load RFI Requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    fetchRfis()
    const interval = setInterval(fetchRfis, refreshInterval)
    return () => clearInterval(interval)
  }, [selectedTimeRange, refreshInterval])

  const options = [
    { key: "1h", value: "Last 1 hour" },
    { key: "24h", value: "Last 24 hours" },
    { key: "7d", value: "Last 7 days" },
    { key: "30d", value: "Last 30 days" },
    { key: "90d", value: "Last 90 days" }
  ] as const
  
  const activeCount = rfis.filter(r => r.entity_state.to_state_is_active).length
  const scrollSize = height - HEADER_SIZE - FOOTER_SIZE

  if (error) return <DynamicScreenError title={title} error={error} onClick={fetchRfis} />

  return (
    <div className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold">{title}</h3>
            { activeCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 rounded-full">
                {activeCount}
              </Badge>
            )}
          </div>
          <TimeRangeSelector
            value={selectedTimeRange}
            onChange={setSelectedTimeRange}
            options={options}
            onRefresh={fetchRfis}
            loading={loading}
          />
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4 pb-2 flex flex-col">
        { loading && !rfis.length ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        ) : (
          <div>
            <ScrollArea className="pr-4" style={{ height: `${scrollSize}px`}}>
              { rfis.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ArrowLeftRight className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No RFI Requests</p>
                </div> 
              ) : (
                <div className="space-y-2">
                  { rfis.sort((a,b) => new Date(b.create_datetime).getTime() - new Date(a.create_datetime).getTime()).map((rfi) => {
                    const isActive = rfi.entity_state.to_state_is_active

                    return (
                      <Popover key={rfi.id}>
                        <PopoverTrigger asChild>
                          <div
                            className={`
                              flex items-center justify-between p-1.5 rounded-lg cursor-pointer
                              transition-colors hover:bg-accent/50 gap-2
                              ${isActive ? 'bg-accent border-l-2 border-chart-1' : 'bg-accent/50'}
                            `}
                          >
                            <ArrowBigRight className="h-4 w-4" />
                            <div className="flex-1 space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`flex items-center gap-2 text-sm font-medium truncate ${isActive ? 'font-semibold' : ''}`}>
                                  <span>{rfi.identifier}</span>
                                  <span>•</span>
                                  <span>{rfi.title}</span>
                                </p>
                                { isActive && (
                                  <div className="h-2 w-2 rounded-full bg-primary" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{rfi.channel.type}</span>
                                <span>•</span>
                                <span>{rfi.recipient_contact_details!.email_address}</span>
                                <span>•</span>
                                <span>{formatDateToInterval(rfi.create_datetime)}</span>
                              </div>
                            </div>
                            {!isActive && (
                              <Check className="h-4 w-4 text-green-700 font-semibold shrink-0 ml-2" />
                            )}
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-96" align="start">
                          <RfiDetailContent rfi={rfi} />
                        </PopoverContent>
                      </Popover>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
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

function RfiDetailContent({ rfi }: { rfi: RfiRequest }) {

  const linked_entity_link = rfi.linked_entity.id ? rfi.linked_entity.display_url + '/' + rfi.linked_entity.id : undefined

  return (
    <div className="space-y-3">
      <div>
        <div className="flex flex-row items-center justify-items-start gap-1 mb-1">
          <ArrowBigRight className="h-4 w-4" />
          <h4 className="font-semibold text-sm">{rfi.title}</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          To: {rfi.channel.type} • {rfi.recipient_contact_details!.email_address} • {new Date(rfi.create_datetime).toLocaleString()}
        </p>
      </div>
      <Separator />
      <div className="grid-rows-2">
        <p className="text-xs text-muted-foreground">
          <strong>Due Date:</strong> {new Date(rfi.due_datetime).toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">
          <strong>Reminder Date:</strong> {rfi.reminder_datetime? rfi.reminder_datetime : "Not set"}
        </p>
      </div>
      <Separator />
      <div className="text-sm whitespace-pre-wrap max-h-64">{rfi.body}</div>
      { linked_entity_link && (
        <>
          <Separator />
          <div className="text-xs text-muted-foreground">
            <p><strong>Linked to: </strong>{rfi.linked_entity.description}</p>
            <p>
              <strong>ID: </strong>
              <Link href={linked_entity_link} className='hover:underline'>
                {rfi.linked_entity.identifier}
              </Link>
            </p>
          </div>
        </>
      )}
    </div>
  )
}