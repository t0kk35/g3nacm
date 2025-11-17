import React, { ReactNode } from 'react'
import { string, z } from 'zod'

// Base widget interface
export interface BaseWidgetConfig {
  id: string
  type: string
  title: string
  [key: string]: any
}

// Responsive constraints interface
export interface ResponsiveConstraints {
  lg: { minW: number; maxW: number; minH: number; maxH: number }
  md: { minW: number; maxW: number; minH: number; maxH: number }
  sm: { minW: number; maxW: number; minH: number; maxH: number }
  xs: { minW: number; maxW: number; minH: number; maxH: number }
}

// Widget definition interface
export interface WidgetDefinition {
  code: string
  name: string
  description: string
  component: React.ComponentType<any>
  defaultConfig: Record<string, any>
  configSchema: z.ZodSchema<any>
  responsiveConstraints: ResponsiveConstraints
  permissions?: string[]
  category?: string
  tags?: string[]
}

export interface DynamicScreenWidget {
  id: string
  type: string
  title: string
  component: React.ComponentType<any>
  config: Record<string, any>
  responsiveConstraints: ResponsiveConstraints
}

// Widget registry class
export class WidgetRegistry {
  private widgets: Map<string, WidgetDefinition> = new Map()

  register(definition: WidgetDefinition) {
    this.widgets.set(definition.code, definition)
  }

  get(code: string): WidgetDefinition | undefined {
    return this.widgets.get(code)
  }

  getAll(): WidgetDefinition[] {
    return Array.from(this.widgets.values())
  }

  getByCategory(category: string): WidgetDefinition[] {
    return Array.from(this.widgets.values()).filter(w => w.category === category)
  }

  getByPermission(permissions: string[]): WidgetDefinition[] {
    return Array.from(this.widgets.values()).filter(widget => {
      if (!widget.permissions || widget.permissions.length === 0) return true
      return widget.permissions.some(p => permissions.includes(p))
    })
  }

  validateConfig(code: string, config: any): { success: boolean; errors?: string[] } {
    const widget = this.get(code)
    if (!widget) {
      return { success: false, errors: ['Widget not found'] }
    }

    try {
      widget.configSchema.parse(config)
      return { success: true }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          success: false, 
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }
      }
      return { success: false, errors: ['Invalid configuration'] }
    }
  }

  exists(code: string): boolean {
    return this.widgets.has(code)
  }

  unregister(code: string): boolean {
    return this.widgets.delete(code)
  }

  clear() {
    this.widgets.clear()
  }
}

// Global widget registry instance
export const widgetRegistry = new WidgetRegistry()

// Helper function to create widget instances
function createWidgetConfig(
  code: string,
  id: string, 
  config: Record<string, any> = {},
  overrides: Partial<BaseWidgetConfig> = {}
): BaseWidgetConfig | null {
  const definition = widgetRegistry.get(code)
  if (!definition) return null

  const mergedConfig = {
    ...definition.defaultConfig,
    ...config
  }

  const validation = widgetRegistry.validateConfig(code, mergedConfig)
  if (!validation.success) {
    console.error(`Widget config validation failed for ${code}:`, validation.errors)
    return null
  }

  return {
    id: id,
    type: code,
    title: definition.name,
    ...mergedConfig,
    ...overrides
  }
}

// Helper function to render widget with error boundary
function createWidgetComponent(
  definition: WidgetDefinition,
  config: BaseWidgetConfig,
  withWrapper: boolean = true
): ReactNode {
  const WidgetComponent = definition.component

  if (withWrapper) {
    // Import the wrapper component dynamically to avoid circular dependencies
    const { DynamicScreenWidgetWrapper } = require('./DynamicScreenWidgetWrapper') as {
      DynamicScreenWidgetWrapper: React.ComponentType<any>
    }
    
    return React.createElement(
      DynamicScreenWidgetWrapper,
      {
        widgetId: config.id,
        title: config.title
      },
      React.createElement(WidgetComponent, config)
    )
  }

  return React.createElement(WidgetComponent, config)
}

function createWrappedWidgetComponent(
  Wrapper: React.ComponentType<any>,
  WidgetComponent: React.ComponentType<any>,
  widgetId: string,
  title: string,
): React.ComponentType<any> {
  return function WrappedWidget(props: any) {
    return React.createElement(
      Wrapper,
      {
        widgetId: widgetId,
        title: title
      },
      React.createElement(WidgetComponent, { ...props })
    );
  };
}

// Helper function to create layout with responsive constraints
export function createLayoutWithConstraints(
  widgetId: string, 
  widgetCode: string, 
  x: number, 
  y: number, 
  w: number, 
  h: number,
  breakpoint: 'lg' | 'md' | 'sm' | 'xs'
) {
  const definition = widgetRegistry.get(widgetCode)
  const constraints = definition?.responsiveConstraints?.[breakpoint]
  
  return {
    i: widgetId,
    x, y, w, h,
    minW: constraints?.minW ?? 1,
    maxW: constraints?.maxW ?? 12,
    minH: constraints?.minH ?? 1,
    maxH: constraints?.maxH ?? 6
  }
}

export function createDynamicScreenWidget(code: string, id: string, title: string, config: Record<string, any>): DynamicScreenWidget {
  
  // Import the wrapper component dynamically to avoid circular dependencies
  const { DynamicScreenWidgetWrapper } = require('./DynamicScreenWidgetWrapper') as {
    DynamicScreenWidgetWrapper: React.ComponentType<any>
  }
  
  // First get the config
  const widgetConfig = createWidgetConfig(code, id, config);
  if (!widgetConfig) throw new Error(`Could not get config for widget with code '${code}' and config '${config}'`);
  const widgetDefinition = widgetRegistry.get(code);
  if (!widgetDefinition) throw new Error(`Could not get definition for widget with code '${code}'`);

  const widget: DynamicScreenWidget = {
    id: id,
    type: code,
    title: widgetConfig.title,
    component: createWrappedWidgetComponent(DynamicScreenWidgetWrapper, widgetDefinition.component, id, title),
    config: config,
    responsiveConstraints: widgetDefinition.responsiveConstraints    
  }
  return widget
}

// Widget categories
export const WIDGET_CATEGORIES = {
  ANALYTICS: 'analytics',
  ACTIONS: 'actions',
  DATA: 'data',
  CHARTS: 'charts',
  TABLES: 'tables',
  COMMUNICATION: 'communication',
  MONITORING: 'monitoring',
  OTHER: 'other'
} as const

export type WidgetCategory = typeof WIDGET_CATEGORIES[keyof typeof WIDGET_CATEGORIES]

// Common widget schemas
export const CommonWidgetSchemas = {
  timeRange: z.enum(['1h', '24h', '7d', '30d', '90d']).default('24h'),
  refreshInterval: z.number().min(10000).max(3600000).default(300000),
  title: z.string().min(1).max(100),
  showTitle: z.boolean().default(true),
  theme: z.enum(['light', 'dark', 'auto']).default('auto'),
  chartType: z.enum(['line', 'bar', 'area', 'pie', 'donut', 'scatter']).default('line'),
  limit: z.number().min(1).max(100).default(10)
}

// Default widget permissions
export const DEFAULT_WIDGET_PERMISSIONS = [
  'dashboard.view',
  'dashboard.widget.view'
]