'use server'

import { auth } from "@/auth";
import * as db from '@/db'
import { NextRequest, NextResponse } from "next/server";
import { ErrorCreators } from '@/lib/api-error-handling';
import { RawRuleRow } from "@/lib/eval-engine/types";
import { buildRules } from "@/lib/eval-engine/eval-cache";

const origin = 'api/data/eval/rule'

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
WHERE ($1::text IS NULL OR er.rule_group = $1)
`;

/**
 * This function is mainly used for the admin screens under /admin. For internal/workflow access we will use the cache.
 */
export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";
    // Check user
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    
    // Get the URL params. Throw errors if we can't find the mandatory ones.
    const searchParams = request.nextUrl.searchParams;
    const group = searchParams.get('group');

    if (!useMockData) {
        try {
            const res = await db.pool.query(query_text, [group]);
            const raw_rules: RawRuleRow[] = res.rows;
            const rules = buildRules(raw_rules);
            return NextResponse.json(rules);
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get eval rule', error as Error);   
        }
    }
}