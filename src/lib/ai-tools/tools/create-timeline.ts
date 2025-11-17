import { z } from 'zod';
import { AIToolDefinition, ToolResult } from '../types';

const schema = z.object({
  entityId: z.string().describe('ID of the entity to create timeline for'),
  entityType: z.enum(['customer', 'transaction', 'case']).describe('Type of entity'),
  timeRange: z.object({
    start: z.string().describe('Start date (ISO format)'),
    end: z.string().describe('End date (ISO format)')
  }).optional().describe('Time range for the timeline')
});

export const createTimelineTool: AIToolDefinition = {
  name: 'create-timeline',
  description: 'Creates a visual timeline of events for a given entity',
  inputSchema: schema,
  handler: async (params): Promise<ToolResult> => {
    const { entityId, entityType, timeRange } = params;
    
    // Simulate timeline data generation
    const mockEvents = [
      {
        id: '1',
        date: '2024-01-15T10:00:00Z',
        title: 'Account Created',
        description: 'Customer account was created',
        type: 'account',
        severity: 'info'
      },
      {
        id: '2',
        date: '2024-01-16T14:30:00Z',
        title: 'First Transaction',
        description: 'Initial deposit of $5,000',
        type: 'transaction',
        severity: 'info'
      },
      {
        id: '3',
        date: '2024-01-20T09:15:00Z',
        title: 'Alert Generated',
        description: 'Unusual transaction pattern detected',
        type: 'alert',
        severity: 'warning'
      }
    ];

    return {
      id: crypto.randomUUID(),
      toolName: 'create-timeline',
      data: {
        entityId,
        entityType,
        timeRange,
        events: mockEvents
      },
      ui: {
        component: 'TimelineDisplay',
        props: {
          entityId,
          entityType,
          events: mockEvents
        }
      }
    };
  },
  uiComponent: 'TimelineDisplay'
};