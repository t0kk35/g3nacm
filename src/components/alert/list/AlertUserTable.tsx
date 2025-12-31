'use client'

import Link from "next/link"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Button } from "@/components/ui/button"
import { AlertUserStatus } from "@/components/alert/list/AlertUserStatus"
import { AlertUserDetection } from "@/components/alert/list/AlertUserDetection"
import { Alert } from "@/app/api/data/alert/alert"
import { TanStackTable, tanStackColumnHelper } from "@/components/ui/custom/tanstack-table"

type Props = { data: Alert[] }

type TMAlertTable = {
  id: string;
  identifier: string;
  description: string;
  type: string;
  priority: string;
  alert_item_id: string
  alert_item_subject_name: string;
  status: string;
  orginal_alert: Alert;
}

export function AlertTable({ data }: Props) {
  
  // Create a column helper
  const colHelper = tanStackColumnHelper<TMAlertTable>();
  // Remap the alert data, flatten it out, that is easier to handle.
  const alertData = data.map(a=> {
    const at: TMAlertTable = {
      id: a.id,
      identifier: a.alert_identifier,
      description: a.description,
      type: a.alert_type,
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
    colHelper.accessor("type", "Type", "left", true),
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
    <div className="ontainer mx-auto">
      <TanStackTable columns={cols} data={alertData} visibilityChange={true} />
    </div>
  )
}