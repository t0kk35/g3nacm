import * as db from "@/db"
import { agentConfigCache } from "./cache";
import { StreamingAgentConfig, TextAgentConfig, ObjectAgentConfig } from "../ai-tools";
import { removeNullsAndEmptyObjects } from "../json";

const config_query_text = `
SELECT 
  a.code,
  a.agent_type AS "type",
  a.model_code,   
  a.name,
  a.description,
  a.system_prompt,
  a.max_steps,
  a.output_schema,
  ARRAY_REMOVE(ARRAY_AGG(DISTINCT at.code), NULL) AS "tools"
FROM agent a 
LEFT JOIN agent_tool_link atl ON atl.agent_code = a.code
LEFT JOIN agent_tool at ON atl.tool_code = at.code
WHERE a.code = $1
GROUP BY a.code, a.agent_type, a.name, a.description, a.system_prompt, a.max_steps, a.output_schema
`

type AgentDBConfig = {
    code: string;
    type: string;
    model_code: string;
    name: string;
    description: string;
    system_prompt: string;
    max_steps: number;
    output_schema: Record<string, any>;
    tools: string[];
}

export async function getCachedAgentConfig(configCode: string) {
    const key = `agentConfig:${configCode}`;

    return agentConfigCache.get(
        key,
        async () => {
            const res = await db.pool.query(config_query_text, [configCode]);
            const configs:AgentDBConfig[] = res.rows;
            if (configs.length < 1) throw new Error(`Agent Config Cache Error. Could not find the config with code "${configCode}"`)
            switch (configs[0].type) {
                case 'streaming': return createStreamingConfig(configs[0]);
                case 'text': return createTextConfig(configs[0]);
                default: throw new Error(`Agent Config Cache Error. Unsupported agent type: ${(configs as any).type}`);
            }
        },
        600_000
    )
}

function createStreamingConfig(config: AgentDBConfig): StreamingAgentConfig {
    
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
        modelConfigCode: config.model_code,
        tools: config.tools,
        ... clearOptions
    }
}

function createTextConfig(config: AgentDBConfig): TextAgentConfig {
    
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
        modelConfigCode: config.model_code,
        tools: config.tools,
        ... clearOptions
    }

}

/* To be completed, I need to think about the output schema....
/* function creteObjectConfig(config: AgentDBConfig): ObjectAgentConfig {
 
} */