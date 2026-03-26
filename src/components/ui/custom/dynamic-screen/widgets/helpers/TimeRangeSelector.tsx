import React from "react"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

type TimeRangeOption<T extends string> = {
  key: T
  value: string
}

type TimeRangeSelectorProps<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: readonly  TimeRangeOption<T>[]
  onRefresh?: () => void
  loading?: boolean
  className?: string
}

export function TimeRangeSelector<T extends string>({
  value,
  onChange,
  options,
  onRefresh,
  loading = false,
  className = ""
}: TimeRangeSelectorProps<T>) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.key} value={opt.key}>
              {opt.value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="h-6 w-6 p-0"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      )}
    </div>
  )
}