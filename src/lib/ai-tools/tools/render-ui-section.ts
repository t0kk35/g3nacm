/**
 * Render UI Section AI Tool
 *
 * Generates and renders rich UI sections with custom components.
 * AI agents use this to create dynamic, interactive visualizations.
 */

import { z } from 'zod';
import { AIToolDefinition, ToolResult } from '../types';
import { componentRegistry } from '@/lib/component-section/component-registry';
import { registerComponents } from '@/components/ui/custom/component-section';
import { RenderUISectionInputSchema, SectionConfigInlineSchema } from './schemas/component-section-schemas';
import type { SectionConfig } from '@/lib/component-section/types';

// Extended schema that includes the section configuration
const ExtendedInputSchema = RenderUISectionInputSchema.extend({
  screenConfig: SectionConfigInlineSchema.describe(
    'The component tree configuration for the section'
  ),
});

export const renderUISectionTool: AIToolDefinition = {
  name: 'render-ui-section',
  description: `
Generate and render a rich UI section with custom components.

**WORKFLOW:**
1. Call get-component-registry FIRST to see available components
2. Fetch any data you need via other tools (get-alert, get-subject, etc.)
3. Use this tool with INLINE data (embed fetched data directly in component props)

**DATA MODE:**
- ALWAYS use inline dataMode (default)
- Embed actual data values in props (e.g., "title": "ALERT-2024-001")
- DO NOT use {{variable}} references - provide real values

**AVAILABLE COMPONENTS:**
Call get-component-registry to see full list. Common components:
- card: Container with title, description, content
- tabs: Multi-panel tabbed interface
- grid: Responsive grid layout
- data-table: Table with sorting and pagination
- chart: Bar, line, area, pie, donut, scatter charts
- badge: Status indicators
- text: Formatted text (headings, paragraphs, code)
- markdown: Rich text content

**EXAMPLE:**
{
  "screenName": "Alert Investigation",
  "screenConfig": {
    "rootComponent": {
      "id": "root-card",
      "type": "card",
      "dataMode": "inline",
      "props": {
        "title": "ALERT-2024-001",
        "description": "High-value transaction alert"
      },
      "children": [
        {
          "id": "chart-1",
          "type": "chart",
          "dataMode": "inline",
          "props": {
            "title": "Risk Factors",
            "chartType": "bar",
            "data": [{"factor": "Amount", "score": 90}],
            "chartConfig": {"score": {"label": "Score"}},
            "xAxisKey": "factor"
          }
        }
      ]
    }
  }
}

**TIPS:**
- Keep component IDs unique and descriptive
- Use proper nesting (cards can contain grids, grids can contain other components)
- Validate data structures match component schemas
- Use tabs for organizing different views
- Charts need proper chartConfig with labels
  `.trim(),
  inputSchema: ExtendedInputSchema,
  handler: async (params): Promise<ToolResult> => {
    try {
      // Ensure components are registered
      if (!componentRegistry.isInitialized()) registerComponents();

      // Build section config
      const sectionConfig: SectionConfig = {
        code: 'ai-generated',
        name: params.screenName,
        description: params.description,
        version: '1.0.0',
        permissions: [],
        apiCalls: [], // No API calls for AI sections (data is inline)
        rootComponent: params.screenConfig.rootComponent,
        metadata: {
          createdBy: 'ai-agent',
          createdAt: new Date().toISOString(),
        },
      };

      // Validate component tree
      const validation = componentRegistry.validateTree(
        sectionConfig.rootComponent
      );

      if (!validation.success) {
        return {
          id: crypto.randomUUID(),
          toolName: 'render-ui-section',
          data: {
            screenName: params.screenName,
            screenDescription: params.description,
            error: `Section validation failed: ${validation.errors?.join(', ')}`,
          }
        };
      }

      // Return section config for client-side rendering
      // The UI will use ComponentSectionRenderer to display this
      return {
        id: crypto.randomUUID(),
        toolName: 'render-ui-section',
        data : {
          sectionConfig,
          context: {
            entity_id: '',
            entity_code: 'ai-generated',
            user_name: 'ai-agent',
            render_time: new Date().toISOString(),
          },
        },
        ui: {
          component: 'ComponentSectionRenderer',
          propsSource: 'data'  // Reference entire data object to avoid duplication
        },
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        toolName: 'render-ui-section',
        data : {
          screenName: params.screenName,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      };
    }
  },
};
