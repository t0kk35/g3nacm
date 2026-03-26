"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { WorkflowFieldRendererProps } from "./workflow-action-form"

export const DateTimeField = ({ field, value, error, onChange }: WorkflowFieldRendererProps) => {
  const [open, setOpen] = useState(false)

  const date: Date | undefined = value ? new Date(value) : undefined

  const timeString = date
    ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
    : "00:00"

  const handleDaySelect = (selected: Date | undefined) => {
    if (!selected) {
      onChange(field.code, undefined)
      return
    }
    const [hours, minutes] = timeString.split(":").map(Number)
    selected.setHours(hours, minutes, 0, 0)
    onChange(field.code, selected.toISOString())
    setOpen(false)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = e.target.value.split(":").map(Number)
    const base = date ? new Date(date) : new Date()
    base.setHours(hours, minutes, 0, 0)
    onChange(field.code, base.toISOString())
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={field.code}>
        {field.label} {field.required && <span className="text-destructive">*</span>}
      </Label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={field.code}
              variant="outline"
              className={cn(
                "flex-1 justify-start text-left font-normal",
                !date && "text-muted-foreground",
                error && "border-destructive"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>{field.placeholder || "Pick a date"}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDaySelect}
              captionLayout="dropdown"
            />
          </PopoverContent>
        </Popover>
        <Input
          type="time"
          value={timeString}
          onChange={handleTimeChange}
          className={cn("w-32", error && "border-destructive")}
          aria-label={`${field.label} time`}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
