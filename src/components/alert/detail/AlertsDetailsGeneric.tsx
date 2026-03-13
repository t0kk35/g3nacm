'use server'

import { authorizedPost } from "@/lib/org-filtering"
import { ComponentSection } from "@/app/api/data/entity/types"
import { getTypeIcon } from "../AlertTypeIcon"
import { AlertPriorityBadgeAndText } from "../AlertPriority"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert } from "@/app/api/data/alert/alert"
import { Separator } from "@/components/ui/separator"
import { EntityState } from "@/app/api/data/entity_state/entity-state"
import { ComponentSectionRenderer } from "@/components/ui/custom/component-section/ComponentSectionRenderer"
import { ClipboardList } from "lucide-react"

export async function AlertDetailsGeneric({ alert }: { alert: Alert }) {
  
  const componentBody = {
    "entity_id": alert.id,
    "section_code": `${alert.entity_state.entity_code}.details`,
    "initial_context": {
      "alert": { ...alert }
    }
  }

  const screenData = await authorizedPost(
    `${process.env.DATA_URL}/api/data/entity/component_section`,
    JSON.stringify(componentBody)).
  then(res => res.json()).
  then(j=> j as ComponentSection)
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{alert.alert_identifier}</span>
          <AlertPriorityBadgeAndText priority={alert.entity_state.priority} />
          {getTypeIcon(alert.entity_state.entity_code)}
        </CardTitle>
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
      </CardHeader>
      <CardContent>
        <ComponentSectionRenderer
          sectionConfig={screenData.section_config}
          context={screenData.context}
          errors={screenData.errors}
        />
      </CardContent>
      <CardFooter>
        <div className="mt-4">
          <EntityAuditButton audit={alert.entity_state_history} />
        </div>        
      </CardFooter>
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

export async function AlertDetailsGenericSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center gap-4">
          {/* Alert Identifier */}
          <Skeleton className="h-6 w-40" />

          {/* Priority Badge */}
          <Skeleton className="h-6 w-24" />

          {/* Type Icon */}
          <Skeleton className="h-6 w-6 rounded-full" />
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Description */}
        <div className="text-sm space-y-2">
          <div className="flex gap-2 items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>

        {/* Org Unit */}
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
          <div className="flex gap-2 items-center">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>

        <Separator className="my-2" />

        {/* Table */}
        <div className="mt-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-12" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {[1, 2].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-10" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Audit Button */}
        <div className="mt-4">
          <Skeleton className="h-9 w-40 rounded-md" />
        </div>
      </CardContent>
    </Card>
  )
}