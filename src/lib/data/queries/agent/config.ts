import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { AgentConfigAdmin } from './types';
import { removeNullsAndEmptyObjects } from '@/lib/json';

const paramsSchema = z.object({
    code: z.string().optional()
})

const query_text = `
SELECT 
  a.code,
  a.agent_type,
  a.model_code AS "model_config_code",   
  a.name,
  a.description,
  a.system_prompt,
  a.max_steps,
  a.output_schema,
  ARRAY_REMOVE(ARRAY_AGG(DISTINCT at.code), NULL) AS "tools"
FROM agent a 
LEFT JOIN agent_tool_link atl ON atl.agent_code = a.code
LEFT JOIN agent_tool at ON atl.tool_code = at.code
WHERE a.code = $1::text IS NULL or a.code = $1
GROUP BY a.code, a.agent_type, a.name, a.description, a.system_prompt, a.max_steps, a.output_schema
`

export const queryAgentConfigPermission = ['admin.agent.config']

export const queryAgentConfig = defineQuery({
    path: 'agent/config',
    permissions: queryAgentConfigPermission,
    params: paramsSchema,
    execute: async ({ code }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<AgentConfigAdmin[]> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query(query_text, [code]);
            return result.rows.map(c => removeNullsAndEmptyObjects(c)) as AgentConfigAdmin[];
        } catch (err) {
            throw new DataQueryError('Get Agent Config', err as Error);
        }
    },
});