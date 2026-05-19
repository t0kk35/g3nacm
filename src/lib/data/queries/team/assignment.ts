import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError, DataNotFoundError, DataNotUniqueError } from '@/lib/data/errors';
import { TeamAssignment } from './types';

const paramsSchema = z.object({})

const query_text = `
SELECT
  ut.id,
  ut.name,
  COALESCE(SUM(1), 0) AS total, 
  COALESCE(SUM(CASE WHEN wes.priority = 'High' THEN 1 END), 0) AS high_priority,
  COALESCE(SUM(CASE WHEN wes.priority = 'Medium' THEN 1 END), 0) AS medium_priority,
  COALESCE(SUM(CASE WHEN wes.priority = 'Low' THEN 1 END), 0) AS low_priority
FROM user_team ut
JOIN user_team_link utl ON ut.id = utl.team_id
JOIN users u on utl.user_id = u.id
JOIN workflow_entity_state wes on wes.assigned_to_team_id = ut.id
WHERE u.name = $1
GROUP BY ut.id, ut.name
`

export const queryTeamAssignment = defineQuery({
    path: 'team/assignment',
    permissions: [],
    params: paramsSchema,
    execute: async ({ }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<TeamAssignment[]> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query({
                name: 'team_assignment',
                text: query_text,
                values: [ctx.userName],
            });
            if (result.rows.length === 0) throw new DataNotFoundError('team_assignment', ctx.userName)
            if (result.rows.length > 1) throw new DataNotUniqueError('team_assignment', ctx.userName)
            return result.rows as TeamAssignment[];
        } catch (err) {
            throw new DataQueryError('Get Team Assigment', err as Error);
        }
    },
});