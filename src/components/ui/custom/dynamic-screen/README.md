# Dynamic Screen Framework

A responsive dashboard system with drag-and-drop widget layouts, user customization, and breakpoint-specific constraints.

## Overview

The Dynamic Screen Framework allows users to create customizable dashboards with widgets that can be:
- Dragged and dropped into different positions
- Resized within defined constraints
- Arranged differently on desktop, tablet, and mobile devices
- Persisted to the database per user

## Architecture

### Core Components

- **`DynamicScreenContainer`** - Main container that orchestrates widgets and layout
- **`DynamicScreenGrid`** - Responsive grid using `react-grid-layout`
- **`DynamicScreenWidgetWrapper`** - Error boundary and loading wrapper for widgets
- **`widget-registry.ts`** - Central registry for all available widgets

### Database Schema

- **`dynamic_screen_widget_registry`** - Defines available widget types and constraints
- **`dynamic_screen_user_config`** - Stores user dashboard layouts (responsive)
- **`dynamic_screen_user_widget_config`** - Individual widget configurations

## Adding a New Widget

### 1. Create Widget Component

Create your widget component in `widgets/`:

```tsx
// widgets/MyNewWidget.tsx
export interface MyNewWidgetProps {
  title?: string
  showData?: boolean
  limit?: number
}

export function MyNewWidget({ title = "My Widget", showData = true, limit = 10 }: MyNewWidgetProps) {
  return (
    <div className="p-4">
      <h3 className="font-semibold mb-2">{title}</h3>
      {showData && (
        <div>Widget content here...</div>
      )}
    </div>
  )
}
```

### 2. Create Skeleton Component

Create a loading skeleton in `widget-skeletons/`:

```tsx
// widget-skeletons/MyNewWidgetSkeleton.tsx
export function MyNewWidgetSkeleton() {
  return (
    <div className="p-4">
      <div className="h-6 bg-accent/20 rounded animate-pulse mb-2" />
      <div className="space-y-2">
        <div className="h-4 bg-accent/10 rounded animate-pulse" />
        <div className="h-4 bg-accent/10 rounded animate-pulse w-3/4" />
      </div>
    </div>
  )
}
```

### 3. Define Configuration Schema

Use Zod to define the widget's configuration schema:

```tsx
import { z } from 'zod'

const MyNewWidgetSchema = z.object({
  title: z.string().min(1).max(100).default("My Widget"),
  showData: z.boolean().default(true),
  limit: z.number().min(1).max(100).default(10)
})
```

### 4. Register the Widget

In `widgets/index.ts`, register your widget:

```tsx
import { MyNewWidget } from './MyNewWidget'
import { MyNewWidgetSkeleton } from '../widget-skeletons/MyNewWidgetSkeleton'

// Register the widget
widgetRegistry.register({
  code: 'my-new-widget',
  name: 'My New Widget',
  description: 'Description of what this widget does',
  component: MyNewWidget,
  skeleton: MyNewWidgetSkeleton,
  defaultConfig: {
    title: "My Widget",
    showData: true,
    limit: 10
  },
  configSchema: MyNewWidgetSchema,
  responsiveConstraints: {
    lg: { minW: 4, maxW: 8, minH: 3, maxH: 6 },
    md: { minW: 3, maxW: 6, minH: 3, maxH: 5 },
    sm: { minW: 2, maxW: 4, minH: 2, maxH: 4 },
    xs: { minW: 2, maxW: 4, minH: 2, maxH: 3 }
  },
  category: WIDGET_CATEGORIES.DATA,
  permissions: ['dashboard.view', 'my-widget.view'],
  tags: ['data', 'analytics']
})
```

### 5. Export Components

Update the exports in `widgets/index.ts`:

```tsx
export { MyNewWidget } from './MyNewWidget'
export { MyNewWidgetSkeleton } from '../widget-skeletons/MyNewWidgetSkeleton'
```

### 6. Add to Database

Insert the widget into the database registry:

```sql
INSERT INTO dynamic_screen_widget_registry (
  code, name, description, component_name, config_schema, responsive_constraints, permissions
) VALUES (
  'my-new-widget',
  'My New Widget', 
  'Description of what this widget does',
  'MyNewWidget',
  '{"type": "object", "properties": {"title": {"type": "string", "default": "My Widget"}, "showData": {"type": "boolean", "default": true}, "limit": {"type": "number", "default": 10}}}',
  '{"lg": {"minW": 4, "maxW": 8, "minH": 3, "maxH": 6}, "md": {"minW": 3, "maxW": 6, "minH": 3, "maxH": 5}, "sm": {"minW": 2, "maxW": 4, "minH": 2, "maxH": 4}, "xs": {"minW": 2, "maxW": 4, "minH": 2, "maxH": 3}}',
  '{"dashboard.view", "my-widget.view"}'
);
```

## Widget Guidelines

### Responsive Design
- Design widgets to work at different sizes
- Test at minimum dimensions for each breakpoint
- Consider mobile-first approach for content priority

### Configuration
- Keep configuration options simple and intuitive
- Use sensible defaults
- Validate all configuration with Zod schemas

### Performance
- Use skeleton components for loading states
- Implement proper error boundaries
- Avoid heavy computations in render

### Constraints
- **Desktop (lg)**: Typically 3-12 columns wide, 2-8 rows tall
- **Tablet (md)**: Typically 2-6 columns wide, 2-6 rows tall  
- **Mobile (sm/xs)**: Typically 2-4 columns wide, 2-4 rows tall

## API Usage

### Load Dashboard
```tsx
const response = await fetch('/api/data/dynamic_screen?screen_name=dashboard')
const config: DynamicScreenConfig = await response.json()
```

### Save Layout
```tsx
const update: DynamicScreenLayoutUpdate = {
  name: 'dashboard',
  layout: {
    lg: [...],
    md: [...], 
    sm: [...],
    xs: [...]
  }
}
await fetch('/api/action/dynamic_screen/layout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(update)
})
```

## Troubleshooting

### Widget Not Appearing
1. Check widget is registered in `widgetRegistry`
2. Verify database entry exists
3. Check component exports
4. Ensure user has required permissions

### Layout Issues
1. Verify responsive constraints are reasonable
2. Check breakpoint definitions
3. Ensure widget IDs are unique
4. Test on different screen sizes

### Performance Problems  
1. Add skeleton loading components
2. Optimize heavy widgets
3. Check for memory leaks
4. Consider virtualization for many widgets