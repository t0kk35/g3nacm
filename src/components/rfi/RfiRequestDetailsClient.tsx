'use client'

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useTranslations } from "next-intl";
import { RfiResponse } from "@/app/api/data/rfi/type"
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  MessageSquare,
  Send,
  User,
  XCircle,
} from "lucide-react";
import { formatDateToInterval } from '@/lib/date-time/formatting'

type Props = {
  rfiResponses: RfiResponse[]
}

export function RfiRequestDetailsClient({ rfiResponses }: Props) {
  
  const t = useTranslations('RfiRequest.Details.Responses')
  const orderedResponses = rfiResponses.sort((a,b) => new Date(b.create_datetime).getTime() - new Date(a.create_datetime).getTime())
  
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(orderedResponses[0]?.id ?? null);
  
  const selectedResponse = rfiResponses.find((r) => r.id === selectedResponseId);

  return (
    <div className="flex flex-row gap-4 w-full">
      <ScrollArea className="w-72 h-48">
        <div className="space-y-1 px-2">
          {orderedResponses.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              No responses yet
            </p>
          ): (
            orderedResponses.map((response) => (
              <button
                key={response.id}
                onClick={() => setSelectedResponseId(response.id)}
                className={cn(
                  "w-full text-left p-2 rounded-md transition-colors",
                  selectedResponseId === response.id ? "bg-accent" : "hover:bg-accent/50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium truncate">
                      {response.respondent_name || "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {response.is_complete ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <Clock className="h-3 w-3 text-amber-500" />
                    )}
                    {response.is_satisfactory === true && (
                      <CheckCircle2 className="h-3 w-3 text-blue-500" />
                    )}
                    {response.is_satisfactory === false && (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {response.repsonse_text || "No content"}
                </p>
                <span className="text-[10px] text-muted-foreground/70">
                  {formatDateToInterval(response.create_datetime)}
                </span>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
      <div className="flex-1">
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t('reponseTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            {selectedResponse ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {selectedResponse.respondent_name || t('responseUnknownRespondent')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={selectedResponse.is_complete ? "default" : "outline"}
                      className="text-xs"
                    >
                      {selectedResponse.is_complete ? t('responseComplete') : t('responseInComplete')}
                    </Badge>
                    {selectedResponse.is_satisfactory !== undefined && (
                      <Badge
                        variant={selectedResponse.is_satisfactory ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {selectedResponse.is_satisfactory ? t('responseSatisfactory') : t('responseUnSatisfactory')}
                      </Badge>
                    )}
                  </div>
                </div>
                <Separator />
                <ScrollArea className="h-20">
                  <p className="text-sm leading-relaxed">
                    {selectedResponse.repsonse_text || t('responseNoContent')}
                  </p>
                </ScrollArea>
                {selectedResponse.quality_notes && (
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">{t('reponseQualityNotes')}:</span>{" "}
                      {selectedResponse.quality_notes}
                    </p>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  {t('responseDateReceived')}: {formatDateToInterval(selectedResponse.create_datetime)}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('responseSelectToView')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}