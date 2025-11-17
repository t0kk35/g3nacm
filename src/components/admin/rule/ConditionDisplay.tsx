import { Badge } from "@/components/ui/badge"
import type { EvalRuleCondition, EvalAtomicCondition, EvalConditionGroup } from "@/lib/eval-engine/types"

interface ConditionDisplayProps {
  condition: EvalRuleCondition
  level?: number
}

export function ConditionDisplay({ condition, level = 0 }: ConditionDisplayProps) {
  if (condition.type === "atomic") {
    const atomicCondition = condition as EvalAtomicCondition
    return (
      <span className="inline-flex items-center gap-1">
        <Badge variant="outline" className="text-xs font-mono">
          {atomicCondition.field}
        </Badge>
        <span className="text-xs text-muted-foreground">{atomicCondition.operator}</span>
        <Badge variant="secondary" className="text-xs font-mono">
          {String(atomicCondition.value)}
        </Badge>
      </span>
    )
  }

  const groupCondition = condition as EvalConditionGroup
  const isNested = level > 0

  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {isNested && <span className="text-xs text-muted-foreground">(</span>}
      {groupCondition.conditions.map((subCondition, index) => (
        <span key={index} className="inline-flex items-center gap-1">
          {index > 0 && (
            <Badge variant="default" className="text-xs mx-1">
              {groupCondition.operator}
            </Badge>
          )}
          <ConditionDisplay condition={subCondition} level={level + 1} />
        </span>
      ))}
      {isNested && <span className="text-xs text-muted-foreground">)</span>}
    </span>
  )
}
