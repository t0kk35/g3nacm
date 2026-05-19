import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError, DataNotFoundError, DataNotUniqueError } from '@/lib/data/errors';
import { UserAssignment } from '@/lib/data/queries/user/user';

const paramsSchema = z.object({})

const query_text = `
SELECT jsonb_build_object(
  'total', alert_stats.overall,
  'user', jsonb_build_object(
    'total', alert_stats.user_all,
    'high_priority', alert_stats.user_high,
    'medium_priority', alert_stats.user_medium,
    'low_priority', alert_stats.user_low
  ),
  'team', jsonb_build_object(
    'total', alert_stats.team_all,
    'high_priority', alert_stats.team_high,
    'medium_priority', alert_stats.team_medium,
    'low_priority', alert_stats.team_low
  )
) AS alerts
FROM (
  SELECT 
    COALESCE(SUM(1), 0) AS overall, 
    COALESCE(SUM(CASE WHEN a.assignment_type = 'user' THEN 1 END), 0) AS user_all,    
    COALESCE(SUM(CASE WHEN a.assignment_type = 'user' AND a.priority = 'High' THEN 1 END), 0) AS user_high,
    COALESCE(SUM(CASE WHEN a.assignment_type = 'user' AND a.priority = 'Medium' THEN 1 END), 0) AS user_medium,
    COALESCE(SUM(CASE WHEN a.assignment_type = 'user' AND a.priority = 'Low' THEN 1 END), 0) AS user_low,
    COALESCE(SUM(CASE WHEN a.assignment_type = 'team' THEN 1 END), 0) AS team_all,   
    COALESCE(SUM(CASE WHEN a.assignment_type = 'team' AND a.priority = 'High' THEN 1 END), 0) AS team_high,
    COALESCE(SUM(CASE WHEN a.assignment_type = 'team' AND a.priority = 'Medium' THEN 1 END), 0) AS team_medium,
    COALESCE(SUM(CASE WHEN a.assignment_type = 'team' AND a.priority = 'Low' THEN 1 END), 0) AS team_low
  FROM (
    SELECT 
      ab.id,
      wes.priority,
      wes.assigned_to_user_id,
      'user' AS assignment_type
    FROM alert_base ab
    JOIN workflow_entity_state wes ON wes.entity_code = ab.entity_code AND wes.entity_id = ab.id
    JOIN users u ON wes.assigned_to_user_id = u.id
    WHERE wes.assigned_to_user_id IS NOT null
    AND u.name = $1
  UNION ALL 
    SELECT 
      ab.id,
      wes.priority,
      wes.assigned_to_team_id,
      'team' AS assignment_type
    FROM alert_base ab
    JOIN workflow_entity_state wes ON wes.entity_code = ab.entity_code AND wes.entity_id = ab.id
    WHERE wes.assigned_to_team_id is NOT null
    AND wes.assigned_to_team_id in (
      SELECT ut.id FROM users u
      JOIN user_team_link utl ON u.id = utl.user_id
      JOIN user_team ut ON ut.id = utl.team_id
      WHERE u.name = $1
    )
  ) a
) alert_stats
`

export const queryUserAssignment = defineQuery({
    path: 'user/assignment',
    permissions: [],
    params: paramsSchema,
    execute: async ({ }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<UserAssignment> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query({
                name: 'user_assignment',
                text: query_text,
                values: [ctx.userName],
            });
            if (result.rows.length === 0) throw new DataNotFoundError('user_assignment', ctx.userName)
            if (result.rows.length > 1) throw new DataNotUniqueError('user_assignment', ctx.userName)
            return result.rows[0] as UserAssignment;
        } catch (err) {
            throw new DataQueryError('Get User Assigment', err as Error);
        }
    },
});