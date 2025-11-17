'use server'

import * as db from "@/db"
import { insertCondition } from "../helper";
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';
import { requirePermissions } from '@/lib/permissions/check';
import { EvalRule } from "@/lib/eval-engine/types";

type Props = { params: Promise<{ ruleId: string }> }

const origin = 'api/action/rule/[id]'

const query_delete_atomic_condition = `
    DELETE FROM eval_atomic_condition 
    WHERE condition_id IN (
        SELECT id FROM eval_condition
        WHERE rule_id = $1
    )
`

const query_delete_eval_condition = `
    DELETE FROM eval_condition 
    WHERE rule_id = $1
`

const query_delete_eval_rule = `
    DELETE FROM eval_rule
    where id = $1
`

const query_update_eval_rule = `
    UPDATE eval_rule
    SET 
        rank = $2,
        output = $3
    WHERE id = $1
`

// Update of a role
export async function PUT(request: NextRequest, { params }: Props) {
    
    // Check authentication and permissions
    //const permissionCheck = await requirePermissions(origin, ['admin.rule']);
    //if (permissionCheck) return permissionCheck;

    const ruleIdString = (await params).ruleId;
    const ruleId = parseInt(ruleIdString);
    if (!ruleId) return ErrorCreators.param.urlMissing(origin, 'ruleId');

    // Get the EvalRule we need to update from the Body.
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
    let transactionStarted = false;

    try {     
        client = await db.pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;
        // First delete the conditions
        await client.query(query_delete_atomic_condition, [ruleId]);
        await client.query(query_delete_eval_condition, [ruleId]);
        // Then update the eval_rule
        await client.query(query_update_eval_rule, [ruleId, rule.rank, rule.output]);
        // And re-create conditions
        await insertCondition(client, ruleId, rule.condition);
        await client.query('COMMIT');
        // Return the rule.
        return NextResponse.json(rule);
    } catch(error) {
        if (client && transactionStarted) client.query('ROLLBACK');
        console.error('Error creating rule', error);
        return ErrorCreators.db.queryFailed(origin, 'update rule', error as Error);    
    } finally {
        if (client) client.release();
    }
}

// Delete of a role
export async function DELETE(_request: NextRequest, { params }: Props) {

    // Check authentication and permissions
    //const permissionCheck = await requirePermissions(origin, ['admin.rule']);
    //if (permissionCheck) return permissionCheck;

    const ruleIdString = (await params).ruleId;
    const ruleId = parseInt(ruleIdString);
    if (!ruleId) return ErrorCreators.param.urlMissing(origin, 'ruleId');

    // Set up a connection and transactions
    let client;
    let transactionStarted = false;
    try {     
        client = await db.pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;
        // Delete all
        await client.query(query_delete_atomic_condition, [ruleId]);
        await client.query(query_delete_eval_condition, [ruleId]);
        await client.query(query_delete_eval_rule, [ruleId]); 
        await client.query('COMMIT');
        return NextResponse.json({ 'success': true });
    } catch (error) {
        if (client && transactionStarted) client.query('ROLLBACK');
        console.error('Error creating rule', error);
        return ErrorCreators.db.queryFailed(origin, 'delete rule', error as Error);
    } finally {
        if (client) client.release();
    }
}