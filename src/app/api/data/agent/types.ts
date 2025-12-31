import { AgentModelConfig } from '@/lib/cache/agent-model-config-cache';
import { AgentConfig } from '@/lib/ai-tools';

export type AgentModelConfigAdmin = AgentModelConfig & {
    agent_codes: number[];
}

export type AgentConfigAdmin = {
    code: string;
    agent_type: 'streaming' | 'text' | 'object'
    model_config_code: string;
    name: string;
    description: string;
    system_prompt?: string;
    max_steps?: number;
    tools?: string[];
    output_schema?: Record<string, any>
}

export type AgentToolAdmin = {
    code: string;
    agent_group: string;
    description: string;
}