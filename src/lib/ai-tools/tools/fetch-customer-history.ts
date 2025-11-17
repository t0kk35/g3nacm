import { z } from 'zod';
import { AIToolDefinition, ToolResult } from '../types';

const schema = z.object({
  customerId: z.string().describe('The customer ID to fetch history for'),
  limit: z.number().optional().describe('Maximum number of records to return')
});

export const fetchCustomerHistoryTool: AIToolDefinition = {
  name: 'fetch-customer-history',
  description: 'Fetches customer interaction history and account details',
  inputSchema: schema,
  handler: async (params): Promise<ToolResult> => {
    const { customerId, limit = 10 } = params;
    
    // Simulate API call - replace with actual implementation
    const mockData = {
      customerId,
      customerName: 'John Doe',
      accountType: 'Premium',
      interactions: [
        {
          id: '1',
          date: '2024-01-15',
          type: 'Phone Call',
          summary: 'Account balance inquiry',
          agent: 'Agent Smith'
        },
        {
          id: '2',
          date: '2024-01-10',
          type: 'Email',
          summary: 'Password reset request',
          agent: 'System'
        }
      ].slice(0, limit)
    };

    return {
      id: crypto.randomUUID(),
      toolName: 'fetch-customer-history',
      data: mockData,
      ui: {
        component: 'CustomerHistoryDisplay',
        props: {
          customer: mockData,
          interactions: mockData.interactions
        }
      }
    };
  },
  uiComponent: 'CustomerHistoryDisplay'
};