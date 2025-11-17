import { Alert } from "@/app/api/data/alert/alert";
import { Separator } from "@/components/ui/separator";

type Props = { alert: Alert }

export function AlertUserStatus({ alert }: Props ) {
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