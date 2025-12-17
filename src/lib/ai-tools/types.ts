import { z } from 'zod';
import { Tool } from 'ai';
import { TemplateContext } from './template-utils';

// Base tool result interface
export interface ToolResult {
  id: string;
  toolName: string;
  data: Record<string, any>;  // Primary data for AI reasoning
  ui?: {
    component: string;
    props?: Record<string, any>;        // Optional: explicit props (legacy/backward compatible)
    propsSource?: string;               // Optional: path to data property (e.g., "data" or "data.todos")
    propsTransform?: (data: any) => any; // Optional: transform function for complex cases
  };
}

// Tool definition interface
export interface AIToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  handler: (params: any) => Promise<ToolResult>;
  uiComponent?: string;
}

// Provider-specific configuration interfaces
export interface OpenAIModelConfig {
  provider: 'openai';
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  seed?: number;
  providerOptions?: {
    openai?: {
      reasoningEffort?: 'high' | 'medium' | 'low',
      reasoningSummary?: 'auto' | 'detailed'
    }
  }
}
export interface AnthropicModelConfig {
  provider: 'anthropic';
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  headers?: Record<string, string>;
  providerOptions?: {
    anthropic?: {
      thinking?: {
        type: 'enabled' | 'disabled';
        budgetTokens?: number;
      };
      [key: string]: any;
    };
  };
}

// Union type for all model configurations
export type ModelConfig = OpenAIModelConfig | AnthropicModelConfig;

// Agent types
export type AgentType = 'streaming' | 'text' | 'object';

// Base agent configuration
export interface BaseAgentConfig {
  name: string;
  description: string;
  systemPrompt?: string;
  modelConfig: ModelConfig;
}

// Streaming and text agents support tools
export interface StreamingAgentConfig extends BaseAgentConfig {
  agentType: 'streaming';
  tools: string[];
  maxSteps?: number;
}

export interface TextAgentConfig extends BaseAgentConfig {
  agentType: 'text';
  tools: string[];
  maxSteps?: number;
}

// Object agents don't support tools - they focus on structured output
export interface ObjectAgentConfig extends BaseAgentConfig {
  agentType: 'object';
  outputSchema: z.ZodSchema;
}

// Union type for all agent configurations
export type AgentConfig = StreamingAgentConfig | TextAgentConfig | ObjectAgentConfig;

// Enhanced agent configuration with template context support
export type AgentConfigWithContext = AgentConfig & {
  context?: TemplateContext;
}

// Tool registry interface
export interface ToolRegistry {
  registerTool(tool: AIToolDefinition): void;
  getTool(name: string): AIToolDefinition | undefined;
  getTools(names: string[]): Record<string, Tool>;
  getAllTools(): Record<string, AIToolDefinition>;
}