import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError, DataNotFoundError } from '@/lib/data/errors';
import { zTimeRangeToDateWithRaw } from '../../params';
import { UserHandled } from '@/lib/data/queries/user/user';

const paramsSchema = z.object({
    time_range: zTimeRangeToDateWithRaw,
})

const query_text = `
WITH series AS (
  SELECT d AS period
  FROM generate_series(
    date_trunc(
      CASE
        WHEN $3 = 'h' THEN 'hour'
        WHEN $3 = 'd' THEN 'day'
        WHEN $3 = 'w' THEN 'week'
        WHEN $3 = 'm' THEN 'month'
      END,
      $2::timestamp
    ),
    date_trunc(
      CASE
        WHEN $3 = 'h' THEN 'hour'
        WHEN $3 = 'd' THEN 'day'
        WHEN $3 = 'w' THEN 'week'
        WHEN $3 = 'm' THEN 'month'
      END,
      now()::timestamp
    ),
    CASE
      WHEN $3 = 'h' THEN interval '1 hour'
      WHEN $3 = 'd' THEN interval '1 day'
      WHEN $3 = 'w' THEN interval '1 week'
      WHEN $3 = 'm' THEN interval '1 month'
    END
  ) d
),
counts AS (
  SELECT date_trunc(
      CASE
        WHEN $3 = 'h' THEN 'hour'
        WHEN $3 = 'd' THEN 'day'
        WHEN $3 = 'w' THEN 'week'
        WHEN $3 = 'm' THEN 'month'
      END,
      wes.date_time::timestamp
    ) AS period,
    COUNT(*) AS count
  FROM workflow_entity_state wes
  JOIN users u on wes.user_id = u.id
  JOIN workflow_action wa ON wa.code = wes.action_code
  JOIN workflow_state ws on ws.code = wa.to_state
  WHERE date_time > $2
    AND u.name = $1
    AND is_active = false
    AND wes.entity_code like '%alert%'
  GROUP BY 1
)
SELECT
  CASE
    WHEN $3 = 'h' THEN to_char(s.period, 'HH24')
    WHEN $3 = 'd' THEN to_char(s.period, 'YYYY-MM-DD')
    WHEN $3 = 'w' THEN to_char(s.period, 'IYYY-"W"IW')
    WHEN $3 = 'm' THEN to_char(s.period, 'YYYY-MM')
  END AS period,
  COALESCE(c.count, 0) AS count
FROM series s
LEFT JOIN counts c ON s.period = c.period
ORDER BY s.period
`

export const queryUserEntitiesHandled = defineQuery({
    path: 'user/entities_handled',
    permissions: ['reporting.agent.usage.all'],
    params: paramsSchema,
    execute: async ({ time_range }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<UserHandled> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query({
                name: 'user_entities_handled',
                text: query_text,
                values: [ctx.userName, time_range.date, time_range.raw.slice(-1).toLocaleLowerCase()],
            });
            if (result.rows.length === 0) throw new DataNotFoundError('user_entities_handled', ctx.userName);
            return {
                alerts: result.rows.map(r => ({
                    period: r.period,
                    count: Number(r.count),
                }))
            } as UserHandled;
        } catch (err) {
            throw new DataQueryError('Get User Entities Handled', err as Error);
        }
    },
});