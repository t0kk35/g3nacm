import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { UserRole } from '@/lib/data/queries/user/user';

const paramsSchema = z.object({
    role_id: z.string().optional(),
})

const query_text = `
SELECT 
    ur.id AS "id",
    ur.name AS "name",
    ur.description AS "description",
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT urpl.permission_id), NULL) AS "permission_ids",
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT url.user_id), NULL) AS "user_ids"
FROM user_role ur
LEFT JOIN user_role_permission_link urpl ON ur.id = urpl.role_id
LEFT JOIN user_role_link url ON ur.id = url.role_id  
WHERE $1::integer IS NULL OR ur.id = $1 
GROUP BY ur.id, ur.name
`

export const queryRoleList = defineQuery({
    path: 'role/list',
    permissions: ['admin.role'],
    params: paramsSchema,
    execute: async ({ role_id }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<UserRole[]> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query(query_text, [role_id]);
            return result.rows as UserRole[];
        } catch (err) {
            throw new DataQueryError('Get Role List', err as Error);
        }
    },
});