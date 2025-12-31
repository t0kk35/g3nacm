import * as db from "@/db"
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { agentModelConfigCache } from "./cache";
import { removeNullsAndEmptyObjects } from "../json";

const model_config_query_text = `
SELECT 
  code,
  name,
  provider,
  model,
  temperature,
  max_tokens,
  top_p,
  api_key,
  headers,
  provider_options
FROM agent_model
WHERE code = $1
`

export type ModelInstance = {
  model: any;
  streamTextOptions: Record<string, any>;
  generateTextOptions: Record<string, any>;
  generateObjectOptions: Record<string, any>;
}

export type AgentModelConfig = {
    code: string;
    name: string;
    provider: string;
    model: string;
    temperature?: number;
    max_tokens?:number;
    top_p?: number;
    api_key?: string;
    headers: Record<string, any>,
    provider_options: Record<string, any>
}

export async function getCachedAgentModelConfig(configCode: string) {
    const key = `agentModelConfig:${configCode}`;

    return agentModelConfigCache.get(
        key,
        async () => {
            const res = await db.pool.query(model_config_query_text, [configCode]);
            const configs:AgentModelConfig[] = res.rows;
            if (configs.length < 1) throw new Error(`Agent Model Config Cache Error. Could not find the config with code "${configCode}"`)
            switch (configs[0].provider) {
                case 'openai': return createOpenAIInstance(configs[0]);
                case 'anthropic': return createAnthropicInstance(configs[0]);
                default : throw new Error(`Agent Model Config Cache Error. Unsupported model provider: ${(configs as any).provider}`);                
            }
        },
        600_000
    )
}

function createOpenAIInstance(config: AgentModelConfig): ModelInstance {
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

function createAnthropicInstance(config: AgentModelConfig): ModelInstance {
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