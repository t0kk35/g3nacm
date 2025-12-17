import { PoolClient } from "pg";
import { WorkflowContext } from "../../types";
import { IWorkflowFunction } from "../function";
import { getInput, isString } from "../function-helpers";
import { getCachedEvalEngineRuleConfig } from "@/lib/cache/eval-engine-rule-cache";
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
        const evalRules = await getCachedEvalEngineRuleConfig(evalGroup);
        
        // Get the entity data from system context
        const data = {
            entity: ctx.system.entityData,
            action: {
                code: ctx.system.actionCode,
                from_state_code: ctx.system.fromStateCode,
                to_state_code: ctx.system.toStateCode
            }
        }
        
        // Execute the eval engine
        const evalResult = evaluateRules(data, evalRules, evalOptions);
        
        return {
            function: {
                eval_engine : {
                    evalResult: evalResult,
                    evalGroup: evalGroup,
                    evalRulesCount: evalRules.length
                }
            }
        };
    }
}
