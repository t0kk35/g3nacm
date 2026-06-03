import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { UserOrgUnitAccess } from './org_unit';

const paramsSchema = z.object({})

const query_text = `
SELECT 
    u.name AS user_name,
    ARRAY_REMOVE(
        ARRAY_AGG(
            JSONB_BUILD_OBJECT(
                'org_unit_code', ou.code,
                'path', ou.path 
            )
        ), NULL) AS "org_units"
FROM users u
JOIN org_unit_user_access ouua ON ouua.user_id = u.id
JOIN org_unit ou ON ou.id = ouua.org_unit_id
WHERE u.name = $1
GROUP by u.name
`

export const queryUserOrgUnitAccess = defineQuery({
    path: 'org_unit/user_access',
    permissions: [],
    params: paramsSchema,
    execute: async ({ }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<UserOrgUnitAccess[]> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query(query_text, [ctx.userName]);
            return result.rows as UserOrgUnitAccess[];
        } catch (err) {
            throw new DataQueryError('Get UserOrgUnit Access', err as Error);
        }
    },
});