import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { UserPermission } from '@/lib/data/queries/user/user';

const paramsSchema = z.object({})

const query_text = `
SELECT 
    id AS "id",
    permission_group AS "group",
    permission AS "permission",
    description AS "description"
FROM user_permission up
`

export const queryUserPermission = defineQuery({
    path: 'user/permission',
    permissions: ['admin.role'],
    params: paramsSchema,
    execute: async ({ }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<UserPermission[]> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query(query_text);
            return result.rows as UserPermission[];
        } catch (err) {
            throw new DataQueryError('Get User Permission', err as Error);
        }
    },
});