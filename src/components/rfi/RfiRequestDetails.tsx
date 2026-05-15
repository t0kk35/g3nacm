'use server'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "../ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare } from "lucide-react";
import { RfiRequestDetailsClient } from "./RfiRequestDetailsClient"
import { formatDateToInterval } from '@/lib/date-time/formatting'
import { RfiRequest } from "@/app/api/data/rfi/type"
import { RfiResponse } from "@/app/api/data/rfi/type"
import Link from 'next/link'
import { getTranslations, getFormatter } from "next-intl/server"

type Props = { 
  rfiRequest: RfiRequest
  rfiResponses: RfiResponse[]
}

export async function RfiRequestDetails({ rfiRequest, rfiResponses }: Props) {
  const t = await getTranslations('RfiRequest.Details.Request')
  const format = await getFormatter();
  const linked_entity_link = rfiRequest.linked_entity.id ? rfiRequest.linked_entity.display_url + '/' + rfiRequest.linked_entity.id : undefined

  return (
    <div className="space-y-2">
      <Card className="w-full">
        <CardHeader>
          <div className="flex gap-2 items-center justify-between">
            <span className="font-mono text text-muted-foreground">{rfiRequest.identifier}</span>
            <Badge variant="default">
              {rfiRequest.entity_state.to_state_name}
            </Badge>
          </div>
          <CardTitle className="text-sm font-medium leading-tight mt-1">
            {rfiRequest.title}
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{rfiRequest.channel.type}</span>
            <span>•</span>
            <span>{rfiRequest.recipient_contact_details!.email_address}</span>
            <span>•</span>
            <span>{formatDateToInterval(rfiRequest.create_datetime)}</span>
          </div>
        </CardHeader>
        <Separator />
        <CardContent>
          <div className="space-y-2">
            {rfiRequest.tags && rfiRequest.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {rfiRequest.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              <strong>{t('datesSectionCreateDate')}: </strong> {format.dateTime(new Date(rfiRequest.create_datetime), {dateStyle: "medium", timeStyle: "medium"})}
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>{t('dateSectionDueDate')}: </strong> {format.dateTime(new Date(rfiRequest.due_datetime), {dateStyle: "medium", timeStyle: "medium"})}
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>{t('dateSectionReminderDate')}: </strong> {rfiRequest.reminder_datetime? format.dateTime(new Date(rfiRequest.reminder_datetime), {dateStyle: "medium", timeStyle: "medium"}) : t('dateSectionReminderNotSet')}
            </p>
            <Separator />
            <ScrollArea className="text-sm whitespace-pre-wrap h-32">
              {rfiRequest.body}
            </ScrollArea>
            { linked_entity_link && (
              <>
                <Separator />
                <div className="text-xs text-muted-foreground">
                  <p><strong>{t('linkedToDescription')}: </strong>{rfiRequest.linked_entity.description}</p>
                  <p>
                    <strong>{t('linkedToId')}: </strong>
                    <Link href={linked_entity_link} className='hover:underline'>
                      {rfiRequest.linked_entity.identifier}
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium leading-tight mt-1">
            <div className="flex gap-2 items-center">
              <MessageSquare className="h-4 w-4" />
              <span className="font-mono text text-muted-foreground">
                {t('reponsesTitle')} ({rfiResponses.length})
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RfiRequestDetailsClient rfiResponses={rfiResponses} />
        </CardContent>
      </Card>
    </div>
  )
}