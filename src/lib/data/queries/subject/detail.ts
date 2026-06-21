import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataNotFoundError, DataNotUniqueError, DataQueryError } from '@/lib/data/errors';
import { Subject } from '@/app/api/data/subject/types';

const paramsSchema = z.object({
    subject_id: z.string().uuid(),
});

const query_text = `
SELECT
  sb.id,
  sb.subject_type AS "type",
  stc.display_name AS "type_name",
  stc.description AS "type_description",
  sb.version,
  sb.identifier,
  sb.org_unit_code,
  sb.segment,
  sb.status,
  sb.name,
  sb.mail,
  sb.phone,
  sb.acquisition_date,
  jsonb_build_object(
    'id',          a.id,
    'street',      a.street,
    'number',      a.number,
    'city',        a.city,
    'postal_code', a.postal_code,
    'country',     a.country
  ) AS "address",
  sd.schema_version,
  COALESCE(sd.detail_data, '{}'::jsonb) AS "type_specific"
FROM subject_base sb
JOIN org_unit ou ON ou.code = sb.org_unit_code
JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
JOIN users u ON ouap.user_id = u.id
JOIN subject_detail sd ON sd.id = sb.id
JOIN subject_type_config stc ON sb.subject_type = stc.code
LEFT JOIN address a  ON a.id = sb.address_id
WHERE u.name=$1 AND sb.id = $2
`;

export const querySubjectDetail = defineQuery({
    path: 'subject/detail',
    permissions: ['data.subject'],
    params: paramsSchema,
    execute: async ({ subject_id }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<Subject> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query({
                name: 'data_subject_detail',
                text: query_text,
                values: [ctx.userName, subject_id],
            });
            if (result.rows.length === 0) throw new DataNotFoundError('subject', subject_id);
            if (result.rows.length > 1) throw new DataNotUniqueError('subject', subject_id);
            return result.rows[0] as Subject;
        } catch (err) {
            if (err instanceof DataNotFoundError || err instanceof DataNotUniqueError) throw err;
            throw new DataQueryError('Get subject detail', err as Error);
        }
    },
});
