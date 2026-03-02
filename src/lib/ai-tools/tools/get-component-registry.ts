/**
 * Get Component Registry AI Tool
 *
 * Allows AI agents to discover available UI components before generating sections.
 * Returns component definitions with schemas, descriptions, and examples.
 */

import { z } from 'zod';
import { AIToolDefinition, ToolResult } from '../types';
import { componentRegistry } from '@/lib/component-section/component-registry';
import { registerComponents } from '@/components/ui/custom/component-section';
import { GetComponentRegistryInputSchema } from './schemas/component-section-schemas';
import { ComponentCategory } from '@/lib/component-section/types';

export const getComponentRegistryTool: AIToolDefinition = {
  name: 'get-component-registry',
  description: `Get list of available UI components for rendering custom sections.

    **IMPORTANT**: Call this tool FIRST before using render-ui-section to understand what components are available.

    This tool returns:
      - Component codes (e.g., "card", "tabs", "data-table")
      - Component descriptions and capabilities
      - Props schemas (what props each component accepts)
      - Example configurations
      - Whether components allow children

      Use this information to plan your section layout before generating it`.trim(),
  inputSchema: GetComponentRegistryInputSchema,
  handler: async (params): Promise<ToolResult> => {
    // Ensure components are registered
    if (!componentRegistry.isInitialized()) registerComponents();

    // Get components (filtered by category if specified)
    let components;
    if (params.category && params.category !== 'all') {
      components = componentRegistry.getByCategory(
        params.category as ComponentCategory
      );
    } else {
      components = componentRegistry.getAll();
    }

    // Export for AI
    const exportedComponents = componentRegistry.exportForAIObject(components);

    return {
      id: crypto.randomUUID(),
      toolName: 'get-component-registry',
      data: {
        count: exportedComponents.length,
        category: params.category || 'all',
        components: exportedComponents,
      },
    };
  },
};
