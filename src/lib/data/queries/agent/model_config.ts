import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { AgentModelConfigAdmin } from './types';
import { removeNullsAndEmptyObjects } from '@/lib/json';

const paramsSchema = z.object({
    code: z.string().optional()
})

const query_text = `
SELECT 
  am.code,
  am.name,
  am.provider,
  am.model,
  am.temperature,
  am.max_tokens,
  am.top_p,
  am.api_key,
  am.headers,
  am.provider_options,
  ARRAY_REMOVE(ARRAY_AGG(DISTINCT a.code), NULL) AS "agent_codes"
FROM agent_model am
LEFT JOIN agent a ON a.model_code = am.code
WHERE $1::text IS NULL or am.code = $1
GROUP BY am.code, am.name, am.provider, am.model, am.temperature, am.max_tokens, am.top_p, am.headers, am.provider_options
`

export const queryAgentModelConfigPermission = ['admin.agent.model.config']

export const queryAgentModelConfig = defineQuery({
    path: 'agent/model_config',
    permissions: queryAgentModelConfigPermission,
    params: paramsSchema,
    execute: async ({ code }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<AgentModelConfigAdmin[]> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query(query_text, [code]);
            return result.rows.map(c => removeNullsAndEmptyObjects(c)) as AgentModelConfigAdmin[];
        } catch (err) {
            throw new DataQueryError('Get Agent Model Config', err as Error);
        }
    },
});