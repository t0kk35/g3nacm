import { z } from 'zod';
import { AIToolDefinition, ToolResult } from '../types';

export type TodoItem = {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  completedAt?: string;
}

export type TodoStats = {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  progressPercentage: number;
}

const schema = z.object({
  name: z.string().describe('A Name for the todo list'),
  todos: z.array(z.object({
    id: z.string().describe('Unique ID for the todo item'),
    title: z.string().describe('Title of the todo item'),
    description: z.string().optional().describe('Detailed description of the todo item'),
    status: z.enum(['pending', 'in_progress', 'completed']).describe('Current status of the todo item'),
    createdAt: z.string().describe('ISO timestamp when the todo was created'),
    completedAt: z.string().optional().describe('ISO timestamp when the todo was completed')
  })).describe('Array of todo items to display')
});

export const todoListTool: AIToolDefinition = {
  name: 'todo-list',
  description: 'Displays a todo list for agent planning and progress tracking. Takes a list of todos and displays them with calculated progress statistics to communicate plans and progress to users.',
  inputSchema: schema,
  handler: async (params): Promise<ToolResult> => {
    const { name, todos }: { name: string; todos: TodoItem[] } = params;
    
    try {
      // Calculate progress statistics
      const totalTodos = todos.length;
      const completedTodos = todos.filter(t => t.status === 'completed').length;
      const inProgressTodos = todos.filter(t => t.status === 'in_progress').length;
      const pendingTodos = todos.filter(t => t.status === 'pending').length;
      const progressPercentage = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;
      
      // Sort todos by status (in_progress first, then pending, then completed) and priority
      const sortedTodos = [...todos].sort((a, b) => {
        const statusOrder = { 'in_progress': 0, 'pending': 1, 'completed': 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });
      
      const stats: TodoStats = {
        total: totalTodos,
        completed: completedTodos,
        inProgress: inProgressTodos,
        pending: pendingTodos,
        progressPercentage
      };
      
      return {
        id: crypto.randomUUID(),
        toolName: 'manage-todo-list',
        data: {
          name: name,
          todos: sortedTodos,
          stats
        },
        ui: {
          component: 'TodoListDisplay',
          props: {
            name: name,
            todos: sortedTodos,
            stats
          }
        }
      };
    } catch (error) {
      const errorStats: TodoStats = {
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        progressPercentage: 0        
      };
      return {
        id: crypto.randomUUID(),
        toolName: 'manage-todo-list',
        data: {
          name: name,
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
          todos: [],
          stats: errorStats
        },
        ui: {
          component: 'TodoListDisplay',
          props: {
            name: name,
            todos: [],
            stats: errorStats,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          }
        }
      };
    }
  },
  uiComponent: 'TodoListDisplay'
};