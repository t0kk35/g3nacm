import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { zStringToBoolean } from '../../params';
import { UserAdmin } from '@/lib/data/queries/user/user';

const paramsSchema = z.object({
    user_id: z.coerce.number().optional(),
    include_deleted: zStringToBoolean.optional() 
})

const query_text = `
SELECT 
    id,
    name,
    first_name,
    last_name,
    locale,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT url.role_id), NULL) AS "role_ids",
    COALESCE(
        jsonb_agg(DISTINCT
            jsonb_build_object(
                'team_id', utl.team_id, 
                'team_rank', utl.rank
            )
        ) 
        FILTER (WHERE utl.team_id IS NOT NULL), 
        '[]'::jsonb) AS "team_infos",
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT ouua.org_unit_id), NULL) AS "org_ids"
FROM users u
LEFT JOIN user_role_link url ON u.id = url.user_id
LEFT JOIN user_team_link utl ON u.id = utl.user_id
LEFT JOIN org_unit_user_access ouua ON u.id = ouua.user_id
WHERE ($1::integer IS NULL OR u.id = $1)
AND (u.deleted = FALSE OR ($2::boolean AND u.deleted = TRUE))
GROUP BY id, name, first_name, last_name
`

export const queryUserListAdmin = defineQuery({
    path: 'user/list_admin',
    permissions: ['admin.user'],
    params: paramsSchema,
    execute: async ({ user_id, include_deleted }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<UserAdmin[]> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query(query_text, [user_id, include_deleted]);
            return result.rows as UserAdmin[];
        } catch (err) {
            throw new DataQueryError('Get User List Admin', err as Error);
        }
    },
});