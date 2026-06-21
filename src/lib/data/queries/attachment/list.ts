import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { EntityAttachment } from '@/app/api/data/attachment/types';

const paramsSchema = z.object({
    entity_id: z.string().uuid(),
    entity_code: z.string()
});

const query_text = `
SELECT 
  wda.id as "id",
  entity_code,
  entity_id,
  filename,
  org_unit_code,
  original_filename,
  file_size,
  mime_type,
  uploaded_by_user_name,
  upload_date_time,
  description,
  is_active
FROM workflow_document_attachment wda
JOIN org_unit ou ON ou.code = wda.org_unit_code
JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
JOIN users u ON ouap.user_id = u.id
WHERE u.name=$1 AND wda.entity_id = $2 AND wda.entity_code = $3
`

export const querySubjectDetail = defineQuery({
    path: 'attachment/list',
    permissions: ['data.attachment'],
    params: paramsSchema,
    execute: async ({ entity_id, entity_code }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<EntityAttachment[]> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query(query_text, [ctx.userName, entity_id, entity_code]);
            return result.rows as EntityAttachment[];
        } catch (err) {
            throw new DataQueryError('Get Entity Attachment List', err as Error);
        }
    },
});