import { z } from 'zod';
import { AIToolDefinition, ToolResult } from '../types';
import { authorizedFetch } from '@/lib/org-filtering';
import { User } from '@/app/api/data/user/user';

const schema = z.object({
  criteria: z.string().describe('Search criteria')
});

const TOOL_NAME = 'search-user';

export const searchUser: AIToolDefinition = {
  name: TOOL_NAME,
  description: 'Search for a user. Returns a list of users that have a user-name, first name or last name that is included in the search criteria',
  inputSchema: schema,
  handler: async (params): Promise<ToolResult> => {
    const { criteria } = params;

    try {
      // Construct the API URL with parameters
      const url = new URL(`${process.env.DATA_URL}/api/data/user/user`);
      url.searchParams.append('search', criteria);
      
      // Make the API call to fetch subject history
      const response = await authorizedFetch(url.toString());
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const users:User[] = await response.json();
      // Return the tool result with the complete subject data
      return {
      id: crypto.randomUUID(),
        toolName: TOOL_NAME,
        data: {
          criteria,
          users: users
        }
      } 
    } catch (error) {
      // Handle errors gracefully
      return {
        id: crypto.randomUUID(),
        toolName: TOOL_NAME,
        data: {
          criteria,
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
          actions: null
        }
      };
    }
  }
}