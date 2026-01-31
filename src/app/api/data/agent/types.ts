import { AgentModelConfig } from '@/lib/cache/agent-model-config-cache';
import { AgentConfig } from '@/lib/ai-tools';
import { string } from 'zod/v4';

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

export type AgentUsage = {
    agent_code: string;
    user_name: string;
    period: string;
    input_token_cost: number;
    cached_input_token_cost: number;
    output_token_cost: number;
    total_token_cost: number;
}

export type AgentUserPreference = {
    user_name: string;
    communication_style: 'concise' | 'detailed' | 'balanced';
    explantion_depth: 'minimal' | 'standard' | 'comprehensive';
    risk_perspective: 'conservative' | 'balanced' | 'risk_tolerant';
    output_format: 'narrative' | 'bullet_points' | 'structured';
    use_visual: 'minimal' | 'balanced' | 'maximal';
    planning_mode: 'no_explicit_planning' | 'communicate_planning' | 'plan_and_stop_at_each_step';
    show_confidence_scores: boolean;
    highlight_assumptions: boolean;
    preferred_language: string,
}