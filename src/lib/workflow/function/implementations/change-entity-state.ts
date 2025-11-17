import { PoolClient } from "pg";
import { WorkflowContext } from "../../types";
import { IWorkflowFunction } from "../function";
import { getInput, isString } from "../function-helpers";
import { updateEntityState, copyToEntityStateLog } from "../../workflow-data";

export class FunctionChangeEntityState implements IWorkflowFunction {
    code = 'function.entity.change_state';

    async run(inputs: { [key:string]: any }, ctx: WorkflowContext, client: PoolClient): Promise<{ [key: string]: any }> {
        copyToEntityStateLog(client, ctx.system.entityId, ctx.system.entityCode);
        updateEntityState(client, ctx.system.entityId, ctx.system.entityCode, ctx.system.actionCode, ctx.system.fromStateCode, ctx.system.userName)
        ctx.auditLog.push(
          `Entity ${ctx.system.entityId} (${ctx.system.entityCode}) changed to status ${ctx.system.toStateCode}`
        );
        return {};
    }
}