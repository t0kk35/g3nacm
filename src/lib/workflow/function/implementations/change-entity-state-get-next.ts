import { PoolClient } from "pg";
import { WorkflowContext } from "../../types";
import { IWorkflowFunction } from "../function";
import { getInput, isString } from "../function-helpers";
import { updateEntityState, updateEntityAssignUser, copyToEntityStateLog } from "../../workflow-data";
import { WorkflowErrorCreators } from "../../workflow-error-handling";

const query_lease_text = `
SELECT 
    entity_id, 
    entity_code
FROM workflow_entity_state wes
WHERE wes.entity_id = $1
AND wes.entity_code = $2
AND wes.get_lease_user_name = $3
AND wes.get_lease_expires >= now()
`

const workflow_code = 'function.entity.change_state.get_next'

export class FunctionChangeEntityStateGetNext implements IWorkflowFunction {
    code = workflow_code;

    async run(inputs: { [key:string]: any }, ctx: WorkflowContext, client: PoolClient): Promise<{ [key: string]: any }> {
        // The user that does the get will be the current user
        const comment = (ctx.system.commentRequired) ? getInput(this.code, inputs, 'function.entity.change_state.assign_user.comment', isString) : null
        await checkLease(client, ctx.system.entityId, ctx.system.entityCode, ctx.system.userName);
        await copyToEntityStateLog(client, ctx.system.entityId, ctx.system.entityCode);
        await updateEntityState(client, ctx.system.entityId, ctx.system.entityCode, ctx.system.actionCode, ctx.system.fromStateCode, ctx.system.userName, comment);
        await updateEntityAssignUser(client, ctx.system.entityId, ctx.system.entityCode, ctx.system.userName);
        return {};
    }
}

async function checkLease(client: PoolClient, entityId: string, entityCode: string, userName: string) {
    const query = {
        name: workflow_code,
        text: query_lease_text,
        values: [entityId, entityCode, userName]
    };
    const res_lease = await client.query(query);
    if (res_lease.rows.length === 0) WorkflowErrorCreators.function.userDoesNotHaveLease(workflow_code, userName, entityId, entityCode);
}