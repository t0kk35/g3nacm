import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { RfiResponse } from '@/lib/data/queries/rfi/type';

const paramsSchema = z.object({
    rfi_id: z.string()
});

const query_text = `
SELECT 
  rrs.id AS "id",
  rrs.entity_code AS "entity_code",
  rfi_request_id,
  repsonse_text,
  response_data,
  respondent_entity_id,
  respondent_name,
  respondent_contact_details,
  is_complete,
  is_satisfactory,
  quality_notes,
  completeness_score,
  ai_extracted_entities,
  ai_sentiment_score,
  ai_relevance_score,
  ai_risk_indicators,
  ai_summary,
  ai_structured_extraction,
  rrs.create_datetime AS "create_datetime",
  rrs.update_datetime AS "update_datetime"
FROM rfi_response rrs
JOIN rfi_request rrq ON rrs.rfi_request_id = rrq.id
JOIN org_unit ou ON ou.code = rrq.org_unit_code
JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
JOIN users u ON ouap.user_id = u.id
WHERE u.name = $1
AND rrq.id = $2
`

export const queryRfiResponse = defineQuery({
    path: 'rfi/rfi_response',
    permissions: [],
    params: paramsSchema,
    execute: async ({ rfi_id }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<RfiResponse[]> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query({
                name: 'rfi_response',
                text: query_text,
                values: [ctx.userName, rfi_id ?? null],
            });
            return result.rows as RfiResponse[];
        } catch (err) {
            throw new DataQueryError('Get RFI Response', err as Error);
        }
    },
});