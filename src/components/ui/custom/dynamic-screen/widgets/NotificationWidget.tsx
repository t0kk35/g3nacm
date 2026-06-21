'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWidgetData } from './helpers/useWidgetData'
import { CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Bell, Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Notification } from '@/lib/data/queries/notification/types'
import { PerformWorkflowAction } from '@/app/api/action/workflow/workflow'
import { DynamicScreenError } from '../DynamicScreenError'
import { TimeRangeSelector } from './helpers/TimeRangeSelector'
import { formatDateToInterval } from '@/lib/date-time/formatting'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useFormatter } from "next-intl"

const HEADER_SIZE = 60;
const FOOTER_SIZE = 40;

interface NotificationWidgetProps {
  timeRange?: '1h' | '24h' | '7d' | '30d' | '90d'
  title?: string
  refreshInterval?: number,
  width: number,
  height: number
}

export function NotificationWidget({
  timeRange = '7d',
  title = 'My Notifications',
  refreshInterval = 300000, // 5 minutes
  width,
  height
}: NotificationWidgetProps) {

  const t = useTranslations('DynamicScreen.Widgets.Notification')
  const tc = useTranslations('Common')
  const format = useFormatter();
  const router = useRouter();

  const [markingRead, setMarkingRead] = useState<Set<string>>(new Set())
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange)  

  const { data: notifications, loading, error, lastRefresh, refresh: fetchNotifications } = useWidgetData<Notification[]>(
    `/api/data/notification/list?time_range=${selectedTimeRange}`,
    refreshInterval,
    () => router.push('/'),
  )

  const markAsRead = async (notificationId: string) => {
    if (markingRead.has(notificationId)) return

    try {
      setMarkingRead(prev => new Set(prev).add(notificationId))

      const action: PerformWorkflowAction = {
        entityCode: 'system.notification',
        entityId: notificationId,
        orgUnitCode: 'GRP',
        actionCode: 'system.notification.mark_read',
        entityData: {},
        data: {}
      }

      const response = await fetch('/api/action/workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([action])
      })

      if (!response.ok) {
        throw new Error('Failed to mark notification as read')
      }

      // Refetch notifications. To show the updated state.
      fetchNotifications()

    } catch (err) {
      console.error('Error marking notification as read:', err)
    } finally {
      setMarkingRead(prev => {
        const next = new Set(prev)
        next.delete(notificationId)
        return next
      })
    }
  }

  const options = [
    { key: '1h', value: tc('dateTimeLast1Hour') },
    { key: '24h', value: tc('dateTimeLast24Hours') },
    { key: '7d', value: tc('dateTimeLast7Days') },
    { key: '30d', value: tc('dateTimeLast30Days') },
    { key: '90d', value: tc('dateTimeLast90Days') }
  ] as const;

  const unreadCount = notifications ? notifications.filter(n => !n.read_date_time).length : 0
  const scrollSize = height - HEADER_SIZE - FOOTER_SIZE

  if (error) return <DynamicScreenError title={title} error={error} onClick={fetchNotifications} />

  return (
    <div className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold">{title}</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 rounded-full">
                {unreadCount}
              </Badge>
            )}
          </div>
          <TimeRangeSelector
            value={selectedTimeRange}
            onChange={setSelectedTimeRange}
            options={options}
            onRefresh={fetchNotifications}
            loading={loading}
          />
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4 pb-2 flex flex-col">
        {  !notifications ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ScrollArea className="pr-4" style={{ height: `${scrollSize}px`}}>
            { notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">{t('scrollNoNotifications')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                { notifications.sort((a,b) => new Date(b.create_date_time).getTime() - new Date(a.create_date_time).getTime()).map((notification) => {
                  const isUnread = !notification.read_date_time
                  const isMarking = markingRead.has(notification.id)

                  return (
                    <Popover key={notification.id}>
                      <PopoverTrigger asChild>
                        <div
                          className={`
                            flex items-start justify-between p-1.5 rounded-lg cursor-pointer
                            transition-colors hover:bg-accent/50
                            ${isUnread ? 'bg-accent border-l-2 border-chart-1' : 'bg-accent/50'}
                          `}
                          onClick={() => {
                            if (isUnread && !isMarking) {
                              markAsRead(notification.id)
                            }
                          }}
                        >
                          <div className="flex-1 space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-medium truncate ${isUnread ? 'font-semibold' : ''}`}>
                                {notification.title}
                              </p>
                              {isUnread && (
                                <div className="h-2 w-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{t('scrollFrom')}: {notification.sender_user_name}</span>
                              <span>•</span>
                              <span>{formatDateToInterval(notification.create_date_time)}</span>
                            </div>
                          </div>
                          {!isUnread && (
                            <Check className="h-4 w-4 text-green-700 font-semibold shrink-0 ml-2" />
                          )}
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="start">
                        <NotificationDetailContent notification={notification} />
                      </PopoverContent>
                    </Popover>
                  )
                })}
              </div>
          )}
        </ScrollArea>
        )}
        {/* Last Updated */}
        <div className="text-xs text-muted-foreground text-center mt-2 pt-2 border-t">
          {tc('lastUpdated')}: {format?.dateTime(lastRefresh, {timeStyle: "medium"})}
        </div>
      </CardContent>
    </div>
  )
}

function NotificationDetailContent({ notification }: { notification: Notification }) {

  const t = useTranslations('DynamicScreen.Widgets.Notification')
  const format = useFormatter();

  const linked_entity_link = notification.linked_entity.id ? notification.linked_entity.display_url + '/' + notification.linked_entity.id : undefined

  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-semibold text-sm mb-1">{notification.title}</h4>
        <p className="text-xs text-muted-foreground">
          {t('detailFrom')}: {notification.sender_user_name} • {format?.dateTime(new Date(notification.create_date_time), {timeStyle: "medium"})}
        </p>
      </div>
      <Separator />
      <div className="text-sm whitespace-pre-wrap">{notification.body}</div>
      {linked_entity_link && (
        <>
          <Separator />
          <div className="text-xs text-muted-foreground">
            <p><strong>{t('detailLinkedTo')}: </strong>{notification.linked_entity.description}</p>
            <p>
              <strong>{t('detailId')}: </strong>
              <Link href={linked_entity_link} className='hover:underline'>
                {notification.linked_entity.identifier}
              </Link>
            </p>
          </div>
        </>
      )}
    </div>
  )
}