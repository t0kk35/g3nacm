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

export type ModelBaseConfig = {
  provider: 'openai' | 'anthropic' | string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  providerOptions?: Record<string, unknown>;
}

export type OpenAIProviderOptions = {
  reasoningEffort?: 'high' | 'medium' | 'low';
  reasoningSummary?: 'auto' | 'detailed';
}

export type AnthropicProviderOptions = {
  headers?: Record<string, string>;
  thinking?: {
    type: 'enabled' | 'disabled';
    budgetTokens?: number;
  };
}

export type OpenAIModelConfig = ModelBaseConfig & OpenAIProviderOptions;
export type AnthropicModelConfig = ModelBaseConfig & AnthropicProviderOptions;

// Union type for all model configurations
export type ModelConfig = OpenAIModelConfig | AnthropicModelConfig;

export const modelProviders = [
    {
    id: 0,
    name: 'Anthropic',
    description: 'Anthropic (Claude) provider'
  },
  {
    id: 1,
    name: 'OpenAI',
    description: 'Open AI provider'
  },
]

export const modelProviderModels = [
  {
    providerId: 0,
    name: 'claude-sonnet-4-5-20250929'
  },
  {
    providerId: 1,
    name: 'gpt-5'
  },
  {
    providerId: 1,
    name: 'gpt-4o'
  }
]

// Agent types
export type AgentType = 'streaming' | 'text' | 'object';

// Base agent configuration
export interface BaseAgentConfig {
  name: string;
  description: string;
  systemPrompt?: string;
  modelConfigCode: string;
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