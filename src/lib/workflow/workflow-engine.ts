import { PoolClient } from "pg";
import { SystemFields, WorkflowContext } from "./types";
import { WorkflowAction, WorkflowConfig } from "@/app/api/data/workflow/types";
import { workflowFunctionRegistry } from "./function/function";
import { getEntityState, WorkflowEntityState } from "./workflow-data";
import { hasPermissions } from "../permissions/core";
import { WorkflowErrorCreators } from "./workflow-error-handling";

const origin = 'workflow-engine'

/**
 * The core function that executes a workflow action.
 *
 * @param workflowConfig - The configuration for the workflow.
 * @param ctx - The workflow context.
 * @param client - A pg Client instance with an active transaction.
 */
export async function executeWorkflowAction(client: PoolClient, workflowConfig: WorkflowConfig, ctx: WorkflowContext): Promise<void> {
  
    // Find the action we need to perform
    const action = workflowConfig.actions.find(a=> a.code === ctx.system.actionCode);
    WorkflowErrorCreators.action.assertActionExists(origin, ctx.system.actionCode, action);

    // Check Permission
    const hasPermission = await hasPermissions(ctx.system.userName, [action.permission]);
    if (action.permission && !hasPermission) WorkflowErrorCreators.action.noActionPermission(origin, ctx.system.userName, action.code) 

    // Locate the entity in the workflow_entity_state table. See if we find it and it is in the correct starting state.
    const entityState = await getEntityState(client, ctx.system.entityId, ctx.system.entityCode)
    
    // if state ends with 'any_active' the action can be applied to all active states.
    if (isAnyActive(action.from_state_code)) {
      // Look-up the state 
      const fsc = workflowConfig.states.find(s => s.code === entityState.from_state_code)
      if (!fsc || (!fsc.is_active)) WorkflowErrorCreators.action.invalidAnyStateTransition(origin, action.code, entityState.from_state_code) 
    }
    else {
      // Validate that the entity's current state matches the allowed source state.
      if (entityState.to_state_code !== action.from_state_code) WorkflowErrorCreators.action.invalidStateTransition(origin, action.code, action.from_state_code, entityState.from_state_code) 
    }
  
    // Set system fields for this execution.
    ctx.system.fromStateCode = entityState.to_state_code;
    ctx.system.toStateCode = action.to_state_code;
  
    // Execute each workflow function in order.
    action.functions.sort((a, b) => { return a.order - b.order })    
    for (const func of action.functions) {      
      // Look up the function in the code registry
      const workflowFunction = workflowFunctionRegistry[func.code];
      WorkflowErrorCreators.action.assertFunctionRegistered(origin, action.code, func.code, workflowFunction)
      
      // Map the required inputs for the function.
      const inputs: { [key: string]: any } = {};
      
      // Insert the settings into inputs.
      if (func.settings) {
        func.settings.forEach((s) => {
          inputs[s.name] = resolveSetting(s.value, ctx);
        })
      };
    
      // Insert the context variables into inputs.
      func.input_parameters.forEach((ip) => {
        if (ip.context_mapping) inputs[ip.code] = ctx.data[ip.context_mapping]
      });
      
      // Execute the function
      const outputs = await workflowFunction.run(inputs, ctx, client);

      // Map the outputs back to the context.
      func.output_parameters.forEach((op) => {
        if (outputs[op.code] === undefined) 
          if (op.code.startsWith('system.')) WorkflowErrorCreators.context.canNotOverWriteSystem(origin, action.code, func.code, op.code, op.context_mapping)
          ctx.data[op.context_mapping] = outputs[op.code]
      })
    }
    // Optionally, write audit logs to a persistent store.
    console.log(`Audit log for entity ${ctx.system.entityId} (${ctx.system.entityCode}):`, ctx.auditLog);
}

// Helper to initialize the workflow context.
export function createWorkflowContext(data: { [key: string]: any }, system: SystemFields): WorkflowContext {
    return {
        data,
        system,
        auditLog: [],
        updateData(newData) {
        // Only update non-system fields.
        this.data = { ...this.data, ...newData };
      },
    };
}

/* Helper function to resolve a setting. Settings can have replacements values */
function resolveSetting(value: any, ctx: WorkflowContext ): any {
  
    if (typeof value !== 'string') return value;
    return value.replace(/\$\{([a-zA-Z0-9_.:]+)\}/g, (_match, token) => {
      const [source, ...pathParts] = token.split(':');
      const path = pathParts.join(':'); // support ':' in path

      switch (source) {
        case 'env': {
          const value = process.env[path];
          if (value === undefined) WorkflowErrorCreators.context.canNotFindEnvSetting(origin, path);
          return value;
        }
        case 'ctx': {
          const [root, ...restPath] = path.split('.');
          const ctxSource = root === 'system' ? ctx.system : ctx.data;
          const value = restPath.reduce((acc: any, key: any) => acc?.[key], ctxSource);
          if (value === undefined) WorkflowErrorCreators.context.canNotFindContextSetting(origin, token);
          return value;
        }
        default:
          WorkflowErrorCreators.context.unknowSettingSource(origin, source, value)
      }
    });
}

/* Small Helper function to establish if an action is an any_active function code */
export function isAnyActive(fromStateCode: string): Boolean {
  return fromStateCode.toLowerCase().endsWith('any_active')
}