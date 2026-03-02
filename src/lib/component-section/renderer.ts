/**
 * Section Renderer
 *
 * Core rendering engine for component-based dynamic sections.
 * Handles API orchestration, data resolution, and recursive component rendering.
 */

import React from 'react';
import { ApiOrchestrator } from '../entity-template/api-orchestrator';
import { componentRegistry } from './component-registry';
import { dataResolver } from './data-resolver';
import type { SectionConfig, ComponentConfig, RenderedSection, SectionError, TemplateContext, DataMode } from './types';

/**
 * Section Renderer class
 * Manages the rendering of complete sections with API calls and component trees
 */
export class SectionRenderer {
  private apiOrchestrator: ApiOrchestrator;

  constructor() {
    this.apiOrchestrator = new ApiOrchestrator();
  }

  /**
   * Render a complete section
   * Executes API calls, then renders component tree
   */
  async renderSection(
    config: SectionConfig,
    context: TemplateContext,
    cookies?: string
  ): Promise<RenderedSection> {
    const errors: SectionError[] = [];
    let dataContext = { ...context };
    const dataSources: string[] = [];

    try {
      // Step 1: Execute API calls if any (reference mode)
      if (config.apiCalls && config.apiCalls.length > 0) {
        console.log(`Executing ${config.apiCalls.length} API calls for section ${config.code}`);

        const apiResult = await this.apiOrchestrator.executeApiCalls(
          config.apiCalls,
          context,
          cookies
        );

        dataContext = apiResult.context;

        // Track data sources
        config.apiCalls.forEach((call) => dataSources.push(call.endpoint));

        // Convert template errors to section errors
        if (apiResult.errors && apiResult.errors.length > 0) {
          errors.push(
            ...apiResult.errors.map((e) => ({
              ...e,
              componentId: undefined,
              componentType: undefined,
            }))
          );
        }
      }

      // Step 2: Validate component tree
      const validation = componentRegistry.validateTree(config.rootComponent);
      if (!validation.success) {
        errors.push({
          type: 'render_error',
          message: `Component tree validation failed: ${validation.errors?.join(', ')}`,
          recoverable: false,
        });

        // Return error result
        return {
          section_code: config.code,
          entity_id: context.entity_id,
          entity_code: context.entity_code,
          component: React.createElement(
            'div',
            { className: 'p-4 text-red-600' },
            'Section rendering failed: Invalid component tree'
          ),
          rendered_at: new Date().toISOString(),
          context: dataContext,
          errors,
          section_version: config.version,
        };
      }

      // Step 3: Render component tree
      const renderedComponent = this.renderComponent(
        config.rootComponent,
        dataContext,
        errors
      );

      // Step 4: Return result
      return {
        section_code: config.code,
        entity_id: context.entity_id,
        entity_code: context.entity_code,
        component: renderedComponent,
        rendered_at: new Date().toISOString(),
        context: dataContext,
        data_sources: dataSources.length > 0 ? dataSources : undefined,
        errors: errors.length > 0 ? errors : undefined,
        section_version: config.version,
      };
    } catch (error) {
      // Fatal error
      const fatalError: SectionError = {
        type: 'render_error',
        message: `Fatal rendering error: ${(error as Error).message}`,
        recoverable: false,
        stack:
          process.env.NODE_ENV === 'development'
            ? (error as Error).stack
            : undefined,
      };

      errors.push(fatalError);

      return {
        section_code: config.code,
        entity_id: context.entity_id,
        entity_code: context.entity_code,
        component: React.createElement(
          'div',
          { className: 'p-4 text-red-600' },
          `Fatal error: ${(error as Error).message}`
        ),
        rendered_at: new Date().toISOString(),
        context: dataContext,
        errors,
        section_version: config.version,
      };
    }
  }

  /**
   * Render a single component (recursive)
   * Resolves data, validates, and creates React element
   */
  private renderComponent(
    config: ComponentConfig,
    context: TemplateContext,
    errors: SectionError[]
  ): React.ReactElement {
    try {
      // Step 1: Get component definition
      const definition = componentRegistry.get(config.type);
      if (!definition) {
        const error: SectionError = {
          type: 'render_error',
          message: `Unknown component type: ${config.type}`,
          recoverable: true,
          componentId: config.id,
          componentType: config.type,
        };
        errors.push(error);

        return React.createElement(
          'div',
          {
            key: config.id,
            className: 'p-2 border border-red-300 bg-red-50 rounded',
          },
          `Unknown component: ${config.type}`
        );
      }

      // Step 2: Check condition if specified
      if (config.condition) {
        const shouldRender = dataResolver.evaluateCondition(
          config.condition,
          context
        );
        if (!shouldRender) {
          // Don't render this component
          return React.createElement(React.Fragment, { key: config.id });
        }
      }

      // Step 3: Resolve props based on data mode
      const dataMode: DataMode = config.dataMode || 'inline';
      let resolvedProps = dataResolver.resolveProps(
        config.props || {},
        dataMode,
        context
      );

      // Step 4: Validate props
      const validation = componentRegistry.validate(
        config.type,
        resolvedProps
      );
      if (!validation.success) {
        const error: SectionError = {
          type: 'render_error',
          message: `Invalid props for ${config.type}: ${validation.errors?.join(', ')}`,
          recoverable: true,
          componentId: config.id,
          componentType: config.type,
        };
        errors.push(error);

        return React.createElement(
          'div',
          {
            key: config.id,
            className: 'p-2 border border-yellow-300 bg-yellow-50 rounded',
          },
          `Invalid props for ${config.type}`
        );
      }

      // Use validated props
      resolvedProps = validation.data || resolvedProps;

      // Step 5: Render children recursively
      let children: React.ReactNode = null;
      if (config.children && config.children.length > 0) {
        if (!definition.allowsChildren) {
          const error: SectionError = {
            type: 'render_error',
            message: `Component ${config.type} does not allow children`,
            recoverable: true,
            componentId: config.id,
            componentType: config.type,
          };
          errors.push(error);
        } else {
          children = config.children.map((childConfig) =>
            this.renderComponent(childConfig, context, errors)
          );
        }
      }

      // Step 6: Create React element
      const Component = definition.component;
      return React.createElement(
        Component,
        { ...resolvedProps, key: config.id },
        children
      );
    } catch (error) {
      // Component rendering error
      const renderError: SectionError = {
        type: 'render_error',
        message: `Error rendering component ${config.type}: ${(error as Error).message}`,
        recoverable: true,
        componentId: config.id,
        componentType: config.type,
        stack:
          process.env.NODE_ENV === 'development'
            ? (error as Error).stack
            : undefined,
      };
      errors.push(renderError);

      return React.createElement(
        'div',
        {
          key: config.id,
          className: 'p-2 border border-red-300 bg-red-50 rounded',
        },
        `Error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Validate a section configuration
   * Checks component tree and data references
   */
  validateSection(config: SectionConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate component tree
    const treeValidation = componentRegistry.validateTree(config.rootComponent);
    if (!treeValidation.success) {
      errors.push(...(treeValidation.errors || []));
    }

    // Validate data references (if using reference mode)
    const validateDataRefs = (componentConfig: ComponentConfig) => {
      const dataMode = componentConfig.dataMode || 'inline';
      if (dataMode === 'reference' || dataMode === 'hybrid') {
        const refs = dataResolver.extractDataReferences(
          componentConfig.props || {}
        );

        // Check that referenced variables have corresponding API calls
        for (const ref of refs) {
          const hasApiCall = config.apiCalls.some(
            (call) => call.variable_name === ref
          );
          if (!hasApiCall) {
            errors.push(
              `Component ${componentConfig.id} references {{${ref}}} but no API call produces this variable`
            );
          }
        }
      }

      // Recursively validate children
      if (componentConfig.children) {
        componentConfig.children.forEach(validateDataRefs);
      }
    };

    validateDataRefs(config.rootComponent);

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Global section renderer instance
 */
export const sectionRenderer = new SectionRenderer();
