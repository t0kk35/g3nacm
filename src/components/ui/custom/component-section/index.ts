/**
 * Component Registration
 *
 * Imports all components and registers them with the component registry.
 * This file should be imported once at application startup.
 */

import { componentRegistry } from '@/lib/component-section/component-registry';
import { ComponentCategory } from '@/lib/component-section/types';

// Import components
import { CardComponent, CardPropsSchema } from './components/CardComponent';
import { TabsComponent, TabsPropsSchema } from './components/TabsComponent';
import { GridComponent, GridPropsSchema } from './components/GridComponent';
import { DataTableComponent, DataTablePropsSchema } from './components/DataTableComponent';
import { ChartComponent, ChartPropsSchema } from './components/ChartComponent';
import { BadgeComponent, BadgePropsSchema } from './components/BadgeComponent';
import { TextComponent, TextPropsSchema } from './components/TextComponent';
import { FieldComponent, FieldPropsSchema } from './components/FieldComponent';
import { IconComponent, IconPropsSchema } from './components/IconComponent';
import { FlexComponent, FlexPropsSchema } from './components/FlexComponent';

/**
 * Register all components
 */
export function registerComponents() {
  // Layout Components

  componentRegistry.register({
    code: 'card',
    name: 'Card',
    description: 'A card container for grouping related content with optional header and footer',
    component: CardComponent,
    propsSchema: CardPropsSchema,
    defaultProps: {
      showHeader: true,
      showFooter: false,
      variant: 'default',
    },
    allowsChildren: true,
    category: ComponentCategory.LAYOUT,
    tags: ['container', 'layout', 'card'],
    examples: [
      {
        title: 'Simple Card',
        description: 'A basic card with title and content',
        config: {
          id: 'card-1',
          type: 'card',
          props: {
            title: 'Card Title',
            description: 'Card description',
          },
          children: [],
        },
      },
    ],
  });

  componentRegistry.register({
    code: 'tabs',
    name: 'Tabs',
    description: 'A tabbed interface for organizing content into multiple panels',
    component: TabsComponent,
    propsSchema: TabsPropsSchema,
    defaultProps: {
      orientation: 'horizontal',
    },
    allowsChildren: true,
    category: ComponentCategory.LAYOUT,
    tags: ['tabs', 'navigation', 'layout'],
    examples: [
      {
        title: 'Simple Tabs',
        description: 'Tabs with multiple panels',
        config: {
          id: 'tabs-1',
          type: 'tabs',
          props: {
            tabs: [
              { id: 'tab1', label: 'Tab 1' },
              { id: 'tab2', label: 'Tab 2' },
            ],
          },
          children: [],
        },
      },
    ],
  });

  componentRegistry.register({
    code: 'grid',
    name: 'Grid',
    description: 'A responsive grid layout for arranging child components',
    component: GridComponent,
    propsSchema: GridPropsSchema,
    defaultProps: {
      columns: 2,
      gap: 4,
    },
    allowsChildren: true,
    category: ComponentCategory.LAYOUT,
    tags: ['grid', 'layout', 'container'],
    examples: [
      {
        title: '2-Column Grid',
        description: 'A simple 2-column grid',
        config: {
          id: 'grid-1',
          type: 'grid',
          props: {
            columns: 2,
            gap: 4,
          },
          children: [],
        },
      },
    ],
  });

  // Data Display Components

  componentRegistry.register({
    code: 'data-table',
    name: 'Data Table',
    description: 'A table for displaying tabular data with sorting and pagination',
    component: DataTableComponent,
    propsSchema: DataTablePropsSchema,
    defaultProps: {
      pagination: true,
      pageSize: 10,
      emptyMessage: 'No data available',
    },
    allowsChildren: false,
    category: ComponentCategory.DATA_DISPLAY,
    tags: ['table', 'data', 'list'],
    examples: [
      {
        title: 'Simple Table',
        description: 'A basic data table',
        config: {
          id: 'table-1',
          type: 'data-table',
          props: {
            columns: [
              { id: 'name', label: 'Name', accessor: 'name' },
              { id: 'value', label: 'Value', accessor: 'value' },
            ],
            data: [
              { name: 'Item 1', value: 100 },
              { name: 'Item 2', value: 200 },
            ],
          },
        },
      },
    ],
  });

  componentRegistry.register({
    code: 'chart',
    name: 'Chart',
    description: 'A chart for visualizing data (bar, line, area, pie, etc.)',
    component: ChartComponent,
    propsSchema: ChartPropsSchema,
    defaultProps: {
      height: 300,
      title: 'Chart',
    },
    allowsChildren: false,
    category: ComponentCategory.DATA_DISPLAY,
    tags: ['chart', 'visualization', 'data'],
    examples: [
      {
        title: 'Bar Chart',
        description: 'A simple bar chart',
        config: {
          id: 'chart-1',
          type: 'chart',
          props: {
            title: 'Sample Chart',
            chartType: 'bar',
            data: [
              { month: 'Jan', value: 100 },
              { month: 'Feb', value: 200 },
            ],
            chartConfig: {
              value: { label: 'Value', color: 'hsl(var(--chart-1))' },
            },
            xAxisKey: 'month',
          },
        },
      },
    ],
  });

  componentRegistry.register({
    code: 'badge',
    name: 'Badge',
    description: 'A badge for displaying status, labels, or tags',
    component: BadgeComponent,
    propsSchema: BadgePropsSchema,
    defaultProps: {
      variant: 'default',
    },
    allowsChildren: false,
    category: ComponentCategory.DATA_DISPLAY,
    tags: ['badge', 'label', 'tag', 'status'],
    examples: [
      {
        title: 'Status Badge',
        description: 'A badge showing status',
        config: {
          id: 'badge-1',
          type: 'badge',
          props: {
            text: 'Active',
            variant: 'default',
          },
        },
      },
    ],
  });

  // Content Components

  componentRegistry.register({
    code: 'text',
    name: 'Text',
    description: 'A component for displaying formatted text content',
    component: TextComponent,
    propsSchema: TextPropsSchema,
    defaultProps: {
      variant: 'paragraph',
    },
    allowsChildren: false,
    category: ComponentCategory.CONTENT,
    tags: ['text', 'typography', 'content'],
    examples: [
      {
        title: 'Heading',
        description: 'A heading text',
        config: {
          id: 'text-1',
          type: 'text',
          props: {
            content: 'Hello World',
            variant: 'h2',
          },
        },
      },
    ],
  });

  componentRegistry.register({
    code: 'field',
    name: 'Field',
    description: 'A component for displaying label-value pairs with consistent formatting',
    component: FieldComponent,
    propsSchema: FieldPropsSchema,
    defaultProps: {
      variant: 'default',
      showColon: true,
    },
    allowsChildren: false,
    category: ComponentCategory.DATA_DISPLAY,
    tags: ['field', 'label', 'value', 'data', 'display'],
    examples: [
      {
        title: 'Basic Field',
        description: 'A simple label-value field',
        config: {
          id: 'field-1',
          type: 'field',
          props: {
            label: 'Customer Name',
            value: 'John Doe',
          },
        },
      },
      {
        title: 'Large Field',
        description: 'A field with larger text',
        config: {
          id: 'field-2',
          type: 'field',
          props: {
            label: 'Total Amount',
            value: '$1,234.56',
            variant: 'large',
          },
        },
      },
      {
        title: 'Muted Field',
        description: 'A field with muted styling',
        config: {
          id: 'field-3',
          type: 'field',
          props: {
            label: 'Last Updated',
            value: '2026-02-17',
            variant: 'muted',
          },
        },
      },
    ],
  });


  componentRegistry.register({
    code: 'icon',
    name: 'Icon',
    description: 'Renders a Lucide icon by name with configurable size, color, and stroke width',
    component: IconComponent,
    propsSchema: IconPropsSchema,
    defaultProps: {
      size: 24,
      strokeWidth: 2,
    },
    allowsChildren: false,
    category: ComponentCategory.CONTENT,
    tags: ['icon', 'lucide', 'visual'],
    examples: [
      {
        title: 'Check Circle Icon',
        description: 'A green check circle icon at 32px',
        config: {
          id: 'icon-1',
          type: 'icon',
          props: {
            name: 'CheckCircle',
            size: 32,
            color: '#22c55e',
          },
        },
      },
      {
        title: 'Alert Icon',
        description: 'A warning icon using current text color',
        config: {
          id: 'icon-2',
          type: 'icon',
          props: {
            name: 'AlertTriangle',
            size: 24,
            color: 'currentColor',
          },
        },
      },
    ],
  });

  componentRegistry.register({
    code: 'flex',
    name: 'Flex',
    description: 'A flexbox layout container for aligning child components with configurable direction, justification, alignment, and gap',
    component: FlexComponent,
    propsSchema: FlexPropsSchema,
    defaultProps: {
      direction: 'row',
      justify: 'start',
      align: 'center',
      gap: 4,
      wrap: false,
    },
    allowsChildren: true,
    category: ComponentCategory.LAYOUT,
    tags: ['flex', 'layout', 'container', 'align'],
    examples: [
      {
        title: 'Horizontal Row',
        description: 'Align children side by side with a gap',
        config: {
          id: 'flex-1',
          type: 'flex',
          props: {
            direction: 'row',
            align: 'center',
            gap: 4,
          },
          children: [],
        },
      },
      {
        title: 'Centered Row',
        description: 'Horizontally center children',
        config: {
          id: 'flex-2',
          type: 'flex',
          props: {
            direction: 'row',
            justify: 'center',
            align: 'center',
            gap: 2,
          },
          children: [],
        },
      },
      {
        title: 'Space Between',
        description: 'Spread children across the full width',
        config: {
          id: 'flex-3',
          type: 'flex',
          props: {
            direction: 'row',
            justify: 'between',
            align: 'center',
            gap: 0,
          },
          children: [],
        },
      },
      {
        title: 'Vertical Stack',
        description: 'Stack children vertically',
        config: {
          id: 'flex-4',
          type: 'flex',
          props: {
            direction: 'col',
            align: 'start',
            gap: 2,
          },
          children: [],
        },
      },
    ],
  });

  componentRegistry.markInitialized();
  console.log('Component registry initialized with all components');
}

// Export component types for use elsewhere
export {
  CardComponent,
  TabsComponent,
  GridComponent,
  DataTableComponent,
  ChartComponent,
  BadgeComponent,
  TextComponent,
  FieldComponent,
  IconComponent,
  FlexComponent,
};

// Export schemas for use elsewhere
export {
  CardPropsSchema,
  TabsPropsSchema,
  GridPropsSchema,
  DataTablePropsSchema,
  ChartPropsSchema,
  BadgePropsSchema,
  TextPropsSchema,
  FieldPropsSchema,
  IconPropsSchema,
  FlexPropsSchema,
};
