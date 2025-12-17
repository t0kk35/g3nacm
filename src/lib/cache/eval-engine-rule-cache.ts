import * as db from "@/db"
import { evalEngineRuleConfigCache } from "./cache";
import { EvalRule, EvalRuleCondition, EvalLogicalOperator, EvalComparisonOperator, RawRuleRow } from "../eval-engine/types";;

const rules_query_text = `
SELECT 
  er.id as "rule_id",
  er.rule_group as "group",
  er.rank as "rank",
  er.output as "output",
  er.input_schema_id as "input_schema_id",
  ec.id as "condition_id",
  ec.parent_id as "parent_condition_id",
  ec.type as "type",
  ec.operator as "operator",
  ec.negate as "negate",
  eac.field as "field",
  eac.value as "value" 
FROM eval_rule er
LEFT JOIN eval_condition ec on ec.rule_id = er.id
LEFT JOIN eval_atomic_condition eac on eac.condition_id = ec.id
WHERE er.rule_group = $1
`

export async function getCachedEvalEngineRuleConfig(group: string) {
    const key = `eval_engine_rule:${group}`;

    return evalEngineRuleConfigCache.get(
        key,
        async () => {
            try {
                const evalRules = await db.pool.query(rules_query_text, [group]);
                const rawRows: RawRuleRow[] = evalRules.rows;
                return buildRules(rawRows);
            } catch (error) {
                throw Error('EvalEngine Rule Cache. DB Error ' + error);
            }
        },
        300_000
    )
}

// Helper function to build rules from raw database rows
function buildRules(rows: RawRuleRow[]): EvalRule[] {
  const groupedByRule: Map<number, RawRuleRow[]> = new Map();

  rows.map(r => {
    if (!groupedByRule.has(r.rule_id)) groupedByRule.set(r.rule_id, []);
    groupedByRule.get(r.rule_id)!.push(r)
  });

  const rules: EvalRule[] = [];

  for (const [_, ruleRows] of groupedByRule.entries()) {
    const conditionMap: Map<number, RawRuleRow> = new Map();
    const childrenMap: Map<number, number[]> = new Map();

    ruleRows.map(rr => {
      conditionMap.set(rr.condition_id, rr);
      if (rr.parent_condition_id !== null) {
        if (!childrenMap.has(rr.parent_condition_id)) childrenMap.set(rr.parent_condition_id, []);
        childrenMap.get(rr.parent_condition_id)!.push(rr.condition_id);
      }
    })

    const root = ruleRows.find(r => r.parent_condition_id === null);
    if (!root) continue;

    const buildCondition = (condId: number): EvalRuleCondition => {
      const row = conditionMap.get(condId)!;
      const negate = row.negate ? true : undefined;

      if (row.type === 'atomic') {
        return {
          type: 'atomic',
          field: row.field!,
          operator: row.operator as EvalComparisonOperator,
          value: row.value!,
          ...(negate !== undefined && { negate }),
        };
      } else {
        const children = childrenMap.get(condId) || [];
        return {
          type: 'group',
          operator: row.operator as EvalLogicalOperator,
          conditions: children.map(buildCondition),
          ...(negate !== undefined && { negate }),
        };
      }
    };
    
    rules.push({
      id: ruleRows[0].rule_id || undefined,
      rank: ruleRows[0].rank,
      group: ruleRows[0].group,
      output: ruleRows[0].output,
      condition: buildCondition(root.condition_id),
      input_schema_id: ruleRows[0].input_schema_id || undefined,
    });
  }

  rules.sort((a, b) => a.rank - b.rank);
  return rules;
}