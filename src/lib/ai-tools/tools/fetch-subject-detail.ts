import { z } from 'zod';
import { AIToolDefinition, ToolResult } from '../types';
import { authorizedFetch } from '@/lib/org-filtering';

const schema = z.object({
  subjectId: z.string().describe('ID of the subject to fetch details for')
});

const TOOL_NAME = 'fetch-subject-detail'

export const fetchSubjectDetailTool: AIToolDefinition = {
  name: TOOL_NAME,
  description: 'Fetches detailed information about a subject (individual or corporate entity) including personal details, address, and type-specific information',
  inputSchema: schema,
  handler: async (params): Promise<ToolResult> => {
    const { subjectId } = params;
    
    try {      
      // Make the API call to fetch subject details
      const response = await authorizedFetch(`${process.env.DATA_URL}/api/data/subject/detail?subject_id=${encodeURIComponent(subjectId)}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const subjectData = await response.json();

      // Return the tool result with the complete subject data
      return {
        id: crypto.randomUUID(),
        toolName: TOOL_NAME,
        data: {
          subjectId,
          subject: subjectData
        }
      };
    } catch (error) {
      // Handle errors gracefully
      return {
        id: crypto.randomUUID(),
        toolName: TOOL_NAME,
        data: {
          subjectId,
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
          subject: null
        }
      };
    }
  }
};