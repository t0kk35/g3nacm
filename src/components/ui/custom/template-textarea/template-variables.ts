// Template variable metadata for autocomplete and validation

export type VariableType = 'string' | 'object' | 'auto-generated';

export type VariableCategory = 'Auto-Generated' | 'User Context' | 'Entity Data';

export interface TemplateVariable {
  name: string;
  description: string;
  category: VariableCategory;
  type: VariableType;
  example?: string;
}

// Complete list of available template variables
export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  // Auto-Generated Variables
  {
    name: 'currentDateTime',
    description: 'Current date and time in ISO format',
    category: 'Auto-Generated',
    type: 'auto-generated',
    example: '2025-12-26T10:30:00Z'
  },
  {
    name: 'applicationName',
    description: 'Name of the application (always "g3nACM")',
    category: 'Auto-Generated',
    type: 'auto-generated',
    example: 'g3nACM'
  },

  // User Context Variables
  {
    name: 'userName',
    description: 'Name of the current user',
    category: 'User Context',
    type: 'string',
    example: 'John Doe'
  },
  {
    name: 'userRole',
    description: 'Role of the current user',
    category: 'User Context',
    type: 'string',
    example: 'Analyst'
  },
  {
    name: 'user',
    description: 'Complete user object (JSON)',
    category: 'User Context',
    type: 'object',
    example: '{ "name": "John Doe", "role": "Analyst", ... }'
  },

  // Entity Data Variables
  {
    name: 'customer',
    description: 'Complete customer object (JSON)',
    category: 'Entity Data',
    type: 'object',
    example: '{ "id": "123", "name": "ACME Corp", ... }'
  },
  {
    name: 'alert',
    description: 'Complete alert object (JSON)',
    category: 'Entity Data',
    type: 'object',
    example: '{ "id": "A-001", "type": "TM", ... }'
  },
  {
    name: 'case',
    description: 'Complete case object (JSON)',
    category: 'Entity Data',
    type: 'object',
    example: '{ "id": "C-001", "status": "Open", ... }'
  },
  {
    name: 'transaction',
    description: 'Complete transaction object (JSON)',
    category: 'Entity Data',
    type: 'object',
    example: '{ "id": "T-001", "amount": 10000, ... }'
  }
];

// Efficient lookup set for validation
export const VALID_TEMPLATE_VARIABLES = new Set(
  TEMPLATE_VARIABLES.map(v => v.name)
);

// Group variables by category for organized display
export function groupByCategory(variables: TemplateVariable[]): Record<VariableCategory, TemplateVariable[]> {
  return variables.reduce((acc, variable) => {
    if (!acc[variable.category]) {
      acc[variable.category] = [];
    }
    acc[variable.category].push(variable);
    return acc;
  }, {} as Record<VariableCategory, TemplateVariable[]>);
}
