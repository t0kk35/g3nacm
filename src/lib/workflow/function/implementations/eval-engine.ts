import { PoolClient } from "pg";
import { WorkflowContext } from "../../types";
import { IWorkflowFunction } from "../function";
import { getInput, isString } from "../function-helpers";
import { evalRulesCache } from "@/lib/eval-engine/eval-cache";
import { evaluateRules } from "@/lib/eval-engine/engine";
import { EvalOptions } from "@/lib/eval-engine/types";

export class FunctionEvalEngine implements IWorkflowFunction {
    code = 'function.eval_engine';
    
    async run(inputs: { [key:string]: any }, ctx: WorkflowContext, _client: PoolClient): Promise<{ [key: string]: any }> {
        // Get the group name to execute
        const evalGroup = getInput(this.code, inputs, 'function.eval_engine.group', isString);
        
        // Get the evaluation options (optional)
        const throwOnMissingField = inputs['throwOnMissingField'] || false;
        const throwOnInvalidType = inputs['throwOnInvalidType'] || false;
        const validateInput = inputs['validateInput'] || false;
        
        const evalOptions: EvalOptions = {
            throwOnMissingField,
            throwOnInvalidType,
            validateInput
        };
        
        // Get the eval rules for the group
        const evalRules = await evalRulesCache.getEvalRules(evalGroup);
        
        // Get the entity data from system context
        const entityData = ctx.system.entityData;
        
        // Execute the eval engine
        const evalResult = evaluateRules(entityData, evalRules, evalOptions);
        
        // Log the evaluation for audit
        ctx.auditLog.push(`Eval Engine executed for group '${evalGroup}' with result: ${JSON.stringify(evalResult)}`);
        
        return { 
            evalResult: evalResult,
            evalGroup: evalGroup,
            evalRulesCount: evalRules.length
        };
    }
}
