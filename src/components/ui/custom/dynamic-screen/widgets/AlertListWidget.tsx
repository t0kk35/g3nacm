'use client'

import { useEffect, useState } from 'react'
import { ComponentSection } from "@/app/api/data/entity/types"
import { ComponentSectionRenderer } from "@/components/ui/custom/component-section/ComponentSectionRenderer"
import { Alert } from '@/app/api/data/alert/alert'
import { EntityPriority } from "@/app/api/data/entity_state/entity-state"
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { CardHeader, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { PenOff, AlertCircle, Globe, UserCheck, FileSearch, RefreshCw, List, LayoutGrid } from 'lucide-react';
import { Markdown } from '@/components/ui/custom/markdown';
import { DynamicScreenError } from '../DynamicScreenError'
import Link from "next/link"
import { TanStackTable, tanStackColumnHelper } from "@/components/ui/custom/tanstack-table"
import { cn } from "@/lib/utils"

const HEADER_SIZE = 60;
const SUMMARY_SIZE = 45;
const FOOTER_SIZE = 40;
const ALERT_CARD_WIDTH = 310;

interface AlertAssignmentWidgetProps {
  title?: string
  refreshInterval?: number
  userName: string
  width: number
  height: number
}

export function AlertListWidget({ 
  title = 'Assigned Alerts', 
  refreshInterval = 60000,
  userName,
  width, 
  height
}: AlertAssignmentWidgetProps) {

  const [alertList, setAlertList] = useState<Alert[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  
  // Calculate the available height for the scrollarea
  const scrollAreaHeight = height - HEADER_SIZE - SUMMARY_SIZE - FOOTER_SIZE;
  const scrollAreaGridCols = Math.max(Math.trunc(width / ALERT_CARD_WIDTH), 1);

  const fetchAlertList = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/data/alert/list?assigned_to_user_name=${userName}`)
      if (!response.ok) throw new Error(`Failed to fetch alert list: ${response.status}`)
      const data = await response.json();
      setAlertList(data);
      setLastRefresh(new Date());      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alert list');
    } finally {
      setLoading(false);
    }
  }
  
  useEffect(() => {
    fetchAlertList();
    const interval = setInterval(fetchAlertList, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval])  

  if (error) return <DynamicScreenError title={title} error={error} onClick={fetchAlertList} />

  return (
    <>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="flex gap-2 items-center">
            <div>
              <ToggleGroup
                type="single"
                variant='outline'
                value={viewMode}
                onValueChange={(value: any) => value && setViewMode(value as "grid" | "table")}
              >
                <ToggleGroupItem value="table" aria-label="Table view">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="grid" aria-label="Grid view">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchAlertList}
              disabled={loading}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-2">
        
        {!alertList ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          viewMode === "grid" ? (
            <ScrollArea style={{ height: `${scrollAreaHeight}px` }}>
              <div className={`grid gap-4 grid-cols-${scrollAreaGridCols} mr-3`}>
                {alertList.map((alert) => (
                  <div key={alert.id} className="h-full">
                    <AlertUserCard alert={alert} />
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <AlertTable data={alertList} />
          )
        )}
        {/* Last Updated */}
        <Separator className="mt-4" />
        <div className="mt-6 text-xs text-muted-foreground text-center">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>    
      </CardContent>
    </>
  )
}

type UserCardProps = { alert: Alert }

function AlertUserCard({ alert }: UserCardProps) {
  return (
    <div className="shadow-md rounded-lg p-4 border-2 flex flex-col h-full">
      <AlertPriorityBadgeAndText priority={alert.entity_state.priority} />
        <div className="flex justify-between items-start mb-2">
          <Link href={`/alert/${alert.id}`} className="text-lg font-semibold hover:underline">
            {alert.alert_identifier}
          </Link>
          {getTypeIcon(alert.entity_state.entity_code)}
        </div>
        <Separator className="my-2" />
        <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
        <Separator className="my-2" />
        <div className="grow">
          <p className="text-sm mb-2">
            <strong>Data Item:</strong>{" "}
            { alert.alert_item.type === "SUB" && 
              <Link href={`/subject/${alert.alert_item.id}`} className="hover:underline">
                {alert.alert_item.details.subject_name}
              </Link>
            }
            { alert.alert_item.type === "TF" &&
              <Link href={`/tf_transaction/${alert.alert_item.id}`} className="hover:underline">
                {alert.alert_item.details.message_type}
              </Link>
            }
          </p>
          <p className="text-sm mb-2">
            <strong>Alert Entity:</strong> {alert.entity_state.entity_description}
          </p>
          <p className="text-sm mb-2">
            <strong>State:</strong> {alert.entity_state.to_state_name}
          </p>
        </div>

        <div className="flex justify-end mt-2 space-x-2">
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="outline" size="sm">
                Comment
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-auto">
              <AlertUserComment alert={alert} />
            </HoverCardContent>
          </HoverCard>
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="outline" size="sm">
                Status
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <AlertUserStatus alert={alert} />
            </HoverCardContent>
          </HoverCard>
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="outline" size="sm">
                Detections
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="min-w-2xl">
              <AlertUserDetection alert={alert} />
            </HoverCardContent>
          </HoverCard>
        </div>
      </div>
    )
}

function getTypeIcon(entity_code: string) {
  switch (entity_code) {
    case "aml.rule.alert":
      return <AlertCircle className="h-6 w-6 text-red-500" />
    case "CDD":
      return <UserCheck className="h-6 w-6 text-blue-500" />
    case "wlm.ns.alert":
      return <FileSearch className="h-6 w-6 text-yellow-500" />
    case "wlm.tf.alert":
      return <Globe className="h-6 w-6 text-orange-500" />
    default:
      return null
  }
}

type Props = { priority: EntityPriority }

function AlertPriorityBadgeAndText({ priority } : Props) {
  return (
    <div className="flex gap-2 items-center justify-center"> 
      <span className="text-xs text-muted-foreground">Priority:</span>
        <AlertPriorityBadge priority={priority} />
    </div>
  )
}

function AlertPriorityBadge({ priority }: Props) {
  return (
    <Badge className={
      cn((priority === "High") 
        ? "bg-priority-high" 
        : (priority === "Medium") 
          ? "bg-priority-medium" 
          : "bg-priority-low", "text-muted")}>
      {priority}
    </Badge>
  ) 
}

type AlertUserCommentProps = { alert: Alert }

function AlertUserComment({ alert }: AlertUserCommentProps) {

  return (
    <div>
      <p className="text-xs">
        On: <strong>{alert.entity_state.date_time.toLocaleLowerCase()}</strong>, By: <strong>{alert.entity_state.user_name}</strong>
      </p>
      <Separator className="my-2" />
      { alert.entity_state.comment ? (
        <ScrollArea>
          <div className="text-sm whitespace-pre-line wrap-break-word">
            <Markdown content={alert.entity_state.comment} />
          </div>
        </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground w-48">
            <PenOff className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No Comment</p>
          </div>
        )
      }
    </div>
  )
}

type AlertUserStatusProps = { alert: Alert }

function AlertUserStatus({ alert }: AlertUserStatusProps ) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Entity State</h3>
      <Separator className="my-2" />
      <div className="text-sm mb-2">
        <p>Action : <strong>{alert.entity_state.action_name}</strong></p>
        <p className="text-xs text-muted-foreground">
          From State: <strong>{alert.entity_state.from_state_name}</strong>, To State: <strong>{alert.entity_state.to_state_name}</strong>
        </p>
        <p className="text-xs">
          On: <strong>{alert.entity_state.date_time}</strong>, By: <strong>{alert.entity_state.user_name}</strong>
        </p>
      </div>
    </div>
  )
}

type AlertUserDetectionProps = { alert: Alert }

export function AlertUserDetection({ alert }: AlertUserDetectionProps) {

  const loadData = async (alert: Alert) => { 
    const componentBody = {
      "entity_id": alert.id,
      "section_code": "aml.rule.alert.detection_list",
      "initial_context": {
        "alert": { ...alert }
      }
    }
  
    const screenData = await fetch(
      "/api/data/entity/component_section",
      { method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(componentBody)
      }).
    then(res => res.json()).
    then(j=> j as ComponentSection)

    setScreenData(screenData)
 }

  const [screenData, setScreenData] = useState<ComponentSection | undefined>();
  
  useEffect(() => {
    loadData(alert)
  }, [alert]) 

  return (
    <div className="text-sm">
      <h3 className="text-sm font-semibold mb-2">Detections</h3>
      <Separator className="my-2" />
      { screenData ? (
        <ComponentSectionRenderer
          sectionConfig={screenData.section_config}
          context={screenData.context}
          errors={screenData.errors}
        />
      ) : (
        <AlertUserDetectionTableSkeleton />
      )}
    </div>
  )
}

function AlertUserDetectionTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <Skeleton className="h-6 w-48" />

      {/* Separator */}
      <Separator className="my-2" />

      {/* Table */}
      <div className="border rounded-md">
        {/* Table Header */}
        <div className="flex border-b px-4 py-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/3 ml-4" />
          <Skeleton className="h-4 w-1/3 ml-4" />
        </div>

        {/* Table Rows */}
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex px-4 py-4 border-b last:border-0">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/3 ml-4" />
            <Skeleton className="h-4 w-1/3 ml-4" />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>
    </div>
  )
}

type AlertTableProps = { data: Alert[] }

type AlertTable = {
  id: string;
  identifier: string;
  description: string;
  entity: string;
  priority: string;
  alert_item_id: string
  alert_item_subject_name: string;
  status: string;
  orginal_alert: Alert;
}

function AlertTable({ data }: AlertTableProps) {
  
  // Create a column helper for the Tanstack table.
  const colHelper = tanStackColumnHelper<AlertTable>();
  // Remap the alert data, flatten it out, that is easier to handle.
  const alertData = data.map(a=> {
    const at: AlertTable = {
      id: a.id,
      identifier: a.alert_identifier,
      description: a.description,
      entity: a.entity_state.entity_description,
      priority: a.entity_state.priority,
      alert_item_id: a.alert_item.id,
      alert_item_subject_name: a.alert_item.details.subject_name,
      status: a.entity_state.to_state_name,
      orginal_alert: a
    }
    return at
  })
  // Set up the columns.
  const cols = [
    colHelper.custom(
      "alert_identifier", 
      () => (<div className="font-semibold">Identifier</div>),
      ({ row }) => (
        <Link href={`/alert/${row.original.id}`} className="hover:underline">
          {row.original.identifier}
        </Link>
      ),
    ),
    colHelper.accessor("description", "Description", "left", false),
    colHelper.priority("priority", true),
    colHelper.accessor("entity", "Entity", "left", true),
    colHelper.custom(
      "alert_item",
      () => (<div className="font-semibold">Alert Item</div>),
      ({ row }) => (
        <Link href={`/subject/${row.original.alert_item_id}`} className="hover:underline">
          {row.original.alert_item_subject_name}
        </Link>
      )      
    ),
    colHelper.custom(
      "status",
      () => (<div className="font-semibold">Status</div>),
      ({ row }) => (
        <div className="flex space-x-2">
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="outline" size="sm">
                Status
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <AlertUserStatus alert={row.original.orginal_alert} />
            </HoverCardContent>
          </HoverCard>
        </div>
      )
    ),
    colHelper.custom(
      "detections",
      () => (<div className="font-semibold">Detections</div>),
      ({ row }) => (
        <div className="flex space-x-2">
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="outline" size="sm">
                Detections
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <AlertUserDetection alert={row.original.orginal_alert} />
            </HoverCardContent>
          </HoverCard>
        </div>
      ),
    )
  ]

  return (
    <div className="container mx-auto">
      <TanStackTable columns={cols} data={alertData} visibilityChange={true} />
    </div>
  )
}