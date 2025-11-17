import { z } from 'zod';
import { AIToolDefinition, ToolResult } from '../types';
import { objectToCSV } from '@/lib/json';
import { authorizedFetch } from '@/lib/org-filtering';

const schema = z.object({
  subjectId: z.string().describe('ID of the subject to fetch history for'),
  fromDate: z.string().optional().describe('Start date for history range (ISO format)'),
  toDate: z.string().optional().describe('End date for history range (ISO format)')
});

export const fetchSubjectHistoryTool: AIToolDefinition = {
  name: 'fetch-subject-history',
  description: 'Fetches historical changes for a subject over time. Returns data in CSV format for efficient processing of large datasets. Supports optional date range filtering.',
  inputSchema: schema,
  handler: async (params): Promise<ToolResult> => {
    const { subjectId, fromDate, toDate } = params;
    
    try {
      // Construct the API URL with parameters
      const url = new URL(`${process.env.DATA_URL}/api/data/subject/history`);
      url.searchParams.append('subject_id', subjectId);
      if (fromDate) url.searchParams.append('from_date', fromDate);
      if (toDate) url.searchParams.append('to_date', toDate);
      
      // Make the API call to fetch subject history
      const response = await authorizedFetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const historyData = await response.json();

      // Convert the history data to CSV format
      const csvData = objectToCSV(historyData);

      // Return the tool result with CSV data
      return {
        id: crypto.randomUUID(),
        toolName: 'fetch-subject-history',
        data: {
          subjectId,
          fromDate,
          toDate,
          recordCount: historyData.length,
          csvData: csvData,
          rawData: historyData // Keep raw data for debugging if needed
        }
      };
    } catch (error) {
      // Handle errors gracefully
      return {
        id: crypto.randomUUID(),
        toolName: 'fetch-subject-history',
        data: {
          subjectId,
          fromDate,
          toDate,
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
          csvData: '',
          recordCount: 0
        }
      };
    }
  }
};