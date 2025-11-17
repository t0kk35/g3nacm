'use server'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card"
import { Alert, TMDetection } from "@/app/api/data/alert/alert"
import { getTypeIcon } from "../../AlertTypeIcon"
import { AlertPriorityBadgeAndText } from "../../AlertPriority"
import { EntityState } from "@/app/api/data/entity_state/entity-state"
import { ClipboardList } from "lucide-react"

export async function AlertDetailsDetection({ alert }: { alert: Alert }) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{alert.alert_identifier}</span>
          <AlertPriorityBadgeAndText priority={alert.entity_state.priority} />
          {getTypeIcon(alert.alert_type)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm">
          <p>
            <strong>Description:</strong> {alert.description}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <p>
            <strong>OrgUnit :</strong> {alert.org_unit_code}
          </p>
        </div>
        <Separator className="my-2" />
        <div className="mt-2">
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Detection Name</TableHead>
                  <TableHead>Info</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Time Frame</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(alert.detections as TMDetection[]).map((detection) => (
                  <TableRow key={detection.id}>
                    <TableCell className="text-xs">{detection.name}</TableCell>
                    <TableCell className="text-xs">{detection.info}</TableCell>
                    <TableCell>{detection.score}</TableCell>
                    <TableCell className="text-sm">{detection.time_frame}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="mt-4">
          <EntityAuditButton audit={alert.entity_state_history} />
        </div>
      </CardContent>
    </Card>
  )
}

type EntityAuditProps = {
  audit: EntityState[];
}

function EntityAuditButton ({ audit } : EntityAuditProps) {
  const sortedAudit = audit.sort(
    (a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime(),
  )
  
  return (
    <HoverCard openDelay={200} closeDelay={300}>
      <HoverCardTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <ClipboardList className="h-4 w-4" />
          Audit
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-96" align="start">
        <div className="font-medium mb-2">Audit History</div>
        <ScrollArea className="h-40">
          <div className="space-y-2">
            {sortedAudit.map((entry, index) => (
              <div key={index} className="border-b pb-2 last:border-0">
                <p className="text-sm">Action : <strong>{entry.action_name}</strong></p>
                <p className="text-xs text-muted-foreground">
                  From State: <strong>{entry.from_state_name}</strong>, To State: <strong>{entry.to_state_name}</strong>
                </p>
                <p className="text-xs">
                  On: <strong>{entry.date_time}</strong>, By: <strong>{entry.user_name}</strong>
                </p>
              </div>
            ))}
            {sortedAudit.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">No audit history available</div>
            )}
          </div>
        </ScrollArea>
      </HoverCardContent>
    </HoverCard>
  )  
}