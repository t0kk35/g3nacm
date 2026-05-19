import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { RfiChannel } from './type';

const paramsSchema = z.object({
    channel_code: z.string()
});

const query_text = `
SELECT 
  id AS "id",
  code AS "code",
  name AS "name",
  type AS "type",
  is_inbound AS "is_inbound",
  is_outbound AS "is_outbound",
  configuration AS "configuration",
  credentials AS "credentials",
  validation_regex AS "validation_regex",
  requires_authentication AS "requires_authentication",
  supports_delivery_confirmation AS "supports_delivery_confirmation",
  supports_read_receipts AS "supports_read_receipts",
  supports_attachments AS "supports_attachments",
  max_attachment_size_mb AS "max_attachment_size_mb",
  is_active AS "is_active",
  is_default AS "is_default",
  create_datetime AS "create_datetime",
  update_datetime AS "update_datetime"
FROM rfi_channel rc
WHERE $1::integer IS NULL or rc.code = $1
`

export const queryRfiChannel = defineQuery({
    path: 'rfi/rfi_channel',
    permissions: [],
    params: paramsSchema,
    execute: async ({ channel_code }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<RfiChannel[]> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query({
                name: 'rfi_channel',
                text: query_text,
                values: [ctx.userName, channel_code ?? null],
            });
            return result.rows as RfiChannel[];
        } catch (err) {
            throw new DataQueryError('Get RFI Channel', err as Error);
        }
    },
});