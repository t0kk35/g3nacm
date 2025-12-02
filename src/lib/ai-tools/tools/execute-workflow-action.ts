import { z } from 'zod';
import { AIToolDefinition, ToolResult } from '../types';
import { authorizedFetch } from '@/lib/org-filtering';
import { WorkflowConfig } from '@/app/api/data/workflow/types';

const schema = z.object({
  orgUnitCode: z.string().describe('Organization unit code'),
  entityCode: z.string().describe('Entity type (e.g., "alert", "case")'),
  entityId: z.string().describe('Entity instance ID'),
  actionCode: z.string().describe('Workflow action code to execute'),
  currentStateCode: z.string().describe('Current entity state code'),
  suggestedValues: z.record(z.any()).optional().describe('AI-suggested form field values mapped by field code'),
  reasoning: z.string().optional().describe('Agent reasoning for the suggested values'),
  entityData: z.any().describe('Complete entity data for workflow context')
});

const TOOL_NAME = 'execute-workflow-action';

/**
 * AI tool that allows an agent to propose and display an interactive workflow action form.
 * The agent can pre-populate form fields with suggested values, but users maintain full control
 * over field values and action execution.
 *
 * Only supports user-triggered actions (trigger='user'). System-triggered actions like file uploads
 * are handled by dedicated components.
 */
export const executeWorkflowActionTool: AIToolDefinition = {
  name: TOOL_NAME,
  description: `
    Displays an interactive form for executing a workflow action on a investigation entity with AI-suggested field values. 
    The form will display the form_fields of the selected action. Please use the form_field 'code' to suggest values, not the 'name' 
    The user can review, modify, and execute the action. 
    Only supports user-triggered actions (not system actions like file uploads).`,
  inputSchema: schema,
  handler: async (params): Promise<ToolResult> => {
    const {
      orgUnitCode,
      entityCode,
      entityId,
      actionCode,
      currentStateCode,
      suggestedValues,
      reasoning,
      entityData
    } = params;

    try {
      // Fetch workflow configuration
      const url = new URL(`${process.env.DATA_URL}/api/data/workflow`);
      url.searchParams.append('org_unit_code', orgUnitCode);
      url.searchParams.append('entity_code', entityCode);

      const response = await authorizedFetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch workflow configuration: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const workflow: WorkflowConfig = await response.json();

      // Find the specified action
      const action = workflow.actions.find(a => a.code === actionCode);

      if (!action) {
        return {
          id: crypto.randomUUID(),
          toolName: TOOL_NAME,
          data: {
            error: true,
            errorMessage: `Action '${actionCode}' not found in workflow configuration for entity '${entityCode}'.`
          },
          ui: {
            component: 'WorkflowActionExecutor',
            props: {
              error: `Action '${actionCode}' not found in workflow configuration.`
            }
          }
        };
      }

      // Validate action is user-triggered
      if (action.trigger !== 'user') {
        return {
          id: crypto.randomUUID(),
          toolName: TOOL_NAME,
          data: {
            error: true,
            errorMessage: `Action '${action.name}' cannot be executed via chat. Only user-triggered actions are supported. This action has trigger='${action.trigger}'.`
          },
          ui: {
            component: 'WorkflowActionExecutor',
            props: {
              error: `Action '${action.name}' cannot be executed via chat. Only user-triggered actions are supported.`
            }
          }
        };
      }

      // Validate action is available from current state
      if (action.from_state_code !== currentStateCode) {
        // Get available actions from current state
        const availableActions = workflow.actions
          .filter(a => a.from_state_code === currentStateCode && a.trigger === 'user')
          .map(a => a.name);

        return {
          id: crypto.randomUUID(),
          toolName: TOOL_NAME,
          data: {
            error: true,
            errorMessage: `Action '${action.name}' is not available from state '${currentStateCode}'. Available actions: ${availableActions.join(', ') || 'none'}.`
          },
          ui: {
            component: 'WorkflowActionExecutor',
            props: {
              error: `Action '${action.name}' is not available from state '${currentStateCode}'. Available actions: ${availableActions.join(', ') || 'none'}.`
            }
          }
        };
      }

      // Return successful result with action details and UI component
      return {
        id: crypto.randomUUID(),
        toolName: TOOL_NAME,
        data: {
          orgUnitCode,
          entityCode,
          entityId,
          currentStateCode,
          action,
          suggestedValues: suggestedValues || {},
          reasoning
        },
        ui: {
          component: 'WorkflowActionExecutor',
          props: {
            orgUnitCode,
            entityCode,
            entityId,
            action,
            suggestedValues: suggestedValues || {},
            reasoning,
            entityData
          }
        }
      };
    } catch (error) {
      // Handle errors gracefully
      return {
        id: crypto.randomUUID(),
        toolName: TOOL_NAME,
        data: {
          orgUnitCode,
          entityCode,
          entityId,
          actionCode,
          currentStateCode,
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred while fetching workflow action'
        },
        ui: {
          component: 'WorkflowActionExecutor',
          props: {
            error: error instanceof Error ? error.message : 'Unknown error occurred while fetching workflow action'
          }
        }
      };
    }
  },
  uiComponent: 'WorkflowActionExecutor'
};
