import { EntityPriority } from "@/app/api/data/entity_state/entity-state"
import { Badge } from "../ui/badge"
import { cn } from "@/lib/utils"

type Props = {
    priority: EntityPriority
}

export function AlertPriorityBadgeAndText({ priority } : Props) {
  return (
    <div className="flex gap-2 items-center justify-center"> 
      <span className="text-xs text-muted-foreground">Priority:</span>
        <AlertPriorityBadge priority={priority} />
    </div>
  )
}

export function AlertPriorityBadge({ priority }: Props) {
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