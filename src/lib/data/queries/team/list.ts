import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { UserTeam } from '@/lib/data/queries/user/user';

// I'm going to have to change this later. The returned teams will have to be restricted to maybe an org?
// Second change ... Need to figure out if I ame this an admin access, it might be needed for workflows.

const paramsSchema = z.object({
    team_id: z.string().optional(),
})

const query_text = `
SELECT 
    id AS "id",
    name AS "name",
    description AS "description",
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT utl.user_id), NULL) AS "user_ids"
FROM user_team ut
LEFT JOIN user_team_link utl ON ut.id = utl.team_id
WHERE $1::integer IS NULL OR ut.id = $1
GROUP BY ut.id, ut.name, ut.description
`

export const queryTeamList = defineQuery({
    path: 'team/list',
    permissions: [],
    params: paramsSchema,
    execute: async ({ team_id }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<UserTeam[]> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query(query_text, [team_id]);
            return result.rows as UserTeam[];
        } catch (err) {
            throw new DataQueryError('Get Team List', err as Error);
        }
    },
});