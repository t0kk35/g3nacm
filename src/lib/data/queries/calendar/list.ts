import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { CalendarEvent } from './types';

const paramsSchema = z.object({
    from_date: z.string().date(),
    to_date: z.string().date(),
});

const query_text = `
SELECT
    ce.id,
    ce.type,
    ce.assign_user_id,
    ce.title,
    ce.description,
    ce.start_date_time,
    ce.end_date_time,
    ce.all_day,
    ce.location,
    ce.status,
    ce.create_user_id,
    ce.create_date_time,
    ce.update_date_time
FROM calendar_events ce
JOIN users u ON ce.assign_user_id = u.id
WHERE u.name = $1
  AND ce.status = 'active'
  AND (
    ce.start_date_time IS NULL
    OR (ce.start_date_time >= $2 AND ce.start_date_time < $3)
  )
ORDER BY ce.start_date_time ASC NULLS LAST
`

export const queryCalendarEvents = defineQuery({
    path: 'calendar/list',
    permissions: [],
    params: paramsSchema,
    execute: async ({ from_date, to_date }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<CalendarEvent[]> => {
        const conn = ctx.client ?? db.pool;
        // to_date is exclusive upper bound — advance by one day so the full to_date day is included
        const toExclusive = new Date(to_date);
        toExclusive.setDate(toExclusive.getDate() + 1);
        try {
            const result = await conn.query({
                text: query_text,
                values: [ctx.userName, from_date, toExclusive],
            });
            return result.rows as CalendarEvent[];
        } catch (err) {
            throw new DataQueryError('Get calendar list', err as Error);
        }
    },
});
