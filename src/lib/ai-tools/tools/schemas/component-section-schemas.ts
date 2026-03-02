/**
 * AI Tool Schemas for Component Section System
 *
 * Zod schemas used by AI agents to generate component section configurations.
 * These schemas ensure type-safe, validated section generation with generateObject().
 */

import { z } from 'zod';

/**
 * Recursive component config schema for AI-generated sections
 * AI agents use INLINE data mode - they embed data directly in props
 */
export const ComponentConfigInlineSchema: z.ZodSchema = z.lazy(() =>
  z.object({
    id: z
      .string()
      .describe('Unique identifier for this component instance (use uuid or descriptive ID)'),
    type: z
      .string()
      .describe(
        'Component type code (e.g., "card", "tabs", "data-table", "chart", "badge", "text", "markdown", "grid")'
      ),
    dataMode: z
      .literal('inline')
      .default('inline')
      .describe('ALWAYS use inline mode for AI-generated sections'),
    props: z
      .record(z.any())
      .describe('Component-specific props - must match the component schema. Embed actual data values, NOT {{variable}} references'),
    children: z
      .array(ComponentConfigInlineSchema)
      .optional()
      .describe('Nested child components (only if this component allows children)'),
  })
);

/**
 * Section config schema for AI-generated sections (inline mode only)
 */
export const SectionConfigInlineSchema = z.object({
  rootComponent: ComponentConfigInlineSchema.describe(
    'Root component of the section layout - this is the top-level component that contains all others'
  ),
});

/**
 * Schema for get-component-registry tool input
 */
export const GetComponentRegistryInputSchema = z.object({
  category: z
    .enum(['all', 'layout', 'data-display', 'content', 'navigation', 'form'])
    .optional()
    .describe(
      'Filter components by category. Use "all" or omit to get all components.'
    ),
});

/**
 * Schema for render-ui-section tool input
 */
export const RenderUISectionInputSchema = z.object({
  screenName: z
    .string()
    .min(1)
    .max(100)
    .describe('Name/title of the section being generated'),
  description: z
    .string()
    .optional()
    .describe('Optional description of what this section shows'),
});

/**
 * Type inference from schemas
 */
export type ComponentConfigInline = z.infer<typeof ComponentConfigInlineSchema>;
export type SectionConfigInline = z.infer<typeof SectionConfigInlineSchema>;
export type GetComponentRegistryInput = z.infer<
  typeof GetComponentRegistryInputSchema
>;
export type RenderUISectionInput = z.infer<typeof RenderUISectionInputSchema>;
