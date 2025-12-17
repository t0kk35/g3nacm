import { PoolClient } from "pg";
import { WorkflowContext } from "../../types";
import { IWorkflowFunction } from "../function";
import { getInput, isString } from "../function-helpers";
import { updateEntityState, updateEntityAssignTeam, copyToEntityStateLog } from "../../workflow-data";

export class FunctionChangeEntityStateAssignTeam implements IWorkflowFunction {
    code = 'function.entity.change_state.assign_team';

    async run(inputs: { [key:string]: any }, ctx: WorkflowContext, client: PoolClient): Promise<{ [key: string]: any }> {
        const assingToTeamName = getInput(this.code, inputs, 'function.entity.change_state.assign_team.assign_to_team_name', isString);
        const comment = (ctx.system.commentRequired) ? getInput(this.code, inputs, 'function.entity.change_state.assign_team.comment', isString) : null
        copyToEntityStateLog(client, ctx.system.entityId, ctx.system.entityCode);
        updateEntityState(client, ctx.system.entityId, ctx.system.entityCode, ctx.system.actionCode, ctx.system.fromStateCode, ctx.system.userName, comment);
        updateEntityAssignTeam(client, ctx.system.entityId, ctx.system.entityCode, assingToTeamName);
        return {};
    }
};