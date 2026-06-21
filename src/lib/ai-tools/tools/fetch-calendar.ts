import { z } from 'zod';
import { AIToolDefinition, ToolResult } from '../types';
import { authorizedFetch } from '@/lib/org-filtering';
import { CalendarEvent } from '@/lib/data/queries/calendar/types';

const schema = z.object({
  fromDate: z.string().optional().describe('Start date to look for calendar events (ISO format)'),
  toDate: z.string().optional().describe('End date to look for calendar events (ISO format)')
});

const TOOL_NAME = 'fetch-calendar';

export const fetchSubjectDetailTool: AIToolDefinition = {
  name: TOOL_NAME,
  description: 'Fetches the calendar events for a user such as their tasks, reminders....',
  inputSchema: schema,
  handler: async (params): Promise<ToolResult> => {
    const { fromDate, toDate } = params;
      try {      
        // Make the API call to fetch subject details
        // Construct the API URL with parameters
        const url = new URL(`${process.env.DATA_URL}/api/data/calendar/list`);
        url.searchParams.append('from_date', fromDate);
        url.searchParams.append('to_date', toDate);

        // Make the API call to fetch subject history
        const response = await authorizedFetch(url.toString());

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const events:CalendarEvent[] = await response.json();

        // Return the tool result with the complete workflow action list.
        return {
          id: crypto.randomUUID(),
            toolName: TOOL_NAME,
            data: {
              fromDate,
              toDate,
              calendarEvents : events
            }
          }
      } catch (error) {
        return {
          id: crypto.randomUUID(),
          toolName: TOOL_NAME,
          data: {
            fromDate,
            toDate,
            // Handle errors gracefully
            error: true,
            errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
            calendarEvents : []
          }
        }
      }
    }
}