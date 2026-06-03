import { z } from 'zod';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { WorkflowConfig } from '@/lib/data/queries/workflow/types';
import { getCachedWorkflowConfig } from '@/lib/cache/workflow-cache';

const paramsSchema = z.object({
    entity_code: z.string(),
    org_unit_code: z.string() 
})

export const queryWorkflowConfig = defineQuery({
    path: 'workflow',
    permissions: ['data.list.users.non-admin'],
    params: paramsSchema,
    execute: async ({ entity_code, org_unit_code }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<WorkflowConfig> => {
        try {
            const result = await getCachedWorkflowConfig(entity_code, org_unit_code);
            return result;
        } catch (err) {
            throw new DataQueryError('Get User List', err as Error);
        }
    },
});
