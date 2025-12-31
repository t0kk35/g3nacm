"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Plus, Edit, Trash2, GripVertical } from "lucide-react"
import { InlineRuleForm } from "./InLineRuleForm"
import { InlineAddRuleForm } from "./InLineAddRuleForm"
import { DeleteDialog } from "../DeleteDiaglog"
import { UserTeam } from "@/app/api/data/user/user"
import { OrgUnit } from "@/app/api/data/org_unit/org_unit"
import { EvalInputSchema, EvalRule } from "@/lib/eval-engine/types"
import { ConditionDisplay } from "./ConditionDisplay"
import { toast } from "sonner"

type Props = {
  teams: UserTeam[]
  orgUnits: OrgUnit[]
  schemas: EvalInputSchema[]
}

export function TeamAssignmentRulesClient( { teams, orgUnits, schemas }: Props) {
  const [rules, setRules] = useState<EvalRule[]>([])
  const [selectedSchema, setSelectedSchema] = useState<string>("")
  const [selectedOrgUnit, setSelectedOrgUnit] = useState<string>("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingRuleRank, setEditingRuleRank] = useState<number | null>(null)
  const [isRulesLoading, setIsRulesLoading] = useState(false);

  const currentGroup = selectedSchema && selectedOrgUnit ? `team.${selectedSchema}.${selectedOrgUnit}` : ""
  const currentSchemaObj = schemas.find((s) => s.name === selectedSchema)
  const nextRank = rules.length > 0 ? Math.max(...rules.map((r) => r.rank)) + 1 : 1

  useEffect(() => {
    if (currentGroup) {
      loadRules()
    }
  }, [currentGroup])

  const loadRules = async () => {
    if (!currentGroup) return
    setIsRulesLoading(true)
    try {
      const rulesData = await fetch(`/api/data/eval/rule?group=${currentGroup}`)
        .then(res => {
          if (!res.ok) throw new Error('Could not load rules');
          else return res.json();
        })
        .then(j => j as EvalRule[]);
      setRules(rulesData.sort((a, b) => a.rank - b.rank))
      setIsRulesLoading(false)
    } catch (error) {
      console.error("Failed to load rules:", error)
    }
  }

  const handleCreateRule = () => {
    setShowAddForm(true)
  }

  const handleEditRule = (rule: EvalRule) => {
    setEditingRuleRank(rule.rank)
  }

  const handleSaveRule = async (ruleData: EvalRule) => {
    try {
      if (showAddForm) {
        // Creating new rule
        const response = await fetch(`/api/action/rule`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(ruleData),
        })
        if (!response.ok) throw new Error('Failed to create rule')
        const createdRule:EvalRule = await response.json();
        setRules([...rules, createdRule].sort((a, b) => a.rank - b.rank));
        setShowAddForm(false);
        toast.success("Rule created successfully");
      } else {
        // Updating existing rule
        const response = await fetch(`/api/action/rule/${ruleData.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(ruleData),
        })
        if (!response.ok) throw new Error('Failed to update rule');
        const updatedRule:EvalRule = await response.json();
        setRules(rules.map((r) => (r.rank === editingRuleRank ? updatedRule : r)))
        setEditingRuleRank(null);
        toast.success("Successfully updated rule");
      }
    } catch (error) {
      console.error("Failed to save rule:", error)
    }
  }

  const handleCancelEdit = () => {
    if (showAddForm) {
      setShowAddForm(false)
    } else {
      setEditingRuleRank(null)
    }
  }

  const handleDeleteRule = async (rule: EvalRule) => {
    try {
      const response = await fetch(`/api/action/rule/${rule.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error('Failed to delete role');
      toast.success("Successfully deleted rule");
      setRules(rules.filter((r) => r.rank !== rule.rank))
    } catch (error) {
      console.error("Failed to delete rule:", error)
    }
  }

  return (
    <>
    {/* Schema and Org Unit Selection */}
    <Card>
      <CardHeader>
        <CardTitle>Rule Group Selection</CardTitle>
        <CardDescription>
          Select an input schema and organizational unit to manage rules for that group
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Input Schema</label>
            <Select value={selectedSchema} onValueChange={setSelectedSchema}>
              <SelectTrigger>
                <SelectValue placeholder="Select schema" />
              </SelectTrigger>
              <SelectContent>
                {schemas.map((schema) => (
                  <SelectItem key={schema.id} value={schema.name}>
                    {schema.name} - {schema.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Organizational Unit</label>
            <Select value={selectedOrgUnit} onValueChange={setSelectedOrgUnit}>
              <SelectTrigger>
                <SelectValue placeholder="Select org unit" />
              </SelectTrigger>
              <SelectContent>
                {orgUnits.map((orgUnit) => (
                  <SelectItem key={orgUnit.id} value={orgUnit.code}>
                    {orgUnit.code.toUpperCase()} - {orgUnit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {currentGroup && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm">
              Managing rules for group: <Badge className="bg-chart-1 text-white" variant="secondary">{currentGroup}</Badge>
            </p>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Rules Management */}
    {currentGroup && (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rules for {currentGroup}</CardTitle>
              <CardDescription>
                Rules are executed in order of rank. The first rule that evaluates to true determines the assigned
                team.
              </CardDescription>
            </div>
            <Button
              onClick={handleCreateRule}
              className="hover:opacity-90"
              disabled={showAddForm || editingRuleRank !== null}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Inline Add Form */}
            {showAddForm && currentSchemaObj && (
              <InlineAddRuleForm
                teams={teams}
                schema={currentSchemaObj}
                group={currentGroup}
                nextRank={nextRank}
                onSave={handleSaveRule}
                onCancel={handleCancelEdit}
              />
            )}

            {/* Existing Rules */}
            {isRulesLoading ? (<RuleSkeleton />) : (
              rules.length === 0 && !showAddForm ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No rules configured for this group.</p>
                  <p className="text-sm mt-2">Click "Add Rule" to create your first rule.</p>
                </div>
              ) : (
                rules.map((rule) => (
                  <div key={rule.rank} className="border rounded-lg bg-background">
                    {editingRuleRank === rule.rank && currentSchemaObj ? (
                      <InlineRuleForm
                        rule={rule}
                        teams={teams}
                        schema={currentSchemaObj}
                        onSave={handleSaveRule}
                        onCancel={handleCancelEdit}
                      />
                    ) : (
                      <div className="flex items-center gap-4 p-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <GripVertical className="h-4 w-4" />
                          <Badge variant="outline" className="text-xs">
                            #{rule.rank}
                          </Badge>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-sm space-y-1">
                            <p>
                              <span className="font-medium">Condition:</span>{" "}
                              <span className="inline-block mt-1">
                                <ConditionDisplay condition={rule.condition} />
                              </span>
                            </p>
                            <p>
                              <span className="font-medium">Team:</span> 
                              <span className="font-semibold text-chart-1"> {rule.output} </span> 
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRule(rule)}
                            disabled={showAddForm || editingRuleRank !== null}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                disabled={showAddForm || editingRuleRank !== null}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Rule</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete rule #{rule.rank}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteRule(rule)}
                                  className="bg-destructive dark: text-white hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )
            )}
          </div>
        </CardContent>
      </Card>
    )}
  </>
  )
}

function RuleSkeleton() {
  return (
    <Card className="p-2 w-full">
      <CardContent>
        <div className="flex justify-between gap-2">
          <div className="flex gap-2">
            {/* Left side: icon + badge */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <GripVertical className="h-4 w-4" />
              <Skeleton className="h-4 w-8 rounded-sm" />
            </div>

            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
          </div>

          {/* Right side: buttons */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </CardContent>
  </Card>
  );
}