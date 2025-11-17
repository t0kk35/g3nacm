import { Tool, tool } from 'ai';
import { AIToolDefinition, ToolRegistry } from './types';

class AIToolRegistry implements ToolRegistry {
  private tools: Map<string, AIToolDefinition> = new Map();

  registerTool(toolDef: AIToolDefinition): void {
    this.tools.set(toolDef.name, toolDef);
  }

  getTool(name: string): AIToolDefinition | undefined {
    return this.tools.get(name);
  }

  getTools(names: string[]): Record<string, Tool> {
    const result: Record<string, Tool> = {};
    
    for (const name of names) {
      const toolDef = this.tools.get(name);
      if (toolDef) {
        result[name] = tool({
          description: toolDef.description,
          inputSchema: toolDef.inputSchema,
          execute: async (params) => {
            const result = await toolDef.handler(params);
            return result;
          },
        });
      }
    }
    
    return result;
  }

  getAllTools(): Record<string, AIToolDefinition> {
    return Object.fromEntries(this.tools.entries());
  }
}

// Global registry instance
export const toolRegistry = new AIToolRegistry();