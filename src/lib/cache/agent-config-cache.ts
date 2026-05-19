import { agentConfigCache } from "./cache";
import { StreamingAgentConfig, TextAgentConfig, ObjectAgentConfig } from "../ai-tools";
import { removeNullsAndEmptyObjects } from "../json";
import { queryAgentConfig, queryAgentConfigPermission } from "../data/queries/agent/config";
import { hasPermissions } from '@/lib/permissions/core';
import { AgentConfigAdmin } from "../data/queries/agent/types";

export async function getCachedAgentConfig(configCode: string, userName: string) {
    const key = `agentConfig:${configCode}`;
    const ok = await hasPermissions(userName,queryAgentConfigPermission)
    if (!ok) throw new Error(`Agent Config Cache Error. User '${userName}' does not have permission to '${queryAgentConfigPermission.toString}'`)

    return agentConfigCache.get(
        key,
        async () => {
            const result = await queryAgentConfig({code: configCode}, {userName: userName});
            if (result.length < 1) throw new Error(`Agent Config Cache Error. Could not find the config with code "${configCode}"`)
            switch (result[0].agent_type) {
                case 'streaming': return createStreamingConfig(result[0]);
                case 'text': return createTextConfig(result[0]);
                default: throw new Error(`Agent Config Cache Error. Unsupported agent type: ${result[0].agent_type}`);
            }
        },
        600_000
    )
}

function createStreamingConfig(config: AgentConfigAdmin): StreamingAgentConfig {
    
    const options: Record<string, any> = {};
    
    if (config.system_prompt) {
        options.systemPrompt = config.system_prompt;
    }
    if (config.max_steps) {
        options.maxSteps = config.max_steps
    }

    const clearOptions = removeNullsAndEmptyObjects(options);

    return {
        name: config.name,
        agentType: 'streaming',
        description: config.description,
        modelConfigCode: config.model_config_code,
        tools: config.tools || [],
        ... clearOptions
    }
}

function createTextConfig(config: AgentConfigAdmin): TextAgentConfig {
    
    const options: Record<string, any> = {};
    
    if (config.system_prompt) {
        options.systemPrompt = config.system_prompt;
    }
    if (config.max_steps) {
        options.maxSteps = config.max_steps
    }

    const clearOptions = removeNullsAndEmptyObjects(options);

    return {
        name: config.name,
        agentType: 'text',
        description: config.description,
        modelConfigCode: config.model_config_code,
        tools: config.tools || [],
        ... clearOptions
    }

}

/* To be completed, I need to think about the output schema....
/* function creteObjectConfig(config: AgentDBConfig): ObjectAgentConfig {
 
} */