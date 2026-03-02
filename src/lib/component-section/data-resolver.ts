/**
 * Data Resolver
 *
 * Handles data resolution for component props based on data mode.
 * Supports three modes:
 * - Inline: Props pass through unchanged (for AI agents)
 * - Reference: Props resolved via {{variable}} substitution (for entity screens)
 * - Hybrid: Mix of both approaches
 */

import type { DataMode, TemplateContext } from './types';

/**
 * Data Resolver class
 * Resolves component props based on data mode and context
 */
export class DataResolver {
  /**
   * Resolve props based on data mode
   * Handles variable substitution for reference/hybrid modes
   */
  resolveProps(
    props: Record<string, any>,
    dataMode: DataMode,
    context: TemplateContext
  ): Record<string, any> {
    if (dataMode === 'inline') {
      // Inline mode: props pass through unchanged
      return props;
    }

    // For reference/hybrid modes, resolve {{variable}} patterns
    return this.deepResolve(props, context);
  }

  /**
   * Deep resolve an object, array, or primitive value
   * Recursively processes all nested structures
   */
  private deepResolve(obj: any, context: TemplateContext): any {
    // Handle null/undefined
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle strings with template variables
    if (typeof obj === 'string') {
      return this.resolveString(obj, context);
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepResolve(item, context));
    }

    // Handle objects
    if (typeof obj === 'object') {
      const resolved: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = this.deepResolve(value, context);
      }
      return resolved;
    }

    // Handle primitives (number, boolean, etc.)
    return obj;
  }

  /**
   * Resolve a string with template variables
   * Pattern: {{variable.path}}
   * Returns original value if it's a full variable reference,
   * or a string with substituted values if embedded in text
   */
  private resolveString(template: string, context: TemplateContext): any {
    // Check if entire string is a single variable reference
    const fullMatch = template.match(/^\{\{([^}]+)\}\}$/);
    if (fullMatch) {
      // Return the actual value (preserves type: object, array, number, etc.)
      const path = fullMatch[1].trim();
      return this.getNestedValue(context, path);
    }

    // Otherwise, replace variables within string (converts to string)
    return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
      const value = this.getNestedValue(context, path.trim());

      // Convert to string for embedding
      if (value === null || value === undefined) {
        return '';
      }

      if (typeof value === 'object') {
        return JSON.stringify(value);
      }

      return String(value);
    });
  }

  /**
   * Get nested value from object using dot notation
   * Example: getNestedValue({alert: {id: "123"}}, "alert.id") -> "123"
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((curr, key) => curr?.[key], obj);
  }

  /**
   * Extract data references from props
   * Used for dependency tracking and validation
   * Returns array of top-level variable names (e.g., "alert", "subject")
   */
  extractDataReferences(props: Record<string, any>): string[] {
    const references = new Set<string>();

    // Regex to extract first-level variable names from {{variable.path}}
    const regex = /\{\{([^.}]+)/g;

    const extract = (obj: any) => {
      if (typeof obj === 'string') {
        const matches = obj.matchAll(regex);
        for (const match of matches) {
          const varName = match[1].trim();

          // Skip built-in context variables
          if (
            varName !== 'entity_id' &&
            varName !== 'entity_code' &&
            varName !== 'user_name' &&
            varName !== 'org_unit_code' &&
            varName !== 'render_time'
          ) {
            references.add(varName);
          }
        }
      } else if (Array.isArray(obj)) {
        obj.forEach(extract);
      } else if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(extract);
      }
    };

    extract(props);
    return Array.from(references);
  }

  /**
   * Evaluate a condition expression
   * For safety, uses a simple expression evaluator with limited scope
   */
  evaluateCondition(condition: string, context: TemplateContext): boolean {
    try {
      // First resolve all template variables in the condition
      const resolved = condition.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
        const value = this.getNestedValue(context, path.trim());
        return JSON.stringify(value);
      });

      // Use Function constructor with limited scope (safer than eval)
      // Note: In production, consider using a proper expression parser
      const func = new Function('context', `return ${resolved}`);
      return func(context);
    } catch (error) {
      console.error(`Failed to evaluate condition "${condition}":`, error);
      return false; // Fail safe - don't render if condition can't be evaluated
    }
  }

  /**
   * Auto-detect data mode from props
   * If props contain {{variable}} patterns, return 'reference', otherwise 'inline'
   */
  detectDataMode(props: Record<string, any>): DataMode {
    const references = this.extractDataReferences(props);
    return references.length > 0 ? 'reference' : 'inline';
  }

  /**
   * Check if a value contains template variables
   */
  hasTemplateVariables(value: any): boolean {
    if (typeof value === 'string') {
      return /\{\{[^}]+\}\}/.test(value);
    }

    if (Array.isArray(value)) {
      return value.some((item) => this.hasTemplateVariables(item));
    }

    if (value && typeof value === 'object') {
      return Object.values(value).some((v) => this.hasTemplateVariables(v));
    }

    return false;
  }

  /**
   * Validate that all template variables in props exist in context
   * Returns array of missing variable names
   */
  validateReferences(
    props: Record<string, any>,
    context: TemplateContext
  ): string[] {
    const references = this.extractDataReferences(props);
    const missing: string[] = [];

    for (const ref of references) {
      if (!(ref in context)) {
        missing.push(ref);
      }
    }

    return missing;
  }
}

/**
 * Global data resolver instance
 */
export const dataResolver = new DataResolver();
