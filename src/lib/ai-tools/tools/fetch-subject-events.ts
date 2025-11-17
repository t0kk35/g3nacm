import { z } from 'zod';
import { AIToolDefinition, ToolResult } from '../types';
import { authorizedFetch } from '@/lib/org-filtering';

const schema = z.object({
  subjectId: z.string().describe('ID of the subject to fetch details for'),
  fromDate: z.string().optional().describe('Start date for event lookup (ISO format)'),
  toDate: z.string().optional().describe('End date for event lookup (ISO format)')
});

export const fetchSubjectEventsTool: AIToolDefinition = {
  name: 'fetch-subject-events',
  description: 'Fetches events for a subject (individual or corporate entity) this includes change to their data, products that were linked to the subject, alerts, cases and potential SAR\'s raised on the subject',
  inputSchema: schema,
  handler: async (params): Promise<ToolResult> => {
    const { subjectId, fromDate, toDate } = params;

    try {
      // Construct the API URL with parameters
      const url = new URL(`${process.env.DATA_URL}/api/data/subject/event`);
      url.searchParams.append('subject_id', subjectId);
      if (fromDate) url.searchParams.append('from_date', fromDate);
      if (toDate) url.searchParams.append('to_date', toDate);
      
      // Make the API call to fetch subject history
      const response = await authorizedFetch(url.toString());
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const eventData = await response.json();
      
      return {
        id: crypto.randomUUID(),
        toolName: 'fetch-subject-events',
        data: {
          subjectId,
          fromDate,
          toDate,
          events: eventData
        }
      }
    } catch (error) {
      // Handle errors gracefully
      return {
        id: crypto.randomUUID(),
        toolName: 'fetch-subject-events',
        data: {
          subjectId,
          fromDate,
          toDate,
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
          events: null
        }
      };
    }
  }
}