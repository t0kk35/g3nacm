'use client'

import { Alert } from "@/app/api/data/alert/alert";
import { Separator } from "@/components/ui/separator";
import { PenOff } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Markdown } from "@/components/ui/custom/markdown";

type Props = { alert: Alert }

export function AlertUserComment({ alert }: Props) {

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
        ) : 
        (
          <div className="text-center py-8 text-muted-foreground w-48">
            <PenOff className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No Comment</p>
          </div>
        )
      }
    </div>
  )
}