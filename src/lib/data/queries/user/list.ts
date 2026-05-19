import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { zStringToBoolean } from '../../params';
import { User } from './user';

const paramsSchema = z.object({
    user_ids: z.string().optional().transform(s => s?.split(',').map(Number)),
    search: z.string().optional() 
})

const query_text = `
SELECT 
    id,
    name,
    first_name AS "firstName",
    last_name AS "lastName",
    locale AS "locale",
    deleted AS "deleted"
FROM users u
WHERE (
    $1::integer[] IS NOT NULL AND u.id = ANY($1::integer[]) 
    OR 
    $2::text IS NOT NULL AND (name ILIKE $2 OR (first_name || ' ' || last_name ILIKE $2))
    OR 
    ($1 IS NULL AND $2 IS NULL)
)
`

export const queryUserList = defineQuery({
    path: 'user/list',
    permissions: ['data.list.users.non-admin'],
    params: paramsSchema,
    execute: async ({ user_ids, search }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<User[]> => {
        const conn = ctx.client ?? db.pool;
        try {
            const searchQueryPattern = search ? '%' + search + '%' : search
            const result = await conn.query(query_text, [user_ids, searchQueryPattern]);
            return result.rows as User[];
        } catch (err) {
            throw new DataQueryError('Get User List', err as Error);
        }
    },
});