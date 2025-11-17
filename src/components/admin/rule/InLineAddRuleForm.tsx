"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ConditionBuilder } from "./ConditionBuilder"
import { UserTeam } from "@/app/api/data/user/user"
import type { EvalRule, EvalInputSchema, EvalAtomicCondition, EvalRuleCondition } from "@/lib/eval-engine/types"
import { Save, X, AlertCircle } from "lucide-react"
import { validateRule } from "@/lib/eval-engine/validation"

interface InlineAddRuleFormProps {
  teams: UserTeam[]
  schema: EvalInputSchema,
  group: string
  nextRank: number
  onSave: (rule: EvalRule) => void
  onCancel: () => void
}

export function InlineAddRuleForm({ teams, schema, group, nextRank, onSave, onCancel }: InlineAddRuleFormProps) {
  const [formData, setFormData] = useState<{
    rank: number
    output: string
    condition: EvalRuleCondition
  }>({
    rank: nextRank,
    output: "",
    condition: {
      type: "atomic",
      field: schema.fields[0]?.field_path || "",
      operator: "equals",
      value: "",
    } as EvalAtomicCondition,
  })

  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const validation = validateRule(formData)
    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      return
    }

    setValidationErrors([])
    onSave({
      ...formData,
      group,
    })
  }

  const handleSave = () => {
    const validation = validateRule(formData)
    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      return
    }

    setValidationErrors([])
    onSave({
      ...formData,
      group,
      input_schema_id: schema.id
    })
  }

  const validation = validateRule(formData)

  return (
    <div className="space-y-4 p-2 bg-primary/5 rounded-lg border-2 border-dashed border-primary/20">
      <div className="flex items-center justify-between">
        <Badge variant="default" className="text-xs">
          Adding New Rule #{formData.rank}
        </Badge>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onCancel}>
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="hover:opacity-90"
            disabled={!validation.isValid}
          >
            <Save className="h-3 w-3 mr-1" />
            Save Rule
          </Button>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Please fix the following errors:</p>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="rank" className="text-xs">
              Execution Rank
            </Label>
            <Input
              id="rank"
              type="number"
              min="1"
              value={formData.rank}
              onChange={(e) => setFormData({ ...formData, rank: Number.parseInt(e.target.value) })}
              className="h-8"
              required
            />
            <p className="text-xs text-muted-foreground">Lower numbers execute first</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="output" className="text-xs">
              Assigned Team *
            </Label>
            <Select
              value={formData.output}
              onValueChange={(value) => {
                setFormData({ ...formData, output: value })
                setValidationErrors([]) // Clear errors when user makes changes
              }}
            >
              <SelectTrigger className={`h-8 ${!formData.output ? "border-destructive" : ""}`}>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.name}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Rule Condition *</Label>
          <div className="border rounded-md p-2 bg-background">
            <ConditionBuilder
              condition={formData.condition}
              onChange={(condition) => {
                setFormData({ ...formData, condition })
                setValidationErrors([]) // Clear errors when user makes changes
              }}
              fields={schema.fields}
            />
          </div>
        </div>
      </form>
    </div>
  )
}
