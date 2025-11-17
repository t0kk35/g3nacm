import { EvalRule, EvalRuleCondition, EvalLogicalOperator, EvalComparisonOperator, EvalInputSchema, EvalSchemaField, RawRuleRow, RawSchemaRow } from "./types";
import * as db from "@/db";

const query_text = `
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
`;

const schema_query_text = `
SELECT 
  eis.id,
  eis.name,
  eis.version,
  eis.description,
  eis.created_at,
  eis.updated_at,
  esf.id as field_id,
  esf.field_path,
  esf.field_type,
  esf.description as field_description,
  esf.required,
  esf.array_item_type,
  esf.validation_config
FROM eval_input_schema eis
LEFT JOIN eval_schema_field esf ON esf.schema_id = eis.id
WHERE eis.id = $1
ORDER BY esf.id
`;

const schema_by_name_version_query_text = `
SELECT 
  eis.id,
  eis.name,
  eis.version,
  eis.description,
  eis.created_at,
  eis.updated_at,
  esf.id as field_id,
  esf.field_path,
  esf.field_type,
  esf.description as field_description,
  esf.required,
  esf.array_item_type,
  esf.validation_config
FROM eval_input_schema eis
LEFT JOIN eval_schema_field esf ON esf.schema_id = eis.id
WHERE eis.name = $1 AND eis.version = $2
ORDER BY esf.id
`;

// Helper function to build rules from raw database rows
export function buildRules(rows: RawRuleRow[]): EvalRule[] {
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

export function buildSchemas(rows: RawSchemaRow[]): EvalInputSchema[] {
  
  const grouped: Record<string, RawSchemaRow[]> = {};
  
  // Step 1: Group rows by `id`
  for (const row of rows) {
    if (!grouped[row.id]) {
      grouped[row.id] = [];
    }
    grouped[row.id].push(row);
  }

  const schemas: EvalInputSchema[] = [];

  // Step 2: Build schema for each group
  for (const id in grouped) {
    const schema = buildSchema(grouped[id]);
    if (schema !== null) {
      schemas.push(schema);
    }
  }
  
  return schemas;
}


// Helper function to build schema from raw database rows
function buildSchema(rows: RawSchemaRow[]): EvalInputSchema | null {
  if (rows.length === 0) return null;
  
  const firstRow = rows[0];
  const fields: EvalSchemaField[] = [];
  
  for (const row of rows) {
    if (row.field_id && row.field_path && row.field_type) {
      fields.push({
        id: row.field_id,
        schema_id: row.id,
        field_path: row.field_path,
        field_type: row.field_type as any,
        description: row.field_description || undefined,
        required: row.required || false,
        array_item_type: row.array_item_type as any || undefined,
        validation_config: row.validation_config || undefined,
      });
    }
  }
  
  return {
    id: firstRow.id,
    name: firstRow.name,
    version: firstRow.version,
    description: firstRow.description || undefined,
    created_at: firstRow.created_at,
    updated_at: firstRow.updated_at,
    fields,
  };
}

/**
 * In-memory cache for eval rules with TTL (Time To Live)
 * Cache key format: group name
 */
interface EvalRulesCacheEntry {
  rules: EvalRule[];
  timestamp: number;
  ttl: number; // milliseconds
}

class EvalRulesCache {
  private cache = new Map<string, EvalRulesCacheEntry>();
  private defaultTTL: number;

  constructor(defaultTTLMinutes = 30) {
    this.defaultTTL = defaultTTLMinutes * 60 * 1000; // Convert to milliseconds
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: EvalRulesCacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Get eval rules from cache or fetch from database
   */
  async getEvalRules(group: string, customTTL?: number): Promise<EvalRule[]> {
    const cached = this.cache.get(group);

    // Return cached entry if valid
    if (cached && this.isValid(cached)) {
      return cached.rules;
    }

    // Fetch from database
    const rules = await this.fetchEvalRules(group);
    
    // Cache the result
    this.cache.set(group, {
      rules,
      timestamp: Date.now(),
      ttl: customTTL || this.defaultTTL
    });

    return rules;
  }

  /**
   * Fetch eval rules from database
   */
  private async fetchEvalRules(group: string): Promise<EvalRule[]> {
    const query = {
      name: 'eval_cache_fetch_rules',
      text: query_text,
      values: [group]
    };

    const result = await db.pool.query(query);
    const rawRows: RawRuleRow[] = result.rows;
    
    if (rawRows.length === 0) {
      throw new Error(`No eval rules found for group: ${group}`);
    }

    return buildRules(rawRows);
  }

  /**
   * Invalidate cache entry for specific group
   */
  invalidate(group: string): void {
    this.cache.delete(group);
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries from cache
   */
  cleanup(): void {
    for (const [key, entry] of this.cache) {
      if (!this.isValid(entry)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; groups: string[] } {
    return {
      size: this.cache.size,
      groups: Array.from(this.cache.keys())
    };
  }

  /**
   * Get input schema by ID
   */
  async getInputSchema(schemaId: string): Promise<EvalInputSchema | null> {
    const query = {
      name: 'eval_cache_fetch_schema',
      text: schema_query_text,
      values: [schemaId]
    };

    const result = await db.pool.query(query);
    const rawRows: RawSchemaRow[] = result.rows;
    
    return buildSchema(rawRows);
  }

  /**
   * Get input schema by name and version
   */
  async getInputSchemaByNameVersion(name: string, version: string): Promise<EvalInputSchema | null> {
    const query = {
      name: 'eval_cache_fetch_schema_by_name_version',
      text: schema_by_name_version_query_text,
      values: [name, version]
    };

    const result = await db.pool.query(query);
    const rawRows: RawSchemaRow[] = result.rows;
    
    return buildSchema(rawRows);
  }

  /**
   * Preload eval rules for multiple groups (useful for warming cache)
   */
  async preloadGroups(groups: string[]): Promise<void> {
    const promises = groups.map(group => this.getEvalRules(group));
    await Promise.all(promises);
  }
}

// Singleton instance
export const evalRulesCache = new EvalRulesCache();

// Optional: Set up periodic cleanup (run every 10 minutes)
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    evalRulesCache.cleanup();
  }, 10 * 60 * 1000);
}