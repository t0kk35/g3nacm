"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Move, ChevronDown } from "lucide-react"
import { EvalRuleCondition, EvalAtomicCondition, EvalConditionGroup, EvalSchemaField } from "@/lib/eval-engine/types"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ConditionBuilderProps {
  condition: EvalRuleCondition
  onChange: (condition: EvalRuleCondition) => void
  fields: EvalSchemaField[]
  level?: number
}

const OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "greater_equal", label: "Greater or Equal" },
  { value: "less_equal", label: "Less or Equal" },
  { value: "contains", label: "Contains" },
  { value: "starts_with", label: "Starts With" },
  { value: "ends_with", label: "Ends With" },
  { value: "in", label: "In" },
  { value: "not_in", label: "Not In" },
]

export function ConditionBuilder({ condition, onChange, fields, level = 0 }: ConditionBuilderProps) {
  const isGroup = condition.type === "group"
  const groupCondition = condition as EvalConditionGroup
  const atomicCondition = condition as EvalAtomicCondition

  const addAtomicCondition = () => {
    if (isGroup) {
      const newCondition: EvalAtomicCondition = {
        type: "atomic",
        field: fields[0]?.field_path || "",
        operator: "equals",
        value: "",
      }
      onChange({
        ...groupCondition,
        conditions: [...groupCondition.conditions, newCondition],
      })
    }
  }

  const addGroupCondition = () => {
    if (isGroup) {
      const newGroupCondition: EvalConditionGroup = {
        type: "group",
        operator: "AND",
        conditions: [],
      }
      onChange({
        ...groupCondition,
        conditions: [...groupCondition.conditions, newGroupCondition],
      })
    }
  }

  const removeCondition = (index: number) => {
    if (isGroup) {
      onChange({
        ...groupCondition,
        conditions: groupCondition.conditions.filter((_, i) => i !== index),
      })
    }
  }

  const updateCondition = (index: number, newCondition: EvalRuleCondition) => {
    if (isGroup) {
      const updatedConditions = [...groupCondition.conditions]
      updatedConditions[index] = newCondition
      onChange({
        ...groupCondition,
        conditions: updatedConditions,
      })
    }
  }

  const convertToGroup = () => {
    const newGroupCondition: EvalConditionGroup = {
      type: "group",
      operator: "AND",
      conditions: [condition],
    }
    onChange(newGroupCondition)
  }

  const convertToAtomic = () => {
    const newAtomicCondition: EvalAtomicCondition = {
      type: "atomic",
      field: fields[0]?.field_path || "",
      operator: "equals",
      value: "",
    }
    onChange(newAtomicCondition)
  }

  if (isGroup) {
    // Root level (level 0) gets special prominent styling
    if (level === 0) {
      return (
        <div className="space-y-4">
          {/* Prominent root operator section */}
          <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-primary">Root Logic:</span>
                <span className="text-xs text-muted-foreground">Combine all groups/conditions with</span>
                <Badge variant="default" className="text-sm px-3 py-1">
                  {groupCondition.operator}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Select
                  value={groupCondition.operator}
                  onValueChange={(value: "AND" | "OR") => onChange({ ...groupCondition, operator: value })}
                >
                  <SelectTrigger className="w-24 h-9 font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">AND</SelectItem>
                    <SelectItem value="OR">OR</SelectItem>
                  </SelectContent>
                </Select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" size="sm" variant="outline">
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={addAtomicCondition}>
                      <Plus className="h-3 w-3 mr-2" />
                      Add Condition
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={addGroupCondition}>
                      <Plus className="h-3 w-3 mr-2" />
                      Add Group
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button type="button" size="sm" variant="outline" onClick={convertToAtomic}>
                  Convert to Simple
                </Button>
              </div>
            </div>
          </div>

          {/* Child conditions/groups */}
          <div className="space-y-3">
            {groupCondition.conditions.map((subCondition, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-1">
                  <ConditionBuilder
                    condition={subCondition}
                    onChange={(newCondition) => updateCondition(index, newCondition)}
                    fields={fields}
                    level={level + 1}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeCondition(index)}
                  className="text-destructive hover:text-destructive mt-2"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {groupCondition.conditions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                No conditions added. Click the + button above to add a condition or group.
              </div>
            )}
          </div>
        </div>
      )
    }

    // Nested groups (level 1+) keep card styling with enhanced operator visibility
    return (
      <Card className="ml-4 border-2">
        <CardHeader className="pb-2 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-semibold">Group Condition</CardTitle>
              <Badge variant="secondary" className="text-xs px-2 py-1 font-semibold">
                {groupCondition.operator}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Select
                value={groupCondition.operator}
                onValueChange={(value: "AND" | "OR") => onChange({ ...groupCondition, operator: value })}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">AND</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" size="sm" variant="outline">
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={addAtomicCondition}>
                    <Plus className="h-3 w-3 mr-2" />
                    Add Condition
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={addGroupCondition}>
                    <Plus className="h-3 w-3 mr-2" />
                    Add Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {groupCondition.conditions.map((subCondition, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex-1">
                <ConditionBuilder
                  condition={subCondition}
                  onChange={(newCondition) => updateCondition(index, newCondition)}
                  fields={fields}
                  level={level + 1}
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeCondition(index)}
                className="text-destructive hover:text-destructive mt-2"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {groupCondition.conditions.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No conditions added. Click the + button to add a condition.
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${level > 0 ? "ml-4" : ""}`}>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Field</Label>
            <Select
              value={atomicCondition.field}
              onValueChange={(value) => onChange({ ...atomicCondition, field: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {fields.map((field) => (
                  <SelectItem key={field.field_path} value={field.field_path}>
                    {field.field_path} ({field.field_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Operator</Label>
            <Select
              value={atomicCondition.operator}
              onValueChange={(value: any) => onChange({ ...atomicCondition, operator: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Value</Label>
            <Input
              value={String(atomicCondition.value)}
              onChange={(e) => {
                const selectedField = fields.find((f) => f.field_path === atomicCondition.field)
                let value: string | number | boolean = e.target.value

                if (selectedField?.field_type === "number") {
                  value = Number(e.target.value) || 0
                } else if (selectedField?.field_type === "boolean") {
                  value = e.target.value.toLowerCase() === "true"
                }

                onChange({ ...atomicCondition, value })
              }}
              placeholder="Enter value"
            />
          </div>
        </div>

        {level === 0 && (
          <div className="flex justify-end mt-3">
            <Button type="button" size="sm" variant="outline" onClick={convertToGroup}>
              <Move className="h-3 w-3 mr-1" />
              Convert to Group
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
