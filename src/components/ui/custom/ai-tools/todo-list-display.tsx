import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Clock, AlertCircle, Target, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TodoItem, TodoStats } from '@/lib/ai-tools/tools/todo-list';

interface TodoListDisplayProps {
  name: string;
  todos: TodoItem[];
  stats: TodoStats;
  lastAction?: string;
  error?: string;
}

export function TodoListDisplay({ name, todos, stats, lastAction, error }: TodoListDisplayProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'pending':
        return <Circle className="h-4 w-4 text-gray-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-400 dark:border-green-200 bg-muted';
      case 'in_progress':
        return 'border-blue-400 dark:border-blue-200 bg-muted';
      case 'pending':
        return 'border-foreground bg-muted';
      default:
        return 'border-foreground bg-muted';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  if (error) {
    return (
      <Card className="w-full max-w-2xl border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            Todo List Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          AI Agent Plan & Progress
        </CardTitle>
        <div className="space-y-2">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Name: {name} </span>
            {lastAction && (
              <Badge variant="outline" className="text-xs">
                Last action: {lastAction}
              </Badge>
            )}
          </div>
          
          {stats.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress: {stats.completed} of {stats.total} tasks completed</span>
                <span className="font-medium">{stats.progressPercentage}%</span>
              </div>
              <Progress value={stats.progressPercentage} className="h-2" />
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {stats.inProgress} in progress
                </span>
                <span className="flex items-center gap-1">
                  <Circle className="h-3 w-3" />
                  {stats.pending} pending
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {stats.completed} completed
                </span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {todos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No todos yet. The AI agent will create tasks as it plans its work.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todos.map((todo, index) => (
              <div
                key={todo.id}
                className={cn(
                  "flex gap-3 p-2 rounded-lg border transition-all duration-200",
                  getStatusColor(todo.status),
                  todo.status === 'completed' && "opacity-75"
                )}
              >
                <div className="shrink-0 mt-0.5">
                  {getStatusIcon(todo.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className={cn(
                      "font-medium text-sm leading-tight",
                      todo.status === 'completed' && "line-through text-muted-foreground"
                    )}>
                      {todo.title}
                    </h4>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge className="text-xs">
                        {getStatusText(todo.status)}
                      </Badge>
                    </div>
                  </div>
                  
                  {todo.description && (
                    <p className={cn(
                      "text-sm text-muted-foreground mb-2",
                      todo.status === 'completed' && "line-through"
                    )}>
                      {todo.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}