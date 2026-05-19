import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { AgentToolAdmin } from '@/lib/data/queries/agent/types';

const paramsSchema = z.object({})

const query_text = `
SELECT 
  code,
  agent_group,
  description
FROM agent_tool
`

export const queryAgentTool = defineQuery({
    path: 'agent/tool',
    permissions: ['reporting.agent.usage.all'],
    params: paramsSchema,
    execute: async ({ }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<AgentToolAdmin[]> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query(query_text);
            return result.rows as AgentToolAdmin[];
        } catch (err) {
            throw new DataQueryError('Get Agent Tool', err as Error);
        }
    },
});