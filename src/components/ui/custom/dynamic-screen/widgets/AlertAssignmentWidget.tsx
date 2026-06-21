'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWidgetData } from './helpers/useWidgetData'
import { CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { User, Users, RefreshCw, Loader2 } from 'lucide-react'
import { UserAssignment } from '@/lib/data/queries/user/user'
import { useGetNextAlert } from '@/hooks/use-get-next-alert'
import { DynamicScreenError } from '../DynamicScreenError'
import { useTranslations } from 'next-intl'
import { useFormatter } from "next-intl"

interface AlertAssignmentWidgetProps {
  title?: string
  refreshInterval?: number
}

export function AlertAssignmentWidget({ title = 'Assigned Alerts', refreshInterval = 60000 }: AlertAssignmentWidgetProps) {

  const t = useTranslations('DynamicScreen.Widgets.AlertAssignment')
  const tc = useTranslations('Common')
  const format = useFormatter();
  const router = useRouter();

  const { getNextAlert, isLoading: isGettingNext } = useGetNextAlert();

  const { data: assignment, loading, error, lastRefresh, refresh: fetchAssignment } = useWidgetData<UserAssignment>(
    `/api/data/user/assignment`,
    refreshInterval,
    () => router.push('/'),
  );

  if (error) return <DynamicScreenError title={title} error={error} onClick={fetchAssignment} />

  return (
    <>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchAssignment}
              disabled={loading}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        {!assignment ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Total Summary */}
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">{assignment.alerts.total}</div>
              <div className="text-sm text-muted-foreground">{t('totalAssignment')}</div>
            </div>

            {/* User Assignments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4" />
                  {t('directAssignment')}
                </div>
                <span className="font-medium">{assignment.alerts.user.total}</span>
              </div>
              {assignment.alerts.user.total > 0 && (
                <div className="pl-6">
                  <div className="flex flex-wrap gap-1">
                    {assignment.alerts.user.high_priority > 0 && (
                      <Badge variant="secondary" className="bg-priority-high text-muted">
                        {t('prioHigh')}: {assignment.alerts.user.high_priority}
                      </Badge>
                    )}
                    {assignment.alerts.user.medium_priority > 0 && (
                      <Badge variant="secondary" className="bg-priority-medium text-muted">
                        {t('prioMedium')}: {assignment.alerts.user.medium_priority}
                      </Badge>
                    )}
                    {assignment.alerts.user.low_priority > 0 && (
                      <Badge variant="secondary" className="bg-priority-low text-muted">
                        {t('prioLow')}: {assignment.alerts.user.low_priority}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Team Assignments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4" />
                  {t('teamAssignment')}
                </div>
                {assignment.alerts.team.total > 0 ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={getNextAlert}
                        disabled={isGettingNext}
                        className="font-medium text-primary hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                        aria-label="Get next team alert"
                      >
                        {isGettingNext ? (
                          <Loader2 className="h-4 w-4 animate-spin inline" />
                        ) : (
                          assignment.alerts.team.total
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('toolTipGetNextAlert')}</p>
                    </TooltipContent>
                  </Tooltip>

                ) : (
                  <span className="font-medium">{assignment.alerts.team.total}</span>
                )}
              </div>
              {assignment.alerts.team.total > 0 && (
                <div className="pl-6">
                  <div className="flex flex-wrap gap-1">
                    {assignment.alerts.team.high_priority > 0 && (
                      <Badge variant="secondary" className="bg-priority-high text-muted">
                        {t('prioHigh')}: {assignment.alerts.team.high_priority}
                      </Badge>
                    )}
                    {assignment.alerts.team.medium_priority > 0 && (
                      <Badge variant="secondary" className="bg-priority-medium text-muted">
                        {t('prioMedium')}: {assignment.alerts.team.medium_priority}
                      </Badge>
                    )}
                    {assignment.alerts.team.low_priority > 0 && (
                      <Badge variant="secondary" className="bg-priority-low text-muted">
                        {t('prioLow')}: {assignment.alerts.team.low_priority}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Last Updated */}
        <Separator className="mt-4" />
        <div className="mt-6 text-xs text-muted-foreground text-center">
          {tc('lastUpdated')}: {format?.dateTime(lastRefresh, {timeStyle: "medium"})}
        </div>        
      </CardContent>
    </>
  )
}