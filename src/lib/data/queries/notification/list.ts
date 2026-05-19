import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { zTimeRangeToDate } from '../../params';
import { Notification } from '@/lib/data/queries/notification/types';

const paramsSchema = z.object({
    time_range: zTimeRangeToDate,
})

const query_text = `
SELECT
  n.id,
  n.identifier,
  n.sender_user_name,
  n.receiver_user_name,
  jsonb_build_object(
    'id', n.linked_entity_id,
    'code', n.linked_entity_code,
    'description', we.description,
    'display_url', we.display_url,
    'identifier', wesl.entity_identifier
  ) AS "linked_entity",
  n.title,
  n.body,
  n.metadata,
  n.create_date_time,
  n.read_date_time
FROM notification n 
JOIN workflow_entity we ON n.linked_entity_code = we.code
JOIN workflow_entity_state wesl ON n.linked_entity_code = wesl.entity_code AND n.linked_entity_id = wesl.entity_id 
WHERE n.receiver_user_name = $1
AND n.create_date_time >= $2
`

export const queryNotification = defineQuery({
    path: 'notification/list',
    permissions: [],
    params: paramsSchema,
    execute: async ({ time_range }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<Notification[]> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query({
                name: 'notification_list',
                text: query_text,
                values: [ctx.userName, time_range ?? null],
            });
            return result.rows as Notification[];
        } catch (err) {
            throw new DataQueryError('Get Notification', err as Error);
        }
    },
});