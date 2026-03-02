# Component-Based Dynamic Section System

## Overview

A powerful, configurable UI system that enables:
1. **Entity Detail Sections** - Rich, component-based sections for displaying entity data (alerts, cases, subjects)
2. **AI-Generated UIs** - AI agents can dynamically create complex visualizations with charts, tables, and layouts

## Key Features

✅ **Hybrid Data Model** - Supports both inline data (for AI) and referenced data (for entity sections)
✅ **8 Core Components** - Card, Tabs, Grid, DataTable, Chart, Badge, Text, Markdown
✅ **Type-Safe** - Zod schemas validate all component configurations
✅ **Extensible** - Easy to add new components via registry pattern
✅ **API Orchestration** - Reuses existing API orchestrator for data fetching
✅ **Error Boundaries** - Graceful error handling per component
✅ **Permission-Based** - Integrated with existing permission system

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Component Registry                   │
│  (8 components: card, tabs, grid, table, chart, etc.)   │
└────────────────┬────────────────────────────────────────┘
                 │
      ┌──────────┴──────────┐
      │                     │
┌─────▼──────┐    ┌─────────▼────────┐
│   Entity   │    │   AI Agents      │
│  Sections  │    │  (via Tools)     │
└─────┬──────┘    └────────┬─────────┘
      │                    │
      │ (Reference Mode)   │ (Inline Mode)
      │                    │
┌─────▼────────────────────▼─────────┐
│        Section Renderer             │
│  (API Orchestrator + Data Resolver) │
└─────┬───────────────────────────────┘
      │
      ▼
 React Component Tree
```

---

## File Structure

### Core System
```
src/lib/component-section/
├── types.ts                     # Type definitions
├── component-registry.ts        # Component registration system
├── data-resolver.ts             # Data resolution (hybrid model)
├── renderer.ts                  # Server-side rendering engine
├── section-registry.ts          # Section config management

```

### UI Components
```
src/components/ui/custom/component-section/
├── ComponentSectionRenderer.tsx  # Client-side renderer
├── ComponentErrorBoundary.tsx    # Error boundaries
├── ComponentError.tsx            # Error display
└── DynamicSectionDisplay.tsx     # Display wrapper
└── components/                  # Component library
    ├── index.ts                 # Component registration
    ├── CardComponent.tsx
    ├── TabsComponent.tsx
    ├── GridComponent.tsx
    ├── DataTableComponent.tsx
    ├── FieldComponent.tsx
    ├── ChartComponent.tsx
    ├── BadgeComponent.tsx
    ├── TextComponent.tsx
    └── MarkdownComponent.tsx
```

### AI Tools
```
src/lib/ai-tools/tools/
├── get-component-registry.ts     # Component discovery tool
├── render-ui-section.ts          # Section generation tool
└── schemas/
    └── component-section-schemas.ts  # Zod schemas for AI
```

### API & Sections
```
src/app/api/data/entity/component_section/
└── route.ts                      # API endpoint for entity sections

conf/sections/
├── registry.json                 # Section registry
└── [entity_code]/
    └── config.json              # Section configuration
```

---

## Usage

### 1. Entity Detail Sections (Reference Mode)

**Step 1: Create Section Config**

Create `/conf/sections/alert/aml.rule.alert/config.json`:

```json
{
  "code": "aml.rule.alert",
  "name": "AML Alert Detail",
  "version": "1.0.0",
  "permissions": ["data.alert"],
  "apiCalls": [
    {
      "name": "alert_detail",
      "endpoint": "/api/data/alert/detail",
      "params": {"alert_id": "{{entity_id}}"},
      "required": true,
      "variable_name": "alert"
    }
  ],
  "rootComponent": {
    "id": "root",
    "type": "card",
    "dataMode": "reference",
    "props": {
      "title": "{{alert.alert_identifier}}",
      "description": "Alert Type: {{alert.alert_type}}"
    },
    "children": [
      {
        "id": "info-grid",
        "type": "grid",
        "props": {"columns": 2, "gap": 4},
        "children": [
          {
            "id": "status-badge",
            "type": "badge",
            "dataMode": "reference",
            "props": {
              "text": "{{alert.status}}",
              "variant": "default"
            }
          },
          {
            "id": "detections-table",
            "type": "data-table",
            "dataMode": "reference",
            "props": {
              "columns": [
                {"id": "name", "label": "Detection", "accessor": "name"},
                {"id": "score", "label": "Score", "accessor": "score"}
              ],
              "data": "{{alert.detections}}",
              "pagination": true
            }
          }
        ]
      }
    ]
  }
}
```

**Step 2: Register Section**

Add to `/conf/sections/registry.json`:

```json
{
  "sections": [
    {
      "code": "aml.rule.alert",
      "path": "alert/aml.rule.alert",
      "enabled": true,
      "entityCode": "aml.rule.alert",
      "last_updated": "2026-02-15T00:00:00Z"
    }
  ]
}
```

**Step 3: Fetch from API**

```typescript
const response = await fetch(
  `/api/data/entity/component_section?entity_id=${uuid}&section_code=aml.rule.alert`
);
const data = await response.json();

// data contains:
// - section_config: SectionConfig
// - context: Resolved data from API calls
// - errors: Any errors that occurred
```

**Step 4: Render on Client**

```tsx
import { ComponentSectionRenderer } from '@/components/ui/custom/component-section/ComponentSectionRenderer';

export function EntityDetailPage() {
  const [sectionData, setSectionData] = useState(null);

  useEffect(() => {
    // Fetch section data
    fetch(`/api/data/entity/component_section?entity_id=${id}&section_code=${code}`)
      .then(res => res.json())
      .then(setSectionData);
  }, [id, code]);

  if (!sectionData) return <div>Loading...</div>;

  return (
    <ComponentSectionRenderer
      sectionConfig={sectionData.section_config}
      context={sectionData.context}
      errors={sectionData.errors}
    />
  );
}
```

---

### 2. AI-Generated Sections (Inline Mode)

**Workflow:**

1. Agent calls `get-component-registry` to discover components
2. Agent fetches data via other tools (`get-alert`, `get-subject`, etc.)
3. Agent calls `render-ui-section` with inline data

**Example:**

```typescript
// Step 1: Agent discovers components
const registry = await agent.use_tool('get-component-registry', {
  category: 'all'
});

// Step 2: Agent fetches data
const alertData = await agent.use_tool('get-alert', { alert_id: 'uuid' });

// Step 3: Agent generates section with inline data
const section = await agent.use_tool('render-ui-section', {
  screenName: 'Transaction Risk Analysis',
  screenConfig: {
    rootComponent: {
      id: 'root-card',
      type: 'card',
      dataMode: 'inline',
      props: {
        title: alertData.alert_identifier,  // Actual data, not {{variable}}
        description: 'High-value transaction alert'
      },
      children: [
        {
          id: 'tabs-1',
          type: 'tabs',
          dataMode: 'inline',
          props: {
            tabs: [
              { id: 'summary', label: 'Summary' },
              { id: 'details', label: 'Details' }
            ]
          },
          children: [
            {
              id: 'chart-1',
              type: 'chart',
              dataMode: 'inline',
              props: {
                title: 'Risk Factors',
                chartType: 'bar',
                data: [
                  { factor: 'Amount', score: 90 },
                  { factor: 'Country', score: 85 }
                ],
                chartConfig: {
                  score: { label: 'Risk Score', color: 'hsl(var(--chart-1))' }
                },
                xAxisKey: 'factor'
              }
            },
            {
              id: 'table-1',
              type: 'data-table',
              dataMode: 'inline',
              props: {
                columns: [
                  { id: 'date', label: 'Date', accessor: 'date' },
                  { id: 'amount', label: 'Amount', accessor: 'amount' }
                ],
                data: alertData.transactions
              }
            }
          ]
        }
      ]
    }
  }
});
```

---

## Available Components

### 1. Card
Container for grouping related content.

**Props:**
- `title` (string, optional): Card title
- `description` (string, optional): Card description
- `showHeader` (boolean, default: true): Show header
- `showFooter` (boolean, default: false): Show footer
- `variant` ('default' | 'outlined' | 'elevated', default: 'default')

**Allows Children:** Yes

---

### 2. Tabs
Tabbed interface for organizing content.

**Props:**
- `tabs` (array, required): Array of `{id, label, icon?, disabled?}`
- `defaultTab` (string, optional): Default active tab
- `orientation` ('horizontal' | 'vertical', default: 'horizontal')

**Allows Children:** Yes (maps to tabs by index)

---

### 3. Grid
Responsive grid layout.

**Props:**
- `columns` (number, 1-12, default: 2): Number of columns
- `gap` (number, 0-12, default: 4): Gap size

**Allows Children:** Yes

---

### 4. DataTable
Table with sorting and pagination.

**Props:**
- `columns` (array, required): `[{id, label, accessor, width?, sortable?, align?}]`
- `data` (array, required): Array of data rows
- `pagination` (boolean, default: true)
- `pageSize` (number, default: 10)
- `filterColumn` (string, optional): Column to filter

**Allows Children:** No

---

### 5. Chart
Data visualization charts.

**Props:**
- `title` (string, optional)
- `chartType` ('bar' | 'line' | 'area' | 'pie' | 'donut' | 'scatter', required)
- `data` (array, required): Array of data points
- `chartConfig` (object, required): `{[key]: {label, color?}}`
- `xAxisKey` (string, required for bar/line/area)
- `height` (number, default: 300)

**Allows Children:** No

---

### 6. Badge
Status indicators.

**Props:**
- `text` (string, required)
- `variant` ('default' | 'secondary' | 'destructive' | 'outline', default: 'default')

**Allows Children:** No

---

### 7. Text
Formatted text content.

**Props:**
- `content` (string, required)
- `variant` ('h1' | 'h2' | 'h3' | 'h4' | 'paragraph' | 'code' | 'muted', default: 'paragraph')

**Allows Children:** No

---

### 8. Markdown
Rendered markdown content.

**Props:**
- `content` (string, required): Markdown text

**Allows Children:** No

---

## Data Modes

### Reference Mode (Entity Sections)
- Data fetched via API orchestrator
- Props use `{{variable}}` syntax
- Variables resolved from API responses
- Example: `"title": "{{alert.alert_identifier}}"`

### Inline Mode (AI Sections)
- Data embedded directly in props
- No variable substitution needed
- Example: `"title": "ALERT-2024-001"`

### Hybrid Mode (Advanced)
- Mix of both approaches
- Some components use reference, others inline
- Use sparingly to avoid complexity

---

## Adding New Components

**Step 1: Create Component File**

```tsx
// src/components/ui/custom/component-section/components/MyComponent.tsx
import React from 'react';
import { z } from 'zod';

export const MyComponentPropsSchema = z.object({
  myProp: z.string().describe('Description for AI'),
});

export type MyComponentProps = z.infer<typeof MyComponentPropsSchema>;

export function MyComponent({ myProp, children }: MyComponentProps & { children?: React.ReactNode }) {
  return <div>{myProp}{children}</div>;
}
```

**Step 2: Register Component**

Add to `src/components/ui/custom/component-section/index.ts`:

```tsx
import { MyComponent, MyComponentPropsSchema } from './components/MyComponent';

componentRegistry.register({
  code: 'my-component',
  name: 'My Component',
  description: 'What this component does',
  component: MyComponent,
  propsSchema: MyComponentPropsSchema,
  defaultProps: {},
  allowsChildren: true,
  category: ComponentCategory.CONTENT,
  examples: [
    {
      title: 'Basic Example',
      description: 'How to use it',
      config: {
        id: 'example-1',
        type: 'my-component',
        props: { myProp: 'value' },
      },
    },
  ],
});
```

---

## Error Handling

The system has multiple layers of error handling:

1. **Validation Errors** - Zod schema validation catches invalid props
2. **Component Errors** - Error boundaries catch render errors
3. **API Errors** - API orchestration errors are tracked and displayed
4. **Missing Components** - Unknown component types show error UI

All errors are:
- Logged to console
- Displayed to user with context
- Tracked in response metadata
- Recoverable where possible

---

## Performance Considerations

✅ **Component Registry** - Initialized once, cached in memory
✅ **API Orchestration** - Parallel execution where possible
✅ **Client-Side Rendering** - React optimizations apply
✅ **Data Resolution** - Efficient traversal algorithms

---

## Security

✅ **Permission Checks** - Both section-level and component-level
✅ **UUID Validation** - Entity IDs validated before use
✅ **Schema Validation** - All inputs validated with Zod
✅ **Error Sanitization** - Stack traces only in development

---

## Future Enhancements

### Phase 6: Database Storage
- Migrate section configs to database
- UI for editing configurations
- Version history and rollback

### Phase 7: Advanced Features
- Conditional rendering (data-driven)
- Component actions (buttons, workflows)
- Real-time data updates

### Phase 8: Performance
- Server Components (RSC)
- Caching layer
- Lazy loading

---

## Troubleshooting

### Components Not Registered
**Problem:** "Component not found" errors
**Solution:** Ensure `registerComponents()` is called. The API endpoint does this automatically, but client code may need to call it explicitly.

### Variable Not Resolved
**Problem:** Props show `{{variable}}` instead of data
**Solution:** Check that API call with matching `variable_name` exists, or switch to inline mode.

### Schema Validation Failed
**Problem:** "Invalid props" warnings
**Solution:** Check component props against schema using `get-component-registry` tool.

### Section Not Found
**Problem:** 404 error for section code
**Solution:** Verify section is registered in `/conf/sections/registry.json` with `enabled: true`.

---

## Examples Repository

Full examples available in:
- `/conf/sections/` - Entity section configs
- This README - Usage patterns and best practices

---

## Support

For questions or issues:
1. Check component schemas via `get-component-registry`
2. Review error messages (they're detailed!)
3. Inspect network tab for API responses
4. Check console for validation errors

---

Built with ❤️ for g3nACM by Claude Sonnet 4.5
