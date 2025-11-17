import { z } from 'zod';
import { AIToolDefinition, ToolResult } from '../types';

export type SubjectField = {
  label: string;
  value: string;
  className?: string;
}

export type SubjectDisplay = {
  name: string;
  identifier: string;
  type: string;
  kycRisk?: {
    level: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  address?: string;
  contact?: string;
  gridColumns?: number;
  variableFields: SubjectField[];
}

const schema = z.object({
  name: z.string().describe('Name of the subject'),
  identifier: z.string().describe('Unique identifier for the subject (e.g., customer ID)'),
  type: z.string().describe('Type of subject (e.g., IND for Individual, CRP for Corporate, etc.)'),
  kycRisk: z.object({
    level: z.string().describe('KYC risk level (e.g., HIGH, MEDIUM, LOW)'),
    variant: z.enum(['default', 'secondary', 'destructive', 'outline']).describe('Badge color variant - use "destructive" for HIGH risk')
  }).optional().describe('Optional KYC risk information'),
  address: z.string().optional().describe('Full address string (e.g., "123 Main St, City, 12345, Country")'),
  contact: z.string().optional().describe('Contact information (e.g., "email@example.com (555-123-4567)")'),
  gridColumns: z.number().min(1).max(4).default(2).describe('Number of columns for the variable fields grid (1-4, defaults to 2)'),
  variableFields: z.array(z.object({
    label: z.string().describe('Field label (e.g., "Date of Birth", "Nationality", "Status")'),
    value: z.string().describe('Field value'),
    className: z.string().optional().describe('Optional Tailwind CSS class for styling (e.g., "font-bold text-red-500")')
  })).describe('Array of variable label-value pairs to display in a grid (e.g., status, dates, additional details)')
});

export const subjectDisplayTool: AIToolDefinition = {
  name: 'subject-display',
  description: 'Display subject information with fixed header fields and variable detail fields. Fixed fields include name, identifier, type, optional KYC risk badge, address, and contact info. Variable fields are displayed as customizable label-value pairs in a responsive grid layout (1-4 columns, defaults to 2). Perfect for showing customer, entity, or person details during investigations.',
  inputSchema: schema,
  handler: async (params): Promise<ToolResult> => {
    const subjectData: SubjectDisplay = {
      gridColumns: 2,
      ...params
    };
    
    try {
      return {
        id: crypto.randomUUID(),
        toolName: 'subject-display',
        data: {
          ...subjectData
        },
        ui: {
          component: 'SubjectDisplay',
          props: {
            ...subjectData
          }
        }
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        toolName: 'subject-display',
        data: {
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
          name: subjectData.name || 'Unknown',
          identifier: subjectData.identifier || 'N/A',
          type: subjectData.type || 'Unknown',
          gridColumns: 2,
          variableFields: []
        },
        ui: {
          component: 'SubjectDisplay',
          props: {
            name: subjectData.name || 'Unknown',
            identifier: subjectData.identifier || 'N/A', 
            type: subjectData.type || 'Unknown',
            gridColumns: 2,
            variableFields: [],
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          }
        }
      };
    }
  },
  uiComponent: 'SubjectDisplay'
};