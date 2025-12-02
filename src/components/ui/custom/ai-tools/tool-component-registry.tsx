import React from 'react';
import { CustomerHistoryDisplay } from './customer-history-display';
import { TimelineDisplay } from './timeline-display';
import { TodoListDisplay } from './todo-list-display';
import { ChartDisplay } from './chart-display';
import { SubjectDisplay } from './subject-display';
import { WorkflowActionExecutor } from './workflow-action-executor';

// Registry mapping component names to actual components
const componentRegistry = {
  'CustomerHistoryDisplay': CustomerHistoryDisplay,
  'TimelineDisplay': TimelineDisplay,
  'TodoListDisplay': TodoListDisplay,
  'ChartDisplay': ChartDisplay,
  'SubjectDisplay': SubjectDisplay,
  'WorkflowActionExecutor': WorkflowActionExecutor,
};

interface ToolComponentProps {
  componentName: string;
  props: Record<string, any>;
}

export function ToolComponent({ componentName, props }: ToolComponentProps) {
  const Component = componentRegistry[componentName as keyof typeof componentRegistry];
  
  if (!Component) {
    return (
      <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
        <p className="text-sm text-destructive">
          Unknown component: {componentName}
        </p>
      </div>
    );
  }

  return <Component {...(props as any)} />;
}

export function registerToolComponent(name: string, component: React.ComponentType<any>) {
  (componentRegistry as any)[name] = component;
}