'use client'

import { useEffect, useState } from 'react'
import { CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Bell, Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Notification } from '@/app/api/data/notification/types'
import { PerformWorkflowAction } from '@/app/api/action/workflow/workflow'
import { DynamicScreenError } from '../DynamicScreenError'
import { TimeRangeSelector } from './helpers/TimeRangeSelector'
import { formatDateToInterval } from '@/lib/date-time/formatting'
import Link from 'next/link'

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
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [markingRead, setMarkingRead] = useState<Set<string>>(new Set())
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange)  

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/data/notification/list?time_range=${selectedTimeRange}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status}`)
      }

      const data = await response.json()
      setNotifications(data)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    if (markingRead.has(notificationId)) return

    try {
      setMarkingRead(prev => new Set(prev).add(notificationId))

      const action: PerformWorkflowAction = {
        entityCode: 'notification',
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

      // Update local state to reflect the change
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, read_date_time: new Date().toISOString() }
            : n
        )
      )
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

  useEffect(() => { 
    fetchNotifications()
    const interval = setInterval(fetchNotifications, refreshInterval)
    return () => clearInterval(interval)
  }, [selectedTimeRange, refreshInterval])


  const options = [
    { key: '1h', value: 'Last Hour' },
    { key: '24h', value: 'Last 24 Hours' },
    { key: '7d', value: 'Last 7 Days' },
    { key: '30d', value: 'Last 30 Days' },
    { key: '90d', value: 'Last 90 Days' }
  ] as const;

  const unreadCount = notifications.filter(n => !n.read_date_time).length
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
        { loading && !notifications.length ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ScrollArea className="pr-4" style={{ height: `${scrollSize}px`}}>
            { notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <div className="space-y-2">
                { notifications.map((notification) => {
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
                              <span>From: {notification.sender_user_name}</span>
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
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
      </CardContent>
    </div>
  )
}

function NotificationDetailContent({ notification }: { notification: Notification }) {

  const linked_entity_link = notification.linked_entity_id ? notification.linked_entity_display_url + '/' + notification.linked_entity_id : undefined

  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-semibold text-sm mb-1">{notification.title}</h4>
        <p className="text-xs text-muted-foreground">
          From: {notification.sender_user_name} • {new Date(notification.create_date_time).toLocaleString()}
        </p>
      </div>
      <Separator />
      <div className="text-sm whitespace-pre-wrap">{notification.body}</div>
      {linked_entity_link && (
        <>
          <Separator />
          <div className="text-xs text-muted-foreground">
            <p><strong>Linked to: </strong>{notification.linked_entity_description}</p>
            <p>
              <strong>ID: </strong>
              <Link href={linked_entity_link} className='hover:underline'>
                {notification.linked_entity_id}
              </Link>
            </p>
          </div>
        </>
      )}
    </div>
  )
}