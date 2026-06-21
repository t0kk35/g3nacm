'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useWidgetData } from './helpers/useWidgetData'
import { CardHeader, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Clock, MapPin, CheckSquare, Bell } from 'lucide-react'
import { DynamicScreenError } from '../DynamicScreenError'
import { TimeRangeSelector } from './helpers/TimeRangeSelector'
import { useTranslations } from 'next-intl'
import { useFormatter } from 'next-intl'
import type { CalendarEvent } from '@/lib/data/queries/calendar/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_PX = 48           // pixels per hour in day view
const TIME_COL_W = 38        // width of the time-label gutter
const HEADER_SIZE = 72       // CardHeader + separator + CardContent pt-3
const FOOTER_SIZE = 44       // last-updated row + border + CardContent pb-2
const COMPACT_WIDTH = 240    // below this width the title is hidden
const MIN_VIEW_WIDTH = 280   // below this only list view is shown
const MIN_VIEW_HEIGHT = 180  // below this only list view is shown
const MIN_WEEK_7_WIDTH = 320 // minimum width to show 7-day week columns
const MIN_WEEK_14_WIDTH = 560 // minimum width to show 14-day week columns

// ─── Types ────────────────────────────────────────────────────────────────────

export type CalendarPeriod =
  | 'past30d'
  | 'past7d'
  | 'today'
  | 'next7d'
  | 'next14d'
  | 'next30d'

type ViewMode = 'day' | 'week' | 'month' | 'list'

interface CalendarWidgetProps {
  period?: CalendarPeriod
  title?: string
  refreshInterval?: number
  width: number
  height: number
}

interface EventGroup {
  dateKey: string
  label: Date
  events: CalendarEvent[]
}

// ─── Utility functions ────────────────────────────────────────────────────────

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getPeriodDates(period: CalendarPeriod): { from: string; to: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const offset = (days: number) => { const d = new Date(today); d.setDate(d.getDate() + days); return d }

  switch (period) {
    case 'past30d': return { from: toIsoDate(offset(-30)), to: toIsoDate(today) }
    case 'past7d':  return { from: toIsoDate(offset(-7)),  to: toIsoDate(today) }
    case 'today':   return { from: toIsoDate(today),        to: toIsoDate(today) }
    case 'next7d':  return { from: toIsoDate(today),        to: toIsoDate(offset(7)) }
    case 'next14d': return { from: toIsoDate(today),        to: toIsoDate(offset(14)) }
    case 'next30d': return { from: toIsoDate(today),        to: toIsoDate(offset(30)) }
  }
}

function getDatesInRange(fromIso: string, toIso: string): Date[] {
  const dates: Date[] = []
  const cursor = new Date(fromIso)
  const end = new Date(toIso)
  while (cursor <= end) {
    dates.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

function getViewMode(period: CalendarPeriod, width: number, height: number): ViewMode {
  if (width < MIN_VIEW_WIDTH || height < MIN_VIEW_HEIGHT) return 'list'
  if (period === 'today') return 'day'
  if (period === 'past7d' || period === 'next7d') return width >= MIN_WEEK_7_WIDTH ? 'week' : 'list'
  if (period === 'next14d') {
    if (width >= MIN_WEEK_14_WIDTH) return 'week'
    if (width >= MIN_VIEW_WIDTH) return 'month'
    return 'list'
  }
  return 'month'  // past30d / next30d
}

function formatHour(h: number): string {
  if (h === 0) return '12a'
  if (h < 12) return `${h}a`
  if (h === 12) return '12p'
  return `${h - 12}p`
}

function buildEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    if (!event.start_date_time) continue
    const key = toIsoDate(new Date(event.start_date_time))
    const arr = map.get(key) ?? []
    arr.push(event)
    map.set(key, arr)
  }
  return map
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function CalendarDayView({ date, events, availableHeight }: {
  date: Date
  events: CalendarEvent[]
  availableHeight: number
}) {
  const format = useFormatter()
  const t = useTranslations('DynamicScreen.Widgets.Calendar')

  const allDayEvents = events.filter(e => e.all_day || !e.start_date_time)
  const timedEvents = events.filter(e => !e.all_day && e.start_date_time)

  // Dynamic hour range around events; default 8–18
  let startHour = 8
  let endHour = 18
  if (timedEvents.length > 0) {
    const starts = timedEvents.map(e => new Date(e.start_date_time!).getHours())
    const ends = timedEvents.map(e => {
      const end = e.end_date_time ? new Date(e.end_date_time) : new Date(new Date(e.start_date_time!).getTime() + 3_600_000)
      return end.getHours() + (end.getMinutes() > 0 ? 1 : 0)
    })
    startHour = Math.max(0, Math.min(...starts) - 1)
    endHour   = Math.min(23, Math.max(...ends) + 1)
  }
  const hours = Array.from({ length: Math.max(endHour - startHour + 1, 8) }, (_, i) => startHour + i)
  const gridHeight = hours.length * HOUR_PX

  const allDayAreaH = allDayEvents.length > 0 ? 10 + allDayEvents.length * 22 + 6 : 0
  const scrollAreaH = availableHeight - allDayAreaH

  // Current time indicator
  const now = new Date()
  const isToday = isSameDay(date, now)
  const nowTop = (isToday && now.getHours() >= startHour && now.getHours() <= endHour)
    ? ((now.getHours() - startHour) * 60 + now.getMinutes()) / 60 * HOUR_PX
    : -1

  // Position timed events
  const positioned = timedEvents.map(event => {
    const start = new Date(event.start_date_time!)
    const end   = event.end_date_time
      ? new Date(event.end_date_time)
      : new Date(start.getTime() + 3_600_000)
    const topPx    = ((start.getHours() - startHour) * 60 + start.getMinutes()) / 60 * HOUR_PX
    const heightPx = Math.max(22, Math.max(30, (end.getTime() - start.getTime()) / 60_000) / 60 * HOUR_PX - 2)
    return { event, topPx, heightPx }
  })

  return (
    <div className="flex flex-col h-full min-h-0">
      {allDayEvents.length > 0 && (
        <div className="px-2 py-1.5 border-b bg-muted/20 shrink-0">
          <p className="text-xs text-muted-foreground leading-none mb-1.5">{t('allDay')}</p>
          {allDayEvents.map(event => (
            <div key={event.id} className="flex items-center gap-1 mb-0.5">
              {event.type === 'task'
                ? <CheckSquare className="h-3 w-3 text-blue-500 shrink-0" />
                : <Bell className="h-3 w-3 text-amber-500 shrink-0" />
              }
              <span className="text-xs font-medium truncate">{event.title}</span>
            </div>
          ))}
        </div>
      )}
      <ScrollArea style={{ height: `${scrollAreaH}px` }}>
        <div className="relative flex" style={{ height: `${gridHeight}px` }}>
          {/* Hour labels */}
          <div style={{ width: `${TIME_COL_W}px` }} className="shrink-0 select-none">
            {hours.map((h, i) => (
              <div key={h} style={{ height: `${HOUR_PX}px` }} className="relative">
                {i > 0 && (
                  <span className="absolute right-1.5 -top-2 text-xs text-muted-foreground leading-none">
                    {formatHour(h)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Events area */}
          <div className="flex-1 relative border-l border-border/50">
            {/* Hour lines */}
            {hours.map((_, i) => (
              <div key={i} className="absolute left-0 right-0 border-t border-border/30"
                style={{ top: `${i * HOUR_PX}px` }} />
            ))}
            {/* Half-hour lines */}
            {hours.map((_, i) => (
              <div key={`h-${i}`} className="absolute left-0 right-0 border-t border-border/15"
                style={{ top: `${i * HOUR_PX + HOUR_PX / 2}px` }} />
            ))}

            {/* Current time indicator */}
            {nowTop >= 0 && (
              <div className="absolute left-0 right-0 flex items-center z-10 pointer-events-none"
                style={{ top: `${nowTop}px` }}>
                <div className="h-2 w-2 rounded-full bg-red-500 shrink-0 -ml-1" />
                <div className="flex-1 border-t border-red-500" />
              </div>
            )}

            {/* Events */}
            {positioned.map(({ event, topPx, heightPx }) => (
              <div
                key={event.id}
                style={{ top: `${topPx}px`, height: `${heightPx}px`, left: '3px', right: '3px' }}
                className={`absolute rounded overflow-hidden ${
                  event.type === 'task'
                    ? 'bg-blue-100 dark:bg-blue-950 border-l-2 border-l-blue-500'
                    : 'bg-amber-50 dark:bg-amber-950 border-l-2 border-l-amber-500'
                }`}
              >
                <div className="px-1.5 py-0.5">
                  <p className="text-xs font-medium leading-tight truncate">{event.title}</p>
                  {heightPx > 34 && (
                    <p className="text-xs text-muted-foreground leading-tight">
                      {format.dateTime(new Date(event.start_date_time!), { timeStyle: 'short' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

// ─── Week View ────────────────────────────────────────────────────────────────

function CalendarWeekView({ dates, events, availableHeight }: {
  dates: Date[]
  events: CalendarEvent[]
  availableHeight: number
}) {
  const format = useFormatter()
  const t = useTranslations('DynamicScreen.Widgets.Calendar')

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])
  const eventsByDate = useMemo(() => buildEventsByDate(events), [events])

  const DAY_HEADER_H = 44
  const bodyH = availableHeight - DAY_HEADER_H
  // Fit as many event chips per cell as vertical space allows (each chip ~20px)
  const maxPerCell = Math.max(1, Math.floor(bodyH / 20) - 1)

  const gridCols = `repeat(${dates.length}, minmax(0, 1fr))`

  return (
    <div style={{ height: `${availableHeight}px` }} className="flex flex-col overflow-hidden">
      {/* Day headers */}
      <div className="grid shrink-0 border-b" style={{ gridTemplateColumns: gridCols }}>
        {dates.map(date => {
          const isToday = isSameDay(date, today)
          return (
            <div key={toIsoDate(date)} className={`py-1 text-center border-l first:border-l-0 ${isToday ? 'bg-primary/10' : ''}`}>
              <p className={`text-xs font-medium leading-none ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                {format.dateTime(date, { weekday: 'short' })}
              </p>
              <p className={`text-sm font-bold leading-tight mt-0.5 ${isToday ? 'text-primary' : ''}`}>
                {date.getDate()}
              </p>
            </div>
          )
        })}
      </div>

      {/* Event cells */}
      <ScrollArea style={{ height: `${bodyH}px` }}>
        <div className="grid" style={{ gridTemplateColumns: gridCols }}>
          {dates.map(date => {
            const isToday = isSameDay(date, today)
            const dateKey = toIsoDate(date)
            const dayEvents = (eventsByDate.get(dateKey) ?? []).sort((a, b) => {
              if (!a.start_date_time) return 1
              if (!b.start_date_time) return -1
              return new Date(a.start_date_time).getTime() - new Date(b.start_date_time).getTime()
            })
            const visible = dayEvents.slice(0, maxPerCell)
            const overflow = dayEvents.length - visible.length

            return (
              <div key={dateKey} className={`p-0.5 border-l first:border-l-0 min-h-14 ${isToday ? 'bg-primary/5' : ''}`}>
                {visible.map(event => (
                  <div
                    key={event.id}
                    title={event.title}
                    className={`text-xs rounded px-1 py-0.5 mb-0.5 truncate leading-tight ${
                      event.type === 'task'
                        ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200'
                        : 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
                    }`}
                  >
                    {event.start_date_time && !event.all_day && (
                      <span className="opacity-60 mr-0.5">
                        {format.dateTime(new Date(event.start_date_time), { hour: 'numeric', hour12: true })}
                      </span>
                    )}
                    {event.title}
                  </div>
                ))}
                {overflow > 0 && (
                  <p className="text-xs text-muted-foreground px-1">+{overflow} {t('more')}</p>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

// ─── Month View ───────────────────────────────────────────────────────────────

function CalendarMonthView({ fromDate, toDate, events, availableHeight }: {
  fromDate: Date
  toDate: Date
  events: CalendarEvent[]
  availableHeight: number
}) {
  const format = useFormatter()
  const t = useTranslations('DynamicScreen.Widgets.Calendar')
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

  // Build grid: Mon of week containing fromDate → Sun of week containing toDate
  const gridStart = new Date(fromDate)
  const dow = gridStart.getDay()
  gridStart.setDate(gridStart.getDate() - (dow === 0 ? 6 : dow - 1))

  const gridEnd = new Date(toDate)
  const dow2 = gridEnd.getDay()
  gridEnd.setDate(gridEnd.getDate() + (dow2 === 0 ? 0 : 7 - dow2))

  const weeks: Date[][] = []
  const cursor = new Date(gridStart)
  while (cursor <= gridEnd) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }

  const eventsByDate = useMemo(() => buildEventsByDate(events), [events])

  const WEEKDAY_HEADER_H = 22
  const cellH = Math.max(28, Math.floor((availableHeight - WEEKDAY_HEADER_H) / weeks.length))
  // Each event label is ~14px; leave ~18px for the date number
  const maxPerCell = Math.max(1, Math.floor((cellH - 18) / 14))

  return (
    <div style={{ height: `${availableHeight}px` }} className="flex flex-col">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b shrink-0" style={{ height: `${WEEKDAY_HEADER_H}px` }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="flex items-center justify-center">
            <span className="text-xs font-semibold text-muted-foreground">{d}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-hidden">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b last:border-b-0" style={{ height: `${cellH}px` }}>
            {week.map(day => {
              const dayKey = toIsoDate(day)
              const isToday = isSameDay(day, today)
              const inRange = day >= fromDate && day <= toDate
              const dayEvents = eventsByDate.get(dayKey) ?? []
              const visible = dayEvents.slice(0, maxPerCell)
              const overflow = dayEvents.length - visible.length

              return (
                <div
                  key={dayKey}
                  className={`border-l first:border-l-0 px-0.5 py-0.5 overflow-hidden ${
                    isToday ? 'bg-primary/5' : inRange ? '' : 'opacity-40'
                  }`}
                >
                  <div className="flex justify-center mb-0.5">
                    <span className={`text-xs leading-tight font-medium ${
                      isToday
                        ? 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center'
                        : inRange ? '' : 'text-muted-foreground'
                    }`}>
                      {day.getDate()}
                    </span>
                  </div>
                  {visible.map(event => (
                    <div
                      key={event.id}
                      title={event.title}
                      className={`text-xs rounded px-0.5 truncate leading-tight mb-0.5 ${
                        event.type === 'task'
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
                      }`}
                    >
                      {event.title}
                    </div>
                  ))}
                  {overflow > 0 && (
                    <div className="text-xs text-muted-foreground px-0.5">+{overflow}</div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── List View ────────────────────────────────────────────────────────────────

function CalendarListView({ events, scrollHeight, isCompact }: {
  events: CalendarEvent[]
  scrollHeight: number
  isCompact: boolean
}) {
  const format = useFormatter()
  const t = useTranslations('DynamicScreen.Widgets.Calendar')

  const grouped = useMemo((): EventGroup[] => {
    const map = new Map<string, EventGroup>()
    for (const event of events) {
      let key: string
      let label: Date
      if (event.start_date_time) {
        const d = new Date(event.start_date_time)
        key = toIsoDate(d)
        label = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      } else {
        key = '__no_date__'
        label = new Date(0)
      }
      if (!map.has(key)) map.set(key, { dateKey: key, label, events: [] })
      map.get(key)!.events.push(event)
    }
    return Array.from(map.values())
  }, [events])

  if (grouped.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground py-6">
        <CalendarDays className="h-8 w-8 opacity-20" />
        <p className="text-xs">{t('noEvents')}</p>
      </div>
    )
  }

  return (
    <ScrollArea style={{ height: `${scrollHeight}px` }}>
      <div className="space-y-4 pr-2">
        {grouped.map(group => (
          <div key={group.dateKey}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                {group.dateKey === '__no_date__'
                  ? t('noDateLabel')
                  : format.dateTime(group.label, isCompact
                      ? { weekday: 'short', day: 'numeric' }
                      : { weekday: 'short', month: 'short', day: 'numeric' })
                }
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="space-y-1">
              {group.events.map(event => (
                <div
                  key={event.id}
                  className="flex items-start gap-2 p-1.5 rounded-md hover:bg-accent/50 transition-colors"
                >
                  {event.type === 'task'
                    ? <CheckSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-500" />
                    : <Bell className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate leading-tight">{event.title}</p>
                    {!isCompact && (
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {event.start_date_time && !event.all_day && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {format.dateTime(new Date(event.start_date_time), { timeStyle: 'short' })}
                          </span>
                        )}
                        {event.all_day && (
                          <span className="text-xs text-muted-foreground">{t('allDay')}</span>
                        )}
                        {event.location && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5 max-w-28 truncate">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {!isCompact && (
                    <Badge
                      variant={event.type === 'task' ? 'secondary' : 'outline'}
                      className="text-xs py-0 h-4 shrink-0"
                    >
                      {event.type}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export function CalendarWidget({
  period = 'next7d',
  title = 'My Calendar',
  refreshInterval = 300000,
  width,
  height,
}: CalendarWidgetProps) {
  const t = useTranslations('DynamicScreen.Widgets.Calendar')
  const tc = useTranslations('Common')
  const format = useFormatter()
  const router = useRouter()

  const [selectedPeriod, setSelectedPeriod] = useState<CalendarPeriod>(period)

  const { from, to } = getPeriodDates(selectedPeriod)

  const { data: events, loading, error, lastRefresh, refresh } = useWidgetData<CalendarEvent[]>(
    `/api/data/calendar/list?from_date=${from}&to_date=${to}`,
    refreshInterval,
    () => router.push('/'),
  )

  const viewMode = getViewMode(selectedPeriod, width, height)
  const isCompact = width < COMPACT_WIDTH
  const availableHeight = height - HEADER_SIZE - FOOTER_SIZE

  const options = [
    { key: 'past30d' as const, value: tc('dateTimePast30d') },
    { key: 'past7d' as const,  value: tc('dateTimePast7d') },
    { key: 'today' as const,   value: tc('dateTimeToday') },
    { key: 'next7d' as const,  value: tc('dateTimeNext7d') },
    { key: 'next14d' as const, value: tc('dateTimeNext14d') },
    { key: 'next30d' as const, value: tc('dateTimeNext30d') },
  ] as const

  if (error) return <DynamicScreenError title={title} error={error} onClick={refresh} />

  const renderBody = () => {
    if (!events) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      )
    }

    switch (viewMode) {
      case 'day':
        return (
          <CalendarDayView
            date={new Date(from)}
            events={events}
            availableHeight={availableHeight}
          />
        )
      case 'week':
        return (
          <CalendarWeekView
            dates={getDatesInRange(from, to)}
            events={events}
            availableHeight={availableHeight}
          />
        )
      case 'month': {
        const fromD = new Date(from); fromD.setHours(0, 0, 0, 0)
        const toD   = new Date(to);   toD.setHours(0, 0, 0, 0)
        return (
          <CalendarMonthView
            fromDate={fromD}
            toDate={toD}
            events={events}
            availableHeight={availableHeight}
          />
        )
      }
      default:
        return (
          <CalendarListView
            events={events}
            scrollHeight={availableHeight}
            isCompact={isCompact}
          />
        )
    }
  }

  return (
    <div className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            {!isCompact && (
              <h3 className="text-sm font-semibold truncate">{title}</h3>
            )}
          </div>
          <TimeRangeSelector
            value={selectedPeriod}
            onChange={setSelectedPeriod}
            options={options}
            onRefresh={refresh}
            loading={loading}
          />
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-3 pb-2 flex flex-col flex-1 min-h-0">
        {renderBody()}
        <div className="text-xs text-muted-foreground text-center mt-2 pt-2 border-t shrink-0">
          {tc('lastUpdated')}: {format.dateTime(lastRefresh, { timeStyle: 'medium' })}
        </div>
      </CardContent>
    </div>
  )
}
