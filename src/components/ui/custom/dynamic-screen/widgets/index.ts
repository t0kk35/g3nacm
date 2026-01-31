import { z } from 'zod'
import { widgetRegistry, WIDGET_CATEGORIES, CommonWidgetSchemas } from '../widget-registry'

// Widget Components
import { AlertSummaryWidget } from './AlertSummaryWidget'
import { AlertAssignmentWidget } from './AlertAssignmentWidget'
import { AlertHandledChartWidget } from './AlertHandledChartWidget'
import { NotificationWidget } from './NotificationWidget'
import { TeamAssignmentChartWidget } from './TeamAssignmentChartWigdet'
import { AgentUsageChartWidget } from './AgentUsageChartWidget'

widgetRegistry.register({
  code: 'alert-assignment',
  name: 'My Alerts',
  description: 'Displays statistics on the alerts assigned to a user directly and via team membership',
  component: AlertAssignmentWidget,
  defaultConfig: {
    title: 'My Alerts',
    refreshInterval: 60000
  },
  configSchema: z.object({
    title: CommonWidgetSchemas.title.default('My Alerts'),
    refreshInterval: CommonWidgetSchemas.refreshInterval.default(60000)
  }),
  responsiveConstraints: {
    lg: {minW: 3, minH: 5, maxW: 8, maxH: 7},
    md: {minW: 3, minH: 5, maxW: 7, maxH: 6}, 
    sm: {minW: 2, minH: 4, maxW: 4, maxH: 5},
    xs: {minW: 2, minH: 3, maxW: 4, maxH: 4}
  },
  permissions: ['data.alert'],
  category: WIDGET_CATEGORIES.ANALYTICS,
  tags: ['alerts', 'assignment', 'statistics']
})

widgetRegistry.register({
  code: 'alert-handled',
  name: 'Alerts Handled',
  description: 'Displays a chart showing the alerts handled by a user over time', 
  component: AlertHandledChartWidget,
  defaultConfig: {
    title: 'Alerts Handled',
    refreshInterval: 300000,
    timeRange: '7d'
  },
  configSchema: z.object({
    title: CommonWidgetSchemas.title.default('Alerts Handled'),
    refreshInterval: CommonWidgetSchemas.refreshInterval.default(300000),
    timeRange: z.enum(['24h', '7d', '30d', '90d', '6w', '12w', '6m']).default('7d'),
  }),
  responsiveConstraints: {
    lg: {minW: 6, minH: 4, maxW: 12, maxH: 8},
    md: {minW: 6, minH: 4, maxW: 8, maxH: 7}, 
    sm: {minW: 4, minH: 3, maxW: 6, maxH: 6},
    xs: {minW: 3, minH: 3, maxW: 4, maxH: 4}
  },
  permissions: ['data.alert'],
  category: WIDGET_CATEGORIES.ANALYTICS,
  tags: ['alerts', 'chart', 'statistics']
})

// Register Alert Summary Widget
widgetRegistry.register({
  code: 'alert-summary',
  name: 'Alert Summary',
  description: 'Displays summary statistics for user alerts',
  component: AlertSummaryWidget,
  defaultConfig: {
    timeRange: '24h',
    showCharts: true,
    title: 'Alert Summary',
    refreshInterval: 300000
  },
  configSchema: z.object({
    timeRange: z.enum(['1h', '24h', '7d', '30d', '90d']).default('24h'),
    showCharts: z.boolean().default(true),
    title: CommonWidgetSchemas.title.default('Alert Summary'),
    refreshInterval: CommonWidgetSchemas.refreshInterval.default(300000)
  }),
  responsiveConstraints: {
    lg: {minW: 3, minH: 5, maxW: 5, maxH: 7},
    md: {minW: 3, minH: 4, maxW: 5, maxH: 6},
    sm: {minW: 2, minH: 3, maxW: 4, maxH: 5},
    xs: {minW: 2, minH: 3, maxW: 4, maxH: 4}
  },
  permissions: ['data.alert'],
  category: WIDGET_CATEGORIES.ANALYTICS,
  tags: ['alerts', 'summary', 'statistics']
})

// Register Notification Widget
widgetRegistry.register({
  code: 'notifications',
  name: 'My Notifications',
  description: 'Displays user notifications with read/unread status and details on hover',
  component: NotificationWidget,
  defaultConfig: {
    timeRange: '7d',
    title: 'My Notifications',
    refreshInterval: 300000
  },
  configSchema: z.object({
    timeRange: z.enum(['1h', '24h', '7d', '30d', '90d']).default('7d'),
    title: CommonWidgetSchemas.title.default('My Notifications'),
    refreshInterval: CommonWidgetSchemas.refreshInterval.default(300000)
  }),
  responsiveConstraints: {
    lg: {minW: 4, minH: 4, maxW: 7, maxH: 10},
    md: {minW: 4, minH: 4, maxW: 6, maxH: 9},
    sm: {minW: 4, minH: 3, maxW: 4, maxH: 8},
    xs: {minW: 3, minH: 3, maxW: 4, maxH: 6}
  },
  permissions: ['data.notification'],
  category: WIDGET_CATEGORIES.COMMUNICATION,
  tags: ['notifications', 'messages', 'alerts']
})

widgetRegistry.register({
  code: 'team-assignment-chart',
  name: 'Team Assignment Chart',
  description: 'Displays a chart of the alerts assigned to each time and their priority', 
  component: TeamAssignmentChartWidget,
  defaultConfig: {
    title: 'Team Assignment Chart',
    refreshInterval: 300000
  },
  configSchema: z.object({
    title: CommonWidgetSchemas.title.default('Team Assignment Chart'),
    refreshInterval: CommonWidgetSchemas.refreshInterval.default(300000),
  }),
  responsiveConstraints: {
    lg: {minW: 4, minH: 4, maxW: 12, maxH: 8},
    md: {minW: 4, minH: 4, maxW: 8, maxH: 7}, 
    sm: {minW: 3, minH: 3, maxW: 6, maxH: 6},
    xs: {minW: 3, minH: 3, maxW: 4, maxH: 4}
  },
  permissions: ['data.alert'],
  category: WIDGET_CATEGORIES.ANALYTICS,
  tags: ['teams', 'chart', 'statistics']
})

widgetRegistry.register({
  code: 'agent-usage',
  name: 'Agent Usage',
  description: 'Displays a chart showing the Agent Token cost over time', 
  component: AgentUsageChartWidget,
  defaultConfig: {
    title: 'Agent Usage',
    refreshInterval: 300000,
    timeRange: '30d'
  },
  configSchema: z.object({
    title: CommonWidgetSchemas.title.default('Alerts Handled'),
    refreshInterval: CommonWidgetSchemas.refreshInterval.default(300000),
    timeRange: z.enum(['24h', '7d', '30d', '90d', '6w', '12w', '6m']).default('30d'),
  }),
  responsiveConstraints: {
    lg: {minW: 5, minH: 4, maxW: 12, maxH: 8},
    md: {minW: 5, minH: 4, maxW: 8, maxH: 7}, 
    sm: {minW: 4, minH: 3, maxW: 6, maxH: 6},
    xs: {minW: 3, minH: 3, maxW: 4, maxH: 4}
  },
  permissions: ['reporting.agent.usage.all'],
  category: WIDGET_CATEGORIES.ANALYTICS,
  tags: ['agent', 'chart', 'statistics']
})

// Export widget registry for use in other components
export { widgetRegistry } from '../widget-registry'

// Export all widgets for individual use
export {
  AlertSummaryWidget,
  AlertHandledChartWidget,
  AlertAssignmentWidget,
  NotificationWidget,
  TeamAssignmentChartWidget,
  AgentUsageChartWidget
}

// Utility function to get all available widgets
export function getAvailableWidgets() {
  return widgetRegistry.getAll()
}

// Utility function to get widgets by category
export function getWidgetsByCategory(category: string) {
  return widgetRegistry.getByCategory(category)
}

// Utility function to get widgets by permissions
export function getWidgetsByPermissions(permissions: string[]) {
  return widgetRegistry.getByPermission(permissions)
}