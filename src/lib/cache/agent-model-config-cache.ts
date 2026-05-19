import * as db from "@/db"
import { queryAgentModelConfig, queryAgentModelConfigPermission } from "../data/queries/agent/model_config";
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { agentModelConfigCache } from "./cache";
import { removeNullsAndEmptyObjects } from "../json";
import { hasPermissions } from '@/lib/permissions/core';
import { AgentModelConfigAdmin } from "../data/queries/agent/types";

export type ModelInstance = {
  model: any;
  streamTextOptions: Record<string, any>;
  generateTextOptions: Record<string, any>;
  generateObjectOptions: Record<string, any>;
}

export async function getCachedAgentModelConfig(configCode: string, userName: string) {
    const key = `agentModelConfig:${configCode}`;
    const ok = await hasPermissions(userName,queryAgentModelConfigPermission)
    if (!ok) throw new Error(`Agent Config Cache Error. User '${userName}' does not have permission to '${queryAgentModelConfigPermission.toString}'`)
    
    return agentModelConfigCache.get(
        key,
        async () => {
            const result = await queryAgentModelConfig({code: configCode}, {userName: userName});
            if (result.length < 1) throw new Error(`Agent Model Config Cache Error. Could not find the config with code "${configCode}"`)
            switch (result[0].provider) {
                case 'openai': return createOpenAIInstance(result[0]);
                case 'anthropic': return createAnthropicInstance(result[0]);
                default : throw new Error(`Agent Model Config Cache Error. Unsupported model provider: ${(result[0] as any).provider}`);                
            }
        },
        600_000
    )
}

function createOpenAIInstance(config: AgentModelConfigAdmin): ModelInstance {
  const openai = config.api_key ? createOpenAI({ apiKey: config.api_key }): createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = openai(config.model);
  const baseOptions: Record<string, any> = {};

  if (config.temperature) {
    baseOptions.temperature = config.temperature;
  }
  if (config.max_tokens) {
    baseOptions.maxTokens = config.max_tokens;
  }
  if (config.top_p) {
    baseOptions.topP = config.top_p
  }
  if (config.provider_options && Object.keys(config.provider_options).length > 0) {
    baseOptions.providerOptions = config.provider_options;
  }
  const clearBaseOptions = removeNullsAndEmptyObjects(baseOptions);

  return {
    model,
    streamTextOptions: { ...clearBaseOptions },
    generateTextOptions: { ...clearBaseOptions },
    generateObjectOptions: { ...clearBaseOptions }
  };
}

function createAnthropicInstance(config: AgentModelConfigAdmin): ModelInstance {
  const anthropic = config.api_key ? createAnthropic({ apiKey: config.api_key }): createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const model = anthropic(config.model);
  const baseOptions: Record<string, any> = {};
  
  if (config.temperature) {
    baseOptions.temperature = config.temperature;
  }
  if (config.max_tokens) {
    baseOptions.maxTokens = config.max_tokens;
  }
  if (config.top_p) {
    baseOptions.topP = config.top_p
  }
  if (config.headers && Object.keys(config.headers).length > 0) {
    baseOptions.headers = config.headers;
  }
  if (config.provider_options && Object.keys(config.provider_options).length > 0) {
    baseOptions.providerOptions = config.provider_options;
  }
  const clearBaseOptions = removeNullsAndEmptyObjects(baseOptions);

  return {
    model,
    streamTextOptions: { ...clearBaseOptions },
    generateTextOptions: { ...clearBaseOptions },
    generateObjectOptions: { ...clearBaseOptions }
  };
}