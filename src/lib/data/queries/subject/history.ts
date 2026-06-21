import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { SubjectHistory } from '@/app/api/data/subject/types';

const paramsSchema = z.object({
    subject_id: z.string().uuid(),
    from_date: z.coerce.date().optional(),
    to_date: z.coerce.date().optional()
});

const query_text = `
SELECT
  sbh.id,
  sbh.date_from AS "valid_from",
  sbh.date_to AS "valid_to",
  sbh.version,
  sbh.org_unit_code,
  json_build_object(
    'id',               sbh.id,
    'identifier',       sbh.identifier,
    'type',             sbh.subject_type,
    'type_name',        stc.display_name,
    'type_description', stc.description,
    'segment',          sbh.segment,
    'status',           sbh.status,
    'name',             sbh.name,
    'mail',             sbh.mail,
    'phone',            sbh.phone,
    'acquisition_date', sbh.acquisition_date,
    'address', jsonb_build_object(
      'id',          a.id,
      'street',      a.street,
      'number',      a.number,
      'city',        a.city,
      'postal_code', a.postal_code,
      'country',     a.country
    ),
    'type_specific', COALESCE(sdh.detail_data, '{}'::jsonb)
  ) AS "subject_history"
FROM subject_base_history sbh
JOIN org_unit ou ON ou.code = sbh.org_unit_code
JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
JOIN users u ON ouap.user_id = u.id
JOIN subject_type_config stc ON sbh.subject_type = stc.code
JOIN subject_detail_history sdh ON sdh.id = sbh.id AND sdh.version = sbh.version
LEFT JOIN address a ON a.id = sbh.address_id
WHERE u.name=$1 AND sbh.id=$2
  AND ($3::timestamp IS NULL OR sbh.date_to   >= $3::timestamp)
  AND ($4::timestamp IS NULL OR sbh.date_from <= $4::timestamp)
`

export const querySubjectDetail = defineQuery({
    path: 'subject/history',
    permissions: ['data.subject'],
    params: paramsSchema,
    execute: async ({ subject_id, from_date, to_date }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<SubjectHistory[]> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query(query_text, [ctx.userName, subject_id, from_date, to_date]);
            return result.rows as SubjectHistory[];
        } catch (err) {
            throw new DataQueryError('Get subject history', err as Error);
        }
    },
});