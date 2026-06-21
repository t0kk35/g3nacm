'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWidgetData } from './helpers/useWidgetData'
import { CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ArrowLeftRight, ArrowBigRight, Check } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Field } from '@/components/ui/field'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RfiRequest } from '@/lib/data/queries/rfi/type'
import { DynamicScreenError } from '../DynamicScreenError'
import { TimeRangeSelector } from './helpers/TimeRangeSelector'
import { formatDateToInterval } from '@/lib/date-time/formatting'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useFormatter } from "next-intl"

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

  const t = useTranslations('DynamicScreen.Widgets.RfiAssignment')
  const tc = useTranslations('Common')
  const format = useFormatter();
  const router = useRouter();
  
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange)
  const [onlyShowActive, setOnlyShowActive] = useState(false)

  const { data: rfis, loading, error, lastRefresh, refresh: fetchRfis } = useWidgetData<RfiRequest[]>(
    `/api/data/rfi/rfi_request?time_range=${selectedTimeRange}`,
    refreshInterval,
    () => router.push('/'),
  )

  const options = [
    { key: "1h", value: tc('dateTimeLast1Hour') },
    { key: "24h", value: tc('dateTimeLast24Hours') },
    { key: "7d", value: tc('dateTimeLast7Days') },
    { key: "30d", value: tc('dateTimeLast30Days') },
    { key: "90d", value: tc('dateTimeLast90Days') }
  ] as const
  
  const activeCount = rfis ? rfis.filter(r => r.entity_state.to_state_is_active).length : 0
  const displayRfis = rfis ? onlyShowActive ? rfis?.filter(r => r.entity_state.to_state_is_active) : rfis : []
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
          <div className="flex gap-3 items-center">
            <Field orientation="horizontal">
              <Checkbox 
                id="only-show-active" 
                name="only-show-active"
                checked={onlyShowActive}
                onCheckedChange={c => setOnlyShowActive(c === true)}
              />
              <Label htmlFor="only-show-active">{t('headerShowOnlyActive')}</Label> 
            </Field>
            <TimeRangeSelector
              value={selectedTimeRange}
              onChange={setSelectedTimeRange}
              options={options}
              onRefresh={fetchRfis}
              loading={loading}
            />
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4 pb-2 flex flex-col">
        { !rfis ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        ) : (
          <div>
            <ScrollArea className="pr-4" style={{ height: `${scrollSize}px`}}>
              { displayRfis.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ArrowLeftRight className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">{t('scrollNoRfis')}</p>
                </div> 
              ) : (
                <div className="space-y-2">
                  { displayRfis.sort((a,b) => new Date(b.create_datetime).getTime() - new Date(a.create_datetime).getTime()).map((rfi) => {
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
                                  <span>•</span>
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
                              <div>
                                <p className="text-xs text-muted-foreground"> 
                                  <strong>{t('statusState')}</strong>: {rfi.entity_state.to_state_name}
                                </p>
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
          {tc('lastUpdated')}: {format?.dateTime(lastRefresh, {timeStyle: "medium"})}
        </div>
      </CardContent>
    </div>
  )
}

function RfiDetailContent({ rfi }: { rfi: RfiRequest }) {

  const t = useTranslations('DynamicScreen.Widgets.RfiAssignment')
  const format = useFormatter();
  const entity_link = rfi.entity_display_url + '/' + rfi.id
  const linked_entity_link = rfi.linked_entity.id ? rfi.linked_entity.display_url + '/' + rfi.linked_entity.id : undefined

  return (
    <div className="space-y-3">
      <div>
        <div className="flex flex-row items-center justify-items-start gap-1 mb-1">
          <ArrowBigRight className="h-4 w-4" />
          <h4 className="font-semibold text-sm">{rfi.title}</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('hooverHeaderTo')}: {rfi.channel.type} • {rfi.recipient_contact_details!.email_address} • {new Date(rfi.create_datetime).toLocaleString()}
        </p>
      </div>
      <Separator />
      <div className="grid-rows-2">
        <p className="text-sm">
          <strong>{t('hooverId')}: </strong>
          <Link href={entity_link} className='hover:underline'>
            {rfi.identifier}
          </Link>
        </p>
        <p className="text-xs text-muted-foreground">
          <strong>{t('statusState')}: </strong> {rfi.entity_state.to_state_name}
        </p>
        <p className="text-xs text-muted-foreground">
          <strong>{t('hooverCardCreateDate')}: </strong> {format.dateTime(new Date(rfi.create_datetime), {dateStyle: "medium", timeStyle: "medium"})}
        </p>
        <p className="text-xs text-muted-foreground">
          <strong>{t('hooverCardDueDate')}: </strong> {format.dateTime(new Date(rfi.due_datetime), {dateStyle: "medium", timeStyle: "medium"})}
        </p>
        <p className="text-xs text-muted-foreground">
          <strong>{t('hooverCardReminderDate')}: </strong> {rfi.reminder_datetime? format.dateTime(new Date(rfi.reminder_datetime), {dateStyle: "medium", timeStyle: "medium"}) : t('hooverCardReminderNotSet')}
        </p>
      </div>
      <Separator />
      <ScrollArea className="text-sm whitespace-pre-wrap h-36">
        {rfi.body}
      </ScrollArea>
      { linked_entity_link && (
        <>
          <Separator />
          <div className="text-xs text-muted-foreground">
            <p><strong>{t('hooverCardLinkedToDescription')}: </strong>{rfi.linked_entity.description}</p>
            <p>
              <strong>{t('hooverCardLinkedToId')}: </strong>
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