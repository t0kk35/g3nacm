import { z } from 'zod';
import { AIToolDefinition, ToolResult } from '../types';
import { authorizedFetch } from '@/lib/org-filtering';
import { EntityAttachment } from '@/app/api/data/attachment/types';

const schema = z.object({
  entityCode: z.string().describe('Entity code of the entity we want to list the attachments for'),
  entityId: z.string().describe('Entity ID of the entity we want to list the attachments for')
});

const TOOL_NAME = 'fetch-attachment-list';

export const fetchAttachmentListTool: AIToolDefinition = {
  name: TOOL_NAME,
  description: 'Provides a list and description of files attached to the entity, not the file content. The files may provide additional data on the subject or the alert/case',
  inputSchema: schema,
  handler: async (params): Promise<ToolResult> => {
    const { entityCode, entityId } = params;

    try {
      // Construct the API URL with parameters
      const url = new URL(`${process.env.DATA_URL}/api/data/attachment/list`);
      url.searchParams.append('entity_id', entityId);
      url.searchParams.append('entity_code', entityCode);
      
      // Make the API call to fetch subject history
      const response = await authorizedFetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const attachmentList:EntityAttachment[] = await response.json();
      // For now only return text style files smaller than 20k. So we can slam it into the context window.
      const filtered_attachments = attachmentList.filter(a => a.mime_type.startsWith('text/') && a.file_size < 20000)

      // Return the tool result with the complete subject data
      return {
        id: crypto.randomUUID(),
        toolName: TOOL_NAME,
        data: {
          entityId,
          entityCode,
          attachments: attachmentList
        }
      }
    } catch (error) {
      // Handle errors gracefully
      return {
        id: crypto.randomUUID(),
        toolName: TOOL_NAME,
        data: {
          entityId,
          entityCode,
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
          attachments: null
        }
      };
    }
  }
}