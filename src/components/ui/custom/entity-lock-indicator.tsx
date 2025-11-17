'use client'

import { Skeleton } from "../skeleton"
import { Clock, Lock, LockOpen, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEntityLock } from "@/contexts/entity-lock-context"

export function EntityLockIndicator() {
  const { isLocked, isLockedByCurrentUser, lockUserName, timeSpent, entityId } = useEntityLock()

  // Format seconds into HH:MM:SS
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0"),
    ].join(":")
  }

  if (!isLocked) {
    return <EntityLockIndicatorSkeleton />
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border",
        !isLockedByCurrentUser && "bg-red-500 text-white",
      )}
    >
      <div className="flex items-center gap-1.5">
        { isLockedByCurrentUser ? (<Lock className="h-3.5 w-3.5 text-chart-1"/>) : <LockOpen className="h-3.5 w-3.5" /> }
        <span>Entity: <span className="text-muted-foreground">{entityId}</span></span>
      </div>
      <div className="w-px h-4 bg-muted-foreground" />
      <div className="flex items-center gap-1.5">
        <User className="h-3.5 w-3.5 text-chart-1" />
        <span>Locked by: <span className="font-semibold">{lockUserName}</span></span>
      </div>
      <div className="w-px h-4 bg-muted-foreground" />
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-chart-1" />
        <span className="font-mono">{formatTime(timeSpent)}</span>
      </div>
    </div>
  )
}

export function EntityLockIndicatorSkeleton() {
  return (
      <div className="flex flex-col space-y-3 items-center border-2 rounded-lg p-2">
          <Skeleton className="h-6 w-20" />      
      </div>
  )
}