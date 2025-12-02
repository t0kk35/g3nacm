import { z } from 'zod';
import { AIToolDefinition, ToolResult } from '../types';
import { authorizedFetch } from '@/lib/org-filtering';
import { WorkflowConfig } from '@/app/api/data/workflow/types';

const schema = z.object({
  orgUnitCode: z.string().describe('Org unit code of the workflow entity'),
  entityCode: z.string().describe('The entity code of the workflow entity'),
  toStateCode: z.string().describe('The current toStateCode for the workflow entity')
});

const TOOL_NAME = 'fetch-next-workflow-action';

/**
 * AI tool which allow an agent to get access to the workflow, it will return the next possible actions for
 * and entity given the current state.
 */
export const fetchNextWorkflowAction: AIToolDefinition = {
  name: TOOL_NAME,
  description: 'Returns the next possible workflow actions for a workflow entity in the workflow configuration',
  inputSchema: schema,
  handler: async (params): Promise<ToolResult> => {
    const { orgUnitCode, entityCode, toStateCode } = params;
    
    try {
      // Construct the API URL with parameters
      const url = new URL(`${process.env.DATA_URL}/api/data/workflow`);
      url.searchParams.append('org_unit_code', orgUnitCode);
      url.searchParams.append('entity_code', entityCode);
      
      // Make the API call to fetch subject history
      const response = await authorizedFetch(url.toString());
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const workflow:WorkflowConfig = await response.json();
      // Filter the actions, only return the ones that are currently possible.
      const actions = workflow.actions.filter(a => a.from_state_code === toStateCode);
      
      // Return the tool result with the complete workflow action list.
      return {
        id: crypto.randomUUID(),
        toolName: TOOL_NAME,
        data: {
          orgUnitCode,
          entityCode,
          toStateCode,
          actions: actions
        }
      }
    } catch (error) {
      // Handle errors gracefully
      return {
        id: crypto.randomUUID(),
        toolName: TOOL_NAME,
        data: {
          orgUnitCode,
          entityCode,
          toStateCode,
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
          actions: null
        }
      };
    }
  }
}