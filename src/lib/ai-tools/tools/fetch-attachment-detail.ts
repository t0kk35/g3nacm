import { z } from 'zod';
import { AIToolDefinition, ToolResult } from '../types';
import { authorizedFetch } from '@/lib/org-filtering';

const schema = z.object({
  entityAttachmentId: z.string().describe('Unique identifier for the attachment')
});

const TOOL_NAME = 'fetch-attachment-detail';

export const fetchAttachmentDetailTool: AIToolDefinition = {
  name: TOOL_NAME,
  description: 'Content of a file attached to the entity. It can provide additional details on the entity',
  inputSchema: schema,
  handler: async (params): Promise<ToolResult> => {
    const { entityAttachmentId } = params;

    try { 
      // Construct the API URL with parameters
      const url = new URL(`${process.env.DATA_URL}/api/data/attachment/detail`);
      url.searchParams.append('attachment_id', entityAttachmentId);

      // Make the API call to fetch subject history
      const response = await authorizedFetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Get as text, we need to content and unescaped.
      const fileContent = response.text();

      // Return the tool result with the complete subject data
      return {
        id: crypto.randomUUID(),
        toolName: TOOL_NAME,
        data: {
          entityAttachmentId,
          fileContent: fileContent
        }
      }
    } catch (error) {
      // Handle errors gracefully
      return {
        id: crypto.randomUUID(),
        toolName: TOOL_NAME,
        data: {
          entityAttachmentId,
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
          fileContent: null
        }
      }
    }
  }
}