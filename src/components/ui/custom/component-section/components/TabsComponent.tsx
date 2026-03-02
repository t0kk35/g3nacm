/**
 * Tabs Component
 *
 * A tabbed interface for organizing content into multiple panels.
 * Wraps shadcn/ui Tabs components with a simplified API.
 */

'use client';

import React from 'react';
import { z } from 'zod';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

/**
 * Tab definition schema
 */
export const TabDefinitionSchema = z.object({
  id: z.string().describe('Unique tab identifier'),
  label: z.string().describe('Tab label text'),
  icon: z.string().optional().describe('Icon (emoji or icon name)'),
  disabled: z.boolean().default(false).describe('Disable this tab'),
});

/**
 * Props schema for TabsComponent
 */
export const TabsPropsSchema = z.object({
  tabs: z
    .array(TabDefinitionSchema)
    .min(1)
    .describe('Array of tab definitions'),
  defaultTab: z.string().optional().describe('Default active tab ID'),
  orientation: z
    .enum(['horizontal', 'vertical'])
    .default('horizontal')
    .describe('Tab orientation'),
  className: z.string().optional().describe('Additional CSS classes'),
});

/**
 * Inferred types from schemas
 */
export type TabDefinition = z.infer<typeof TabDefinitionSchema>;
export type TabsProps = z.infer<typeof TabsPropsSchema>;

/**
 * Tabs Component
 *
 * Children are mapped to tabs by index:
 * - children[0] corresponds to tabs[0]
 * - children[1] corresponds to tabs[1]
 * - etc.
 */
export function TabsComponent({
  tabs,
  defaultTab,
  orientation = 'horizontal',
  className = '',
  children,
}: TabsProps & { children?: React.ReactNode }) {
  // Convert children to array for index-based mapping
  const childArray = React.Children.toArray(children);

  // Use first tab as default if not specified
  const defaultValue = defaultTab || tabs[0]?.id;

  return (
    <Tabs
      defaultValue={defaultValue}
      orientation={orientation}
      className={className}
    >
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            disabled={tab.disabled}
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab, index) => (
        <TabsContent key={tab.id} value={tab.id}>
          {childArray[index] || null}
        </TabsContent>
      ))}
    </Tabs>
  );
}
