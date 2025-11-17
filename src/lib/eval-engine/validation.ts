import type { EvalRuleCondition, EvalAtomicCondition, EvalConditionGroup } from "./types";

export function validateCondition(condition: EvalRuleCondition): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (condition.type === "atomic") {
    const atomicCondition = condition as EvalAtomicCondition

    if (!atomicCondition.field || atomicCondition.field.trim() === "") {
      errors.push("Field is required")
    }

    if (!atomicCondition.operator) {
      errors.push("Operator is required")
    }

    if (atomicCondition.value === "" || atomicCondition.value === null || atomicCondition.value === undefined) {
      errors.push("Value is required")
    }
  } else if (condition.type === "group") {
    const groupCondition = condition as EvalConditionGroup

    if (!groupCondition.conditions || groupCondition.conditions.length === 0) {
      errors.push("Group must have at least one condition")
    } else {
      groupCondition.conditions.forEach((subCondition, index) => {
        const subValidation = validateCondition(subCondition)
        if (!subValidation.isValid) {
          errors.push(`Condition ${index + 1}: ${subValidation.errors.join(", ")}`)
        }
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function validateRule(rule: { output: string; condition: EvalRuleCondition }): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!rule.output || rule.output.trim() === "") {
    errors.push("Team assignment is required")
  }

  const conditionValidation = validateCondition(rule.condition)
  if (!conditionValidation.isValid) {
    errors.push(...conditionValidation.errors)
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
