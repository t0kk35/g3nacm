import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { OrgUnitUserAccess } from './org_unit';

const paramsSchema = z.object({})

const query_text = `
SELECT 
    u.id as "user_id",
    ou.id as "org_unit_id",
    ou.path
FROM users u
JOIN org_unit_user_access oua on oua.user_id = u.id
JOIN org_unit ou on ou.id = oua.org_unit_id
WHERE u.name = $1
`

export const queryOrgUnitAccess = defineQuery({
    path: 'org_unit/access',
    permissions: [],
    params: paramsSchema,
    execute: async ({ }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<OrgUnitUserAccess[]> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query(query_text, [ctx.userName]);
            return result.rows as OrgUnitUserAccess[];
        } catch (err) {
            throw new DataQueryError('Get OrgUnit Access', err as Error);
        }
    },
});