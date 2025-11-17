// Template context interface - supports both simple values and complex objects
export interface TemplateContext {
  // Simple values
  userName?: string;
  userRole?: string;
  currentDateTime?: string;
  applicationName?: string;
  
  // Complex objects that will be JSON stringified
  user?: Record<string, any>;
  customer?: Record<string, any>;
  alert?: Record<string, any>;
  case?: Record<string, any>;
  transaction?: Record<string, any>;
  
  // Custom context - can be anything
  [key: string]: any;
}

const CONTEXT_REGEX = /\{\{([^}]+)\}\}/g

// Template substitution function
export function substituteTemplate(template: string, context: TemplateContext): string {
  // Replace {{variableName}} with context values
  return template.replace(CONTEXT_REGEX, (match, variableName) => {
    const trimmedName = variableName.trim();
    const value = context[trimmedName];
    
    if (value === undefined || value === null) {
      // Return empty string for undefined/null values
      return '';
    }
    
    // If it's an object, stringify it as JSON
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    
    // For primitive values, convert to string
    return String(value);
  });
}

// Helper function to get default context
export function getDefaultContext(): TemplateContext {
  return {
    currentDateTime: new Date().toISOString(),
    applicationName: 'g3nACM',
  };
}

// Helper function to merge contexts
export function mergeContexts(...contexts: (TemplateContext | undefined)[]): TemplateContext {
  return contexts.reduce<TemplateContext>((merged, context) => {
    if (context) {
      return { ...merged, ...context };
    }
    return merged;
  }, {});
}

// Validation function to check if template has valid syntax
export function validateTemplate(template: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const matches = template.match(CONTEXT_REGEX);
  
  if (!matches) {
    return { isValid: true, errors: [] };
  }
  
  for (const match of matches) {
    const variableName = match.slice(2, -2).trim();
    
    if (!variableName) {
      errors.push(`Empty variable name in template: ${match}`);
    }
    
    if (variableName.includes('{{') || variableName.includes('}}')) {
      errors.push(`Nested template variables not supported: ${match}`);
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

// Function to extract variable names from template
export function extractTemplateVariables(template: string): string[] {
  const matches = template.match(CONTEXT_REGEX);
  
  if (!matches) {
    return [];
  }
  
  return matches.map(match => match.slice(2, -2).trim());
}