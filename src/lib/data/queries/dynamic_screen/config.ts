import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { DynamicScreenConfig } from './types';

const paramsSchema = z.object({
    screen_name: z.string()
});

const query_text = `
SELECT jsonb_build_object(
  'widget_config', COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', dsuwc.widget_id,
      'code', dswr.code,
      'title', dswr.name,
      'config', dsuwc.config
    )
  ), '[]'::jsonb),
  'layout', dsuc.layout
) AS dynamic_screen_config
FROM dynamic_screen_user_config dsuc 
LEFT JOIN dynamic_screen_user_widget_config dsuwc ON dsuwc.dynamic_screen_config_id = dsuc.id
LEFT JOIN dynamic_screen_widget_registry dswr ON dswr.code = dsuwc.widget_code
JOIN users u ON dsuc.user_id = u.id
WHERE u.name = $1
and dsuc.name = $2
GROUP BY dsuc.id, dsuc.layout
`

export const queryDynamicScreenConfig = defineQuery({
    path: 'dynamic_screen',
    permissions: [],
    params: paramsSchema,
    execute: async ({ screen_name }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<DynamicScreenConfig> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query({
                name: 'dynamic_screen_config',
                text: query_text,
                values: [ctx.userName, screen_name ?? null],
            });
            const res: DynamicScreenConfig = {
              name: screen_name,
              widget_config: result.rows[0].dynamic_screen_config.widget_config,
              layout: result.rows[0].dynamic_screen_config.layout
            }
            return res;
        } catch (err) {
            throw new DataQueryError('Get Dynamic Screen Config', err as Error);
        }
    },
});