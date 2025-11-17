import { PoolClient } from "pg";
import { EvalConditionGroup, EvalAtomicCondition, EvalRuleCondition } from "@/lib/eval-engine/types";
import { isValidJson } from "@/lib/json";

const query_insert_condition = `
    INSERT INTO eval_condition (rule_id, parent_id, type, operator, negate)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
`

const query_insert_atomic_condition = `
    INSERT INTO eval_atomic_condition (condition_id, field, value)
    VALUES ($1, $2, $3)
`

/**
 * Function to recursively insert conditions in the Eval table structures.
 * @param client A DB pool client and transaction to run the queries in.
 * @param ruleId The rule id we are creating.
 * @param condition An Eval condition object to create.
 * @param parentId The parent rule id we are creating.
 * @returns 
 */
export async function insertCondition(client: PoolClient, ruleId: number, condition: EvalRuleCondition, parentId: number | null = null): Promise<number> {
  
    const { type, negate = false } = condition;

    if (type === 'atomic') {
        const atomic = condition as EvalAtomicCondition;
        // Insert into eval_condition
        if (!isValidJson(atomic.value)) throw new Error(`Atomic value is not valid JSON. It contained ${JSON.stringify(atomic.value)}`)
        const condResult = await client.query(query_insert_condition, [ruleId, parentId, 'atomic', atomic.operator, negate]);
        // Get the newly created id
        const conditionId = condResult.rows[0].id;
        // Insert into eval_atomic_condition
        await client.query(query_insert_atomic_condition, [conditionId, atomic.field, JSON.stringify(atomic.value)]);
        return conditionId;
    } else if (type === 'group') {
        const group = condition as EvalConditionGroup;
        // Insert group-level condition
        const condResult = await client.query(query_insert_condition, [ruleId, parentId, 'group', group.operator, negate]);
        // Get the newly created id
        const groupId = condResult.rows[0].id;
        // Recursively insert child conditions
        for (const subCond of group.conditions) {
        await insertCondition(client, ruleId, subCond, groupId);
        }
        return groupId;
    }
    throw new Error(`Unsupported condition type: ${type}`);
}