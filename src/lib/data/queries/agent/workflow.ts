import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';

const paramsSchema = z.object({
    workflow_state_code: z.string()
});

const query_text = `
SELECT agent_code 
FROM agent_workflow_state_link
WHERE workflow_state_code = $1 
`

export const queryAgentWorkflow = defineQuery({
    path: 'agent/workflow',
    permissions: [],
    params: paramsSchema,
    execute: async ({ workflow_state_code }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<String|undefined> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query({
                name: 'agent_workflow',
                text: query_text,
                values: [workflow_state_code],
            });
            if (result.rows.length === 0) return undefined;
            else return result.rows[0].agent_code;
        } catch (err) {
            throw new DataQueryError('Get Agent Workflow', err as Error);
        }
    },
});