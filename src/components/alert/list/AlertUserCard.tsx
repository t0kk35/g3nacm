import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Button } from "@/components/ui/button"
import { AlertPriorityBadgeAndText } from "../AlertPriority"
import { AlertUserStatus } from "@/components/alert/list/AlertUserStatus"
import { AlertUserDetection } from "@/components/alert/list/AlertUserDetection"
import { AlertUserComment } from "./AlertUserComment"
import { Separator } from "@/components/ui/separator"
import { getTypeIcon } from "../AlertTypeIcon"
import { Alert } from "@/app/api/data/alert/alert"
import Link from "next/link"

type Props = { alert: Alert }

export function AlertUserCard({ alert }: Props) {

    return (
        <div className="shadow-md rounded-lg p-4 border-2 flex flex-col h-full">
            <AlertPriorityBadgeAndText priority={alert.entity_state.priority} />
            <div className="flex justify-between items-start mb-2">
                <Link href={`/alert/${alert.id}`} className="text-lg font-semibold hover:underline">
                    {alert.alert_identifier}
                </Link>
                {getTypeIcon(alert.alert_type)}
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
                    <strong>Alert Type:</strong> {alert.alert_type}
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
                    <HoverCardContent className="w-80">
                        <AlertUserDetection alert={alert} />
                    </HoverCardContent>
                </HoverCard>
            </div>
        </div>
    )
}