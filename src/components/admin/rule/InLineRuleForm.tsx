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
import { EvalRule, EvalInputSchema } from "@/lib/eval-engine/types"
import { UserTeam } from "@/app/api/data/user/user"
import { Save, X, AlertCircle } from "lucide-react"
import { validateRule } from "@/lib/eval-engine/validation"

interface InlineRuleFormProps {
  rule: EvalRule
  teams: UserTeam[]
  schema: EvalInputSchema
  onSave: (rule: EvalRule) => void
  onCancel: () => void
}

export function InlineRuleForm({ rule, teams, schema, onSave, onCancel }: InlineRuleFormProps) {
  const [formData, setFormData] = useState({
    rank: rule.rank,
    output: rule.output,
    condition: rule.condition,
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
      group: rule.group,
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
      id: rule.id,
      group: rule.group,
      input_schema_id: schema.id
    })
  }

  const validation = validateRule(formData)

  return (
    <div className="space-y-4 p-2 bg-muted/30 rounded-lg border-2 border-dashed">
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs">
          Editing Rule #{rule.rank}
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
            Save
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