"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, ChevronRight, Clock, DollarSign, User, UserCheck, Building, Landmark, Building2, ArrowLeftRight, X, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { TFAlert, TFDetection } from "@/app/api/data/alert/alert"
import { TFTransaction, TFParticipant, TFFinancialTransaction } from "@/app/api/data/transaction/transaction"
import { ScoreBar } from "@/components/ui/custom/score-bar"

type Props = {
  alert: TFAlert
  tfTransaction: TFTransaction
}

export function TFAlertDetailsMainClient({ alert, tfTransaction }: Props) {
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(new Set())
  const [expandedParticipants, setExpandedParticipants] = useState<Set<string>>(new Set())
  const [clearedDetections, setClearedDetections] = useState<Set<string>>(new Set())
  const [isInitialized, setIsInitialized] = useState(false)
  const [investigationStartTime, setInvestigationStartTime] = useState<Date | null>(null)

  // Refs for scrolling to specific elements
  const participantRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const detectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Get transactions that have detections
  const transactionsWithDetections = tfTransaction.type_specific.transactions.filter((t) =>
    alert.detections.some((detection) => detection.transaction_id === t.transactionId),
  )

  const getActiveDetections = (): TFDetection[] => {
    return alert.detections.filter((d) => !clearedDetections.has(d.id))
  }

  const getDetectionsForTransaction = (transactionId: string): TFDetection[] => {
    return getActiveDetections().filter((d) => d.transaction_id === transactionId)
  }

  const getDetectionsForParticipant = (transactionId: string, participantRole: string): TFDetection[] => {
    return getActiveDetections().filter(
      (d) => d.transaction_id === transactionId && d.participant_role === participantRole,
    )
  }

  const findFirstMatch = (): { transactionId: string; participantRole: string; detectionId: string } | null => {
    const activeDetections = getActiveDetections()
    if (activeDetections.length === 0) return null

    // Iterate through transactions in display order to find the first match
    for (const transaction of tfTransaction.type_specific.transactions) {
      const transactionDetections = activeDetections.filter((d) => d.transaction_id === transaction.transactionId)

      if (transactionDetections.length > 0) {
        // Within this transaction, iterate through participants in display order
        for (const participant of transaction.participants) {
          const participantDetections = transactionDetections.filter((d) => d.participant_role === participant.role)
          if (participantDetections.length > 0) {
            // Return the first detection for this participant
            const firstDetection = participantDetections[0]
            return {
              transactionId: firstDetection.transaction_id,
              participantRole: firstDetection.participant_role,
              detectionId: firstDetection.id,
            }
          }
        }
      }
    }

    return null
  }

  const scrollToElement = (elementRef: HTMLDivElement | null) => {
    if (elementRef) {
      elementRef.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      })
    }
  }

  const openAndScrollToMatch = (transactionId: string, participantRole: string, detectionId: string) => {
    // Open transaction
    setExpandedTransactions((prev) => new Set([...prev, transactionId]))

    // Open participant
    const participantKey = `${transactionId}-${participantRole}`
    setExpandedParticipants((prev) => new Set([...prev, participantKey]))

    // Scroll to detection after a short delay to allow for expansion
    setTimeout(() => {
      const detectionRef = detectionRefs.current[detectionId]
      if (detectionRef) {
        scrollToElement(detectionRef)
      } else {
        // Fallback to participant if detection ref not found
        const participantRef = participantRefs.current[participantKey]
        scrollToElement(participantRef)
      }
    }, 300)
  }

  const clearDetection = (detectionId: string) => {
    
    // Calculate the new cleared detections set locally. This code had a problem because it tried to access the clearedDetection further down
    // And the state gets updated asynchronously. So we can not use the global findFirstMatch.
    const newClearedDetections = new Set([...clearedDetections, detectionId])
    setClearedDetections(newClearedDetections)
    
    // Find the detection being cleared
    const detection = alert.detections.find((d) => d.id === detectionId)
    if (!detection) return

    const participantKey = `${detection.transaction_id}-${detection.participant_role}`

    // Show progress toast
    const newClearedCount = clearedDetections.size + 1
    const totalDetections = alert.detections.length
    const remainingCount = totalDetections - newClearedCount
    const progressPercentage = Math.round((newClearedCount / totalDetections) * 100)

    if (remainingCount > 0) {
      toast.info(`Progress: ${newClearedCount}/${totalDetections} (${progressPercentage}%) • ${remainingCount} remaining`)
    }

    // Create a local function that uses the new cleared detections
    const getActiveDetectionsWithNewCleared = (): TFDetection[] => {
      return alert.detections.filter((d) => !newClearedDetections.has(d.id))
    }

    const getDetectionsForParticipantWithNewCleared = (transactionId: string, participantRole: string): TFDetection[] => {
      return getActiveDetectionsWithNewCleared().filter(
        (d) => d.transaction_id === transactionId && d.participant_role === participantRole,
      )
    }

    const getDetectionsForTransactionWithNewCleared = (transactionId: string): TFDetection[] => {
      return getActiveDetectionsWithNewCleared().filter((d) => d.transaction_id === transactionId)
    }

    const findFirstMatchWithNewCleared = (): {
      transactionId: string
      participantRole: string
      detectionId: string
    } | null => {
      const activeDetections = getActiveDetectionsWithNewCleared()
      if (activeDetections.length === 0) return null

      // Iterate through transactions in display order to find the first match
      for (const transaction of tfTransaction.type_specific.transactions) {
        const transactionDetections = activeDetections.filter((d) => d.transaction_id === transaction.transactionId)

        if (transactionDetections.length > 0) {
          // Within this transaction, iterate through participants in display order
          for (const participant of transaction.participants) {
            const participantDetections = transactionDetections.filter((d) => d.participant_role === participant.role)

            if (participantDetections.length > 0) {
              // Return the first detection for this participant
              const firstDetection = participantDetections[0]
              return {
                transactionId: firstDetection.transaction_id,
                participantRole: firstDetection.participant_role,
                detectionId: firstDetection.id,
              }
            }
          }
        }
      }
      return null
    }

    // Check if this participant will have any remaining detections using the new cleared set
    const remainingDetections = getDetectionsForParticipantWithNewCleared(
      detection.transaction_id,
      detection.participant_role,
    )    

    setTimeout(() => {
      if (remainingDetections.length === 0) {
        // Close this participant since no more detections
        setExpandedParticipants((prev) => {
          const newSet = new Set(prev)
          newSet.delete(participantKey)
          return newSet
        })

        // Check if transaction has any remaining detections using the new cleared set
        const remainingTransactionDetections = getDetectionsForTransactionWithNewCleared(detection.transaction_id)

        if (remainingTransactionDetections.length === 0) {
          // Close transaction if no more detections
          setExpandedTransactions((prev) => {
            const newSet = new Set(prev)
            newSet.delete(detection.transaction_id)
            return newSet
          })
        }
      }
      // Move to next match
      const nextMatch = findFirstMatchWithNewCleared()
      if (nextMatch) {
        setTimeout(() => {
          openAndScrollToMatch(nextMatch.transactionId, nextMatch.participantRole, nextMatch.detectionId)
        }, 200)
      }
    }, 100)
  }

  // Initialize: open first match on component mount
  useEffect(() => {
    if (!isInitialized) {
      const firstMatch = findFirstMatch()
      if (firstMatch) {
        setTimeout(() => {
          openAndScrollToMatch(firstMatch.transactionId, firstMatch.participantRole, firstMatch.detectionId)
          setIsInitialized(true)
          setInvestigationStartTime(new Date())

          // Show investigation start toast
          toast.info(`${alert.detections.length} detection${alert.detections.length !== 1 ? "s" : ""} to review for ${alert.alert_identifier}`)
        }, 500) // Delay to ensure component is fully rendered
      }
    }
  }, [isInitialized, toast, alert.detections.length, alert.alert_identifier])

  // Handle completion: close all sections and scroll to top when all matches cleared
  useEffect(() => {
    const activeDetections = getActiveDetections()
    const totalDetections = alert.detections.length

    if (totalDetections > 0 && activeDetections.length === 0 && clearedDetections.size > 0) {
      // Calculate investigation time
      const endTime = new Date()
      const startTime = investigationStartTime || endTime
      const investigationTimeMs = endTime.getTime() - startTime.getTime()
      const investigationTimeSeconds = Math.round(investigationTimeMs / 1000)
      const investigationTimeMinutes = Math.round(investigationTimeSeconds / 60)

      // Show completion toast
      toast( "Investigation Complete! 🎉" + `All ${totalDetections} detection${totalDetections !== 1 ? "s" : ""} cleared in ${
          investigationTimeMinutes > 0 ? `${investigationTimeMinutes}m` : `${investigationTimeSeconds}s`
        }`)

      // All matches have been cleared, close everything and scroll to top
      setTimeout(() => {
        setExpandedTransactions(new Set())
        setExpandedParticipants(new Set())

        // Scroll to top after sections are closed
        setTimeout(() => {
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          })
        }, 300)
      }, 500) // Small delay to let user see the last clear action
    }
  }, [clearedDetections, alert.detections.length, investigationStartTime, toast])

  const toggleTransaction = (transactionId: string) => {
    const newExpanded = new Set(expandedTransactions)
    if (newExpanded.has(transactionId)) {
      newExpanded.delete(transactionId)
    } else {
      newExpanded.add(transactionId)
    }
    setExpandedTransactions(newExpanded)
  }

  const toggleParticipant = (key: string) => {
    const newExpanded = new Set(expandedParticipants)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedParticipants(newExpanded)
  }

  const formatAddress = (addressStr: string): string => {
    try {
      const addr = JSON.parse(addressStr)
      return `${addr.StrtNm || ""}, ${addr.TwnNm || ""} ${addr.PstCd || ""}, ${addr.Ctry || ""}`
        .replace(/,\s*,/g, ",")
        .trim()
    } catch {
      return addressStr
    }
  }

  const formatFieldValue = (field: any): string => {
    if (field.type === "address") {
      return formatAddress(field.value)
    }
    return field.value
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "debtor":
        return <User className="h-4 w-4" />
      case "creditor":
        return <UserCheck className="h-4 w-4" />
      case "debtorAgent":
        return <Landmark className="h-4 w-4" />
      case "creditorAgent":
        return <Landmark className="h-4 w-4" />
      case "intermediaryAgent":
        return <ArrowLeftRight className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getPreviewFields = (participant: TFParticipant): { label: string; value: string }[] => {
    return participant.fields.filter(f=>f.isPreview)
      .map((f) => {
        if (!f) return null
        return {
          label: f.display_label,
          value: formatFieldValue(f),
        }
      })
      .filter(Boolean) as { label: string; value: string }[]
  }

  const transactionHits = new Set(alert.detections.map((d) => d.transaction_id)).size
  const participantHits = new Set(alert.detections.map((d) => d.participant_role)).size
  const uniqueListsHits = new Set(alert.detections.map((d) => d.list_name)).size
  const activeDetections = getActiveDetections()
  const totalDetections = alert.detections.length
  const clearedCount = clearedDetections.size

  return (
    <div className="space-y-4">

      {/* Alert Header */}
      <Card className="border-l-4 border-l-chart-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <CardTitle className="text-lg">{alert.alert_identifier}</CardTitle>
                <p className="text-sm text-muted-foreground">{alert.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-char-1 text-chart-1">
                Alert
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{new Date(alert.create_date_time).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>
                {alert.alert_item.details.amount} {alert.alert_item.details.currency}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Assigned to:</span> {alert.entity_state.assigned_to_user_name}
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span> {alert.entity_state.to_state_name}
            </div>
          </div>

          { /* Alert Statistics */ }
          <div className="mt-2 pt-4 border-t">
            <h4 className="text-sm font-medium mb-3 text-muted-foreground">Alert Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-muted-foreground">{totalDetections}</p>
                <p className="text-muted-foreground">Total Hit{ totalDetections > 1 ? "s" : ""}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-muted-foreground">{transactionHits}</p>
                <p className="text-muted-foreground">Transaction{transactionHits > 1 ? "s" : ""} with Hits</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-muted-foreground">{participantHits}</p>
                <p className="text-muted-foreground">Participant Hit{participantHits > 1 ? "s" : ""}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-muted-foreground">{uniqueListsHits}</p>
                <p className="text-muted-foreground">Unique List{uniqueListsHits > 1 ? "s" : ""} w/ Hit</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-muted-foreground">{clearedCount}</p>
                <p className="text-muted-foreground">Cleared</p>
              </div>
            </div>
          </div>

          {/* Progress indicator */}
          {totalDetections > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>Investigation Progress</span>
                <span>
                  {clearedCount}/{totalDetections} cleared
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-chart-1 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(clearedCount / totalDetections) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success message when all cleared */}
      {activeDetections.length === 0 && totalDetections > 0 && (
        <Card className="border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <h3 className="font-medium text-green-800 dark:text-green-200">All Detections Cleared</h3>
                <p className="text-sm text-green-600 dark:text-green-300">
                  Investigation complete. All {totalDetections} detection{totalDetections !== 1 ? "s" : ""} have been
                  cleared.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Message Details</CardTitle>
            <Badge variant="outline" className="border-char-1 text-chart-1">
              Message
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Message ID:</span>
              <div className="font-mono text-xs">{tfTransaction.identifier}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Type:</span>
              <div>{tfTransaction.type_specific.message_type}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Amount:</span>
              <div>
                {tfTransaction.type_specific.amount} {tfTransaction.type_specific.currency}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Submitted:</span>
              <div>{new Date(tfTransaction.submit_date_time).toLocaleString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Transactions ({tfTransaction.type_specific.transactions.length})</CardTitle>
            <Badge variant="outline" className="border-char-1 text-chart-1">
              Transaction(s)
            </Badge>
          </div>

        </CardHeader>
        <CardContent className="space-y-3">
          {transactionsWithDetections.map((transaction: TFFinancialTransaction) => {
            const detections = getDetectionsForTransaction(transaction.transactionId)
            const isExpanded = expandedTransactions.has(transaction.transactionId)

            return (
              <div key={transaction.transactionId} className="border rounded-lg">
                <Collapsible open={isExpanded} onOpenChange={() => toggleTransaction(transaction.transactionId)}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-4 h-auto">
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <div className="text-left">
                          <div className="font-medium">{transaction.transactionId}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(transaction.transactionDate).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {detections.length > 0 && (
                          <Badge variant="destructive">
                            {detections.length} Open Hit{detections.length !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4">
                      <Separator />

                      {/* Transaction Fields */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        {transaction.fields.map((field, idx) => (
                          <div key={idx}>
                            <span className="text-muted-foreground">{field.display_label}:</span>
                            <div>{formatFieldValue(field)}</div>
                          </div>
                        ))}
                      </div>

                      {/* Participants */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Participants</h4>
                        {transaction.participants.map((participant: TFParticipant) => {
                          const participantDetections = getDetectionsForParticipant(
                            transaction.transactionId,
                            participant.role,
                          )
                          const participantKey = `${transaction.transactionId}-${participant.role}`
                          const isParticipantExpanded = expandedParticipants.has(participantKey)
                          const hasDetections = participantDetections.length > 0
                          const previewFields = getPreviewFields(participant)

                          return (
                            <div
                              key={participant.role}
                              ref={(el) => { participantRefs.current[participantKey] = el }}
                              className={`border rounded-md ${hasDetections ? "border-destructive" : ""}`}
                            >
                              <Collapsible
                                open={isParticipantExpanded}
                                onOpenChange={() => toggleParticipant(participantKey)}
                              >
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className={`w-full justify-between p-3 h-auto ${
                                      hasDetections
                                        ? "bg-destructive/10 hover:bg-destructive/15 border-destructive"
                                        : ""
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        {isParticipantExpanded ? (
                                          <ChevronDown className="h-3 w-3 flex-shrink-0" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3 flex-shrink-0" />
                                        )}
                                        <div
                                          className={`flex-shrink-0 ${hasDetections ? "text-destructive" : ""}`}
                                        >
                                          {getRoleIcon(participant.role)}
                                        </div>
                                        <span
                                          className={`font-medium text-sm ${hasDetections ? "text-destructive" : ""}`}
                                        >
                                          {participant.label}
                                        </span>
                                      </div>

                                      {/* Preview Fields */}
                                      {previewFields.length > 0 && (
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-1 min-w-0">
                                          {previewFields.map((field, idx) => (
                                            <div key={idx} className="flex items-center gap-1 min-w-0">
                                              <span className="flex-shrink-0">{field.label}:</span>
                                              <span
                                                className={`font-medium truncate ${
                                                  hasDetections &&
                                                  participantDetections.some((d) => d.input_data === field.value)
                                                    ? "text-destructive font-semibold"
                                                    : ""
                                                }`}
                                              >
                                                {field.value}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {participantDetections.length > 0 && (
                                        <div className="flex items-center gap-1">
                                          {participantDetections.map((detection) => {
                                            return (
                                              <Badge
                                                key={detection.id}
                                                variant="destructive"
                                                className="text-xs"
                                              >
                                                <p className="font-mono">{detection.list_name}</p>
                                                <p>&nbsp;{detection.score}%</p>
                                              </Badge>
                                            )
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </Button>
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                  <div className="px-3 pb-3 space-y-3">
                                    <Separator />

                                    {/* Participant Fields */}
                                    <div className="space-y-2">
                                      { participant.fields.map((field, idx) => {
                                        const detections = getDetectionsForParticipant(transaction.transactionId, participant.role)
                                        const detection = detections.length > 0 && detections.find(d=> d.input_data === field.value)
                                        const isDetectedField = detections.length > 0 && detections.some(d=>d.input_data === field.value)

                                        return (
                                          <div key={idx}
                                            ref={(el) => { if (detection) detectionRefs.current[detection.id] = el }}
                                            className={`p-3 rounded-lg border ${
                                              isDetectedField ? "border-destructive bg-destructive/10" : "border-border"
                                            }`}
                                          >
                                            <div className="flex items-center justify-between mb-2">
                                              <p className="font-medium text-xs text-muted-foreground">{field.display_label}</p>
                                                { isDetectedField && (
                                                  <Badge variant="destructive" className="text-xs">
                                                    Hit Field
                                                  </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm break-all">{formatFieldValue(field)}</p>
                                            { isDetectedField && detection && ( 
                                              <div className="mt-3 pt-3 border-t space-y-2">
                                                <div className="grid grid-cols-5 gap-4 text-xs">
                                                  <div>
                                                    <p className="font-medium text-muted-foreground">Score</p>
                                                    <ScoreBar score={detection.score}/>
                                                  </div>
                                                  <div>
                                                    <p className="font-medium text-muted-foreground">Algorithm</p>
                                                    <p>{detection.algorithm}</p>
                                                  </div>
                                                  <div>
                                                    <p className="font-medium text-muted-foreground">List Name</p>
                                                    <p>{detection.list_name}</p>
                                                  </div>
                                                  <div>
                                                    <p className="font-medium text-muted-foreground">List Data</p>
                                                    <p>{detection.list_data}</p>
                                                  </div>
                                                  <Button
                                                    size="sm"
                                                    className="ml-2 h-6 px-2 text-xs"
                                                    onClick={() => clearDetection(detection.id)}
                                                  >
                                                    <X className="h-3 w-3 mr-1" />
                                                    Clear
                                                  </Button>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )                                        
                                      })}
                                    </div>
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
