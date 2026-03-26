import { PoolClient } from "pg";
import { WorkflowContext } from "../../types";
import { IWorkflowFunction } from "../function";
import { getInput, isString } from "../function-helpers";
import { updateEntityAssignUser } from "../../workflow-data";

export class FunctionChangeEntityStateAssignUser implements IWorkflowFunction {
    code = 'function.entity.change_state.assign_user';

    async run(inputs: { [key:string]: any }, ctx: WorkflowContext, client: PoolClient): Promise<{ [key: string]: any }> {
        const assingToUserName = getInput(this.code, inputs, 'function.entity.change_state.assign_user.assign_to_user_name', isString);
        updateEntityAssignUser(client, ctx.system.entityId, ctx.system.entityCode, assingToUserName);
        return {};
    }
}