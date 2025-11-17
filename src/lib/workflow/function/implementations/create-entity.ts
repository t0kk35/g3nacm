import { PoolClient } from "pg";
import { WorkflowContext } from "../../types";
import { IWorkflowFunction } from "../function";

export class FunctionCreateEntity implements IWorkflowFunction {
    code = 'function.entity.create';

    async run(inputs: { [key:string]: any }, ctx: WorkflowContext, client: PoolClient): Promise<{ [key: string]: any }> {
        const code = ctx.system.entityCode
        const inputParams = [{ name: 'newState', type: 'string' }];
        const outputParams = [];
        return {};
    }
}       