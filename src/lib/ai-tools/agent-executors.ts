import { streamText, generateText, generateObject } from 'ai';
import { AgentConfig, ToolResult } from './types';
import { getCachedAgentModelConfig } from '../cache/agent-model-config-cache';
import { toolRegistry } from './registry';
import { substituteTemplate } from './template-utils';

export interface StreamingAgentResult {
  type: 'streaming';
  stream: any;
  toolResults: ToolResult[];
}

export interface TextAgentResult {
  type: 'text';
  text: string;
  toolResults: ToolResult[];
}

export interface ObjectAgentResult {
  type: 'object';
  object: any;
  toolResults: ToolResult[];
}

export type AgentResult = StreamingAgentResult | TextAgentResult | ObjectAgentResult;

export interface AgentExecutionOptions {
  message: string;
  context?: Record<string, any>;
}

export async function executeAgent(
  config: AgentConfig,
  options: AgentExecutionOptions
): Promise<AgentResult> {
  const { message, context = {}} = options;
  
  // Substitute template variables in system prompt
  const systemPrompt = config.systemPrompt 
    ? substituteTemplate(config.systemPrompt, context)
    : undefined;

  // Create model instance
  const modelInstance = getCachedAgentModelConfig(config.modelConfigCode)
  
  // Execute based on agent type
  switch (config.agentType) {
    case 'streaming':
      // Get tools for streaming agent
      const streamingTools = toolRegistry.getTools(config.tools);
      return executeStreamingAgent(modelInstance, systemPrompt, message, streamingTools, config.maxSteps || 5);
    case 'text':
      // Get tools for text agent
      const textTools = toolRegistry.getTools(config.tools);
      return executeTextAgent(modelInstance, systemPrompt, message, textTools, config.maxSteps || 5);
    case 'object':
      // Object agents don't use tools
      return executeObjectAgent(modelInstance, systemPrompt, message, config.outputSchema);
    default:
      throw new Error(`Unsupported agent type: ${(config as any).agentType}`);
  }
}

async function executeStreamingAgent(
  modelInstance: any,
  systemPrompt: string | undefined,
  message: string,
  tools: Record<string, any>,
  maxSteps: number
): Promise<StreamingAgentResult> {
  const result = await streamText({
    model: modelInstance.model,
    system: systemPrompt,
    messages: [{ role: 'user', content: message }],
    tools,
    maxSteps,
    ...modelInstance.streamTextOptions
  });

  return {
    type: 'streaming',
    stream: result,
    toolResults: [] // Tool results are handled by the streaming framework
  };
}

async function executeTextAgent(
  modelInstance: any,
  systemPrompt: string | undefined,
  message: string,
  tools: Record<string, any>,
  maxSteps: number
): Promise<TextAgentResult> {
  const result = await generateText({
    model: modelInstance.model,
    system: systemPrompt,
    messages: [{ role: 'user', content: message }],
    tools,
    maxSteps,
    ...modelInstance.generateTextOptions
  });

  // Extract tool results from the generation
  const toolResults: ToolResult[] = [];
  if (result.toolCalls) {
    for (const toolCall of result.toolCalls) {
      toolResults.push({
        id: toolCall.toolCallId,
        toolName: toolCall.toolName,
        data: toolCall.input, // Tool call arguments, not results
        // No UI component for text agents
      });
    }
  }

  return {
    type: 'text',
    text: result.text,
    toolResults
  };
}

async function executeObjectAgent(
  modelInstance: any,
  systemPrompt: string | undefined,
  message: string,
  outputSchema: any
): Promise<ObjectAgentResult> {
  const result = await generateObject({
    model: modelInstance.model,
    system: systemPrompt,
    messages: [{ role: 'user', content: message }],
    schema: outputSchema,
    ...modelInstance.generateObjectOptions
  });

  // Object agents don't use tools - they focus on structured output
  const toolResults: ToolResult[] = [];

  return {
    type: 'object',
    object: result.object,
    toolResults
  };
}