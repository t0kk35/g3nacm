import { z } from 'zod';
import { AIToolDefinition, ToolResult } from '../types';
import { authorizedFetch } from '@/lib/org-filtering';

const schema = z.object({
  alertId: z.string().describe('The ID of the alert to fetch')
});

const TOOL_NAME = 'fetch-alert-detail'

export const fetchAlertDetailTool: AIToolDefinition = {
  name: TOOL_NAME,
  description: 'Fetches detailed information about an alert including detection details, full audit ....',
  inputSchema: schema,
  handler: async (params): Promise<ToolResult> => {
    const { alertId } = params;
    
    try {      
      // Make the API call to fetch subject details
      const response = await authorizedFetch(`${process.env.DATA_URL}/api/data/alert/detail?subject_id=${encodeURIComponent(alertId)}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const alertData = await response.json();

      // Return the tool result with the complete subject data
      return {
        id: crypto.randomUUID(),
        toolName: TOOL_NAME,
        data: {
          alertId,
          alert: alertData
        }
      };
    } catch (error) {
      // Handle errors gracefully
      return {
        id: crypto.randomUUID(),
        toolName: TOOL_NAME,
        data: {
          alertId,
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
          alert: null
        }
      };
    }
  }
};