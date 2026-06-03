import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { zTimeRangeToDate } from '../../params';
import { RfiRequest } from '@/lib/data/queries/rfi/type';

const paramsSchema = z.object({
    rfi_id: z.string().uuid().optional(),
    rfi_identifier: z.string().optional(),
    time_range: zTimeRangeToDate.optional(),
}).refine(
    d => d.rfi_id || d.time_range,
    { message: 'Either rfi_id or time_range is required' }
);

const query_text = `
SELECT 
  rr.id AS "id",
  rr.identifier AS "identifier",
  rr.entity_code AS "entity_code",
  rr.org_unit_code AS "org_unit_code",
  we.display_url AS "entity_display_url",
  rr.direction AS "direction",
  jsonb_build_object(
    'id', rr.linked_entity_id,
    'code', rr.linked_entity_code,
    'description', wel.description,
    'display_url', wel.display_url,
    'identifier', wesl.entity_identifier
  ) AS "linked_entity",
  rr.parent_rfi_id AS "parent_rfi_id",
  rr.related_rfi_ids AS "related_rfi_ids",
  rr.create_user_name AS "create_user_name",
  rr.title AS "title",
  rr.body AS "body",
  rr.purpose AS "purpose",
  rr.recipient_subject_id AS "recipient_subject_id",
  rr.recipient_contact_details AS "recipient_contact_details",
  rr.requester_subject_id AS "requester_subject_id",
  rr.requester_contact_details AS "requester_contact_details",
  rr.requester_reference AS "requester_reference",
  jsonb_build_object(
    'code', rc.code,
    'name', rc.name,
    'type', rc.type,
    'is_inbound', rc.is_inbound,
    'is_outbound', rc.is_outbound
  ) as "channel",
  rr.template_id AS "template_id",
  rr.ai_generated_draft AS "ai_generated_draft",
  rr.ai_confidence_score AS "ai_confidence_score",
  rr.ai_suggestions AS "ai_suggestions",
  rr.ai_classification AS "ai_classification",
  rr.create_datetime AS "create_datetime",
  rr.update_datetime AS "update_datetime",
  rr.due_datetime AS "due_datetime",
  rr.reminder_datetime AS "reminder_datetime",
  rr.tags AS "tags",
  jsonb_build_object(
    'entity_code', rr.entity_code,
    'entity_description', we.description,
    'entity_identifier', wes.entity_identifier,
    'date_time', to_char(wes.date_time, 'dd/mm/yyyy'),
    'action_code', wes.action_code,
    'action_name', wes.action_name,
    'from_state_code', wes.from_state_code,
    'from_state_name', wes.from_state_name,
    'to_state_code', wes.to_state_code,
    'to_state_name', wes.to_state_name,
    'to_state_is_active', wes.to_state_is_active,
    'priority', wes.priority,
    'priority_num', wes.priority_num,   
    'assigned_to_user_name', COALESCE(wes.assigned_to_user_name, ''),
    'assigned_to_user_team', COALESCE(wes.assigned_to_team_name, ''),
    'user_name', wes.user_name,
    'comment', wes.comment
  ) as "entity_state"
FROM rfi_request rr
JOIN rfi_channel rc ON rc.id = rr.channel_id
JOIN workflow_entity we on rr.entity_code = we.code
JOIN workflow_entity wel on rr.linked_entity_code = wel.code
JOIN workflow_entity_state wesl ON rr.linked_entity_code = wesl.entity_code AND rr.linked_entity_id = wesl.entity_id
JOIN workflow_entity_state wes ON rr.entity_code = wes.entity_code and rr.id = wes.entity_id 
JOIN org_unit ou ON ou.code = rr.org_unit_code
JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
JOIN users u ON ouap.user_id = u.id
WHERE 
u.name = $1 AND
($2::uuid IS NULL OR rr.id = $2) AND
($3::text IS NULL OR rr.identifier = $3) AND 
($4::timestamp IS NULL OR (u.name = $1 AND rr.create_datetime >= $4 AND wes.assigned_to_user_name = $1))
`

export const queryRfiRequest = defineQuery({
    path: 'rfi/rfi_request',
    permissions: [],
    params: paramsSchema,
    execute: async ({ rfi_id, rfi_identifier, time_range }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<RfiRequest[]> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query({
                name: 'rfi_request',
                text: query_text,
                values: [ctx.userName, rfi_id ?? null, rfi_identifier ?? null, time_range ?? null],
            });
            return result.rows as RfiRequest[];
        } catch (err) {
            throw new DataQueryError('Get RFI Request', err as Error);
        }
    },
});