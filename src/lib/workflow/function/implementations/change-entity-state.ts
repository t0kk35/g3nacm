import { PoolClient } from "pg";
import { WorkflowContext } from "../../types";
import { IWorkflowFunction } from "../function";
import { updateEntityState, copyToEntityStateLog } from "../../workflow-data";
import { getInput, isString } from "../function-helpers";

export class FunctionChangeEntityState implements IWorkflowFunction {
    code = 'function.entity.change_state';

    async run(inputs: { [key:string]: any }, ctx: WorkflowContext, client: PoolClient): Promise<{ [key: string]: any }> {
        const comment = (ctx.system.commentRequired) ? getInput(this.code, inputs, 'function.entity.change_state.comment', isString) : null
        copyToEntityStateLog(client, ctx.system.entityId, ctx.system.entityCode);
        updateEntityState(client, ctx.system.entityId, ctx.system.entityCode, ctx.system.actionCode, ctx.system.fromStateCode, ctx.system.userName, comment);
        return {};
    }
}