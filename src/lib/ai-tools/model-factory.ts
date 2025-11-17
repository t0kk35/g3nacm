import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { ModelConfig, OpenAIModelConfig, AnthropicModelConfig } from './types';

export interface ModelInstance {
  model: any;
  streamTextOptions: Record<string, any>;
  generateTextOptions: Record<string, any>;
  generateObjectOptions: Record<string, any>;
}

export function createModelInstance(config: ModelConfig): ModelInstance {
  switch (config.provider) {
    case 'openai':
      return createOpenAIInstance(config);
    case 'anthropic':
      return createAnthropicInstance(config);
    default:
      throw new Error(`Unsupported model provider: ${(config as any).provider}`);
  }
}

function createOpenAIInstance(config: OpenAIModelConfig): ModelInstance {
  const model = openai(config.model);
  
  const baseOptions: Record<string, any> = {};
  
  if (config.temperature !== undefined) {
    baseOptions.temperature = config.temperature;
  }
  if (config.maxTokens !== undefined) {
    baseOptions.maxTokens = config.maxTokens;
  }
  if (config.topP !== undefined) {
    baseOptions.topP = config.topP;
  }
  if (config.frequencyPenalty !== undefined) {
    baseOptions.frequencyPenalty = config.frequencyPenalty;
  }
  if (config.presencePenalty !== undefined) {
    baseOptions.presencePenalty = config.presencePenalty;
  }
  if (config.seed !== undefined) {
    baseOptions.seed = config.seed;
  }
  
  return {
    model,
    streamTextOptions: { ...baseOptions },
    generateTextOptions: { ...baseOptions },
    generateObjectOptions: { ...baseOptions }
  };
}

function createAnthropicInstance(config: AnthropicModelConfig): ModelInstance {
  const model = anthropic(config.model);
  
  const baseOptions: Record<string, any> = {};
  
  if (config.temperature !== undefined) {
    baseOptions.temperature = config.temperature;
  }
  if (config.maxTokens !== undefined) {
    baseOptions.maxTokens = config.maxTokens;
  }
  if (config.topP !== undefined) {
    baseOptions.topP = config.topP;
  }
  if (config.topK !== undefined) {
    baseOptions.topK = config.topK;
  }
  if (config.headers) {
    baseOptions.headers = config.headers;
  }
  if (config.providerOptions) {
    baseOptions.providerOptions = config.providerOptions;
  }
  
  return {
    model,
    streamTextOptions: { ...baseOptions },
    generateTextOptions: { ...baseOptions },
    generateObjectOptions: { ...baseOptions }
  };
}