'use server'

import * as db from "@/db"
import { insertCondition } from "./helper";
import { NextRequest, NextResponse } from 'next/server';
import { EvalRule } from "@/lib/eval-engine/types";
import { ErrorCreators } from '@/lib/api-error-handling';
import { requirePermissions } from '@/lib/permissions/check';

const origin = 'api/action/rule/'

const query_insert_eval = `
    INSERT INTO eval_rule (rule_group, rank, input_schema_id, output)
    VALUES ($1, $2, $3, $4)
    RETURNING id
`

// Creation of a new rule
export async function POST(request: NextRequest) {

    // Check authentication and permissions
//    const permissionCheck = await requirePermissions(origin, ['admin.rules']);
//    if (permissionCheck) return permissionCheck;

    // Get the EvalRule we need to create from the Body.
    const rule: EvalRule = await request.json();
    
    const req_param = [
        { name:'rank ', field: rule.rank},
        { name:'name ', field: rule.group},
        { name:'condition ', field: rule.condition},
        { name:'output ', field: rule.output}
    ]
    for (const param of req_param) {
        if (!param.field) return ErrorCreators.param.bodyMissing(origin, param.name);
    }

    // Set up a connection and transactions
    let client;
    let transactionStarted=false;

    try {
        client = await db.pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;

        // First insert the base EvalRule
        const ruleResult = await client.query(query_insert_eval, [rule.group, rule.rank, rule.input_schema_id ?? null, rule.output]);
        const ruleId = ruleResult.rows[0].id;
        rule.id = parseInt(ruleId);

        // Now recursively insert the conditions
        await insertCondition(client, ruleId, rule.condition);
        await client.query('COMMIT');
        // Return the rule, we need the ID in the front
        return NextResponse.json(rule);
    } catch (error) {
        if (client && transactionStarted) client.query('ROLLBACK');
        console.error('Error creating rule', error);
        return ErrorCreators.db.queryFailed(origin, 'create rule', error as Error);        
    } finally {
        if (client) client.release();
    }
}