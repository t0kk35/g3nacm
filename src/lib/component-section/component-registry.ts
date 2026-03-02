/**
 * Component Registry
 *
 * Central registry for components that can be rendered in dynamic screens.
 * Provides component registration, validation, and export for AI agents.
 */

import { z } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';
import type {
  ComponentDefinition,
  ComponentCategory,
  ComponentExport,
} from './types';

/**
 * Component Registry class
 * Manages registration and retrieval of renderable components
 */
export class ComponentRegistry {
  private components: Map<string, ComponentDefinition> = new Map();
  private initialized: boolean = false;

  /**
   * Register a component definition
   */
  register(definition: ComponentDefinition): void {
    // Validate definition
    if (!definition.code) {
      throw new Error('Component definition must have a code');
    }

    if (!definition.component) {
      throw new Error(`Component ${definition.code} must have a component`);
    }

    if (!definition.propsSchema) {
      throw new Error(`Component ${definition.code} must have a propsSchema`);
    }

    // Warn if overwriting
    if (this.components.has(definition.code)) {
      console.warn(`Overwriting component definition: ${definition.code}`);
    }

    this.components.set(definition.code, definition);
    console.log(`Registered component: ${definition.code}`);
  }

  /**
   * Get a component definition by code
   */
  get(code: string): ComponentDefinition | undefined {
    return this.components.get(code);
  }

  /**
   * Get all registered components
   */
  getAll(): ComponentDefinition[] {
    return Array.from(this.components.values());
  }

  /**
   * Get components by category
   */
  getByCategory(category: ComponentCategory): ComponentDefinition[] {
    return this.getAll().filter((c) => c.category === category);
  }

  /**
   * Get components by permission
   * Returns components that require no permissions or permissions the user has
   */
  getByPermission(userPermissions: string[]): ComponentDefinition[] {
    return this.getAll().filter((c) => {
      if (!c.permissions || c.permissions.length === 0) {
        return true; // No permission required
      }

      // Check if user has all required permissions
      return c.permissions.every((perm) => userPermissions.includes(perm));
    });
  }

  /**
   * Check if a component exists
   */
  exists(code: string): boolean {
    return this.components.has(code);
  }

  /**
   * Validate component props against schema
   */
  validate(
    code: string,
    props: any
  ): { success: boolean; errors?: string[]; data?: any } {
    const component = this.get(code);

    if (!component) {
      return {
        success: false,
        errors: [`Component not found: ${code}`],
      };
    }

    try {
      const validated = component.propsSchema.parse(props);
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        };
      }

      return {
        success: false,
        errors: ['Invalid configuration'],
      };
    }
  }

  /**
   * Validate component tree recursively
   * Checks that all component types exist and props are valid
   */
  validateTree(
    componentConfig: any
  ): { success: boolean; errors?: string[] } {
    const errors: string[] = [];

    const validateNode = (node: any, path: string = 'root') => {
      // Check component exists
      if (!node.type) {
        errors.push(`${path}: Missing component type`);
        return;
      }

      if (!this.exists(node.type)) {
        errors.push(`${path}: Unknown component type: ${node.type}`);
        return;
      }

      const component = this.get(node.type)!;

      // Validate props
      const validation = this.validate(node.type, node.props || {});
      if (!validation.success) {
        errors.push(
          `${path} (${node.type}): ${validation.errors?.join(', ')}`
        );
      }

      // Check children if present
      if (node.children && node.children.length > 0) {
        if (!component.allowsChildren) {
          errors.push(
            `${path} (${node.type}): Component does not allow children`
          );
        }

        // Validate child types if restricted
        if (component.allowedChildren && component.allowedChildren.length > 0) {
          for (const child of node.children) {
            if (!component.allowedChildren.includes(child.type)) {
              errors.push(
                `${path} (${node.type}): Child type ${child.type} not allowed. Allowed: ${component.allowedChildren.join(', ')}`
              );
            }
          }
        }

        // Recursively validate children
        for (let i = 0; i < node.children.length; i++) {
          validateNode(node.children[i], `${path}.children[${i}]`);
        }
      }
    };

    validateNode(componentConfig);

    return errors.length === 0
      ? { success: true }
      : { success: false, errors };
  }

  /**
   * Export component registry for AI agents
   * Converts Zod schemas to JSON Schema format for better AI understanding
   */
  exportForAI(components?: ComponentDefinition[]): string {
    const comps = components || this.getAll();

    const exported: ComponentExport[] = comps.map((c) => ({
      code: c.code,
      name: c.name,
      description: c.description,
      category: c.category,
      allowsChildren: c.allowsChildren,
      allowedChildren: c.allowedChildren,
      // Convert Zod schema to JSON Schema for AI
      propsSchema: zodToJsonSchema(c.propsSchema, {
        target: 'openApi3',
        $refStrategy: 'none', // Inline definitions for simpler output
      }),
      defaultProps: c.defaultProps,
      examples: c.examples,
    }));

    return JSON.stringify(exported, null, 2);
  }

  /**
   * Export as object (for programmatic use)
   */
  exportForAIObject(components?: ComponentDefinition[]): ComponentExport[] {
    const comps = components || this.getAll();

    return comps.map((c) => ({
      code: c.code,
      name: c.name,
      description: c.description,
      category: c.category,
      allowsChildren: c.allowsChildren,
      allowedChildren: c.allowedChildren,
      propsSchema: zodToJsonSchema(c.propsSchema, {
        target: 'openApi3',
        $refStrategy: 'none',
      }),
      defaultProps: c.defaultProps,
      examples: c.examples,
    }));
  }

  /**
   * Unregister a component (for testing)
   */
  unregister(code: string): boolean {
    return this.components.delete(code);
  }

  /**
   * Clear all registered components (for testing)
   */
  clear(): void {
    this.components.clear();
    this.initialized = false;
  }

  /**
   * Get count of registered components
   */
  count(): number {
    return this.components.size;
  }

  /**
   * Mark as initialized (called after all components are registered)
   */
  markInitialized(): void {
    this.initialized = true;
    console.log(
      `Component registry initialized with ${this.count()} components`
    );
  }

  /**
   * Check if registry has been initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Global component registry instance
 */
export const componentRegistry = new ComponentRegistry();
