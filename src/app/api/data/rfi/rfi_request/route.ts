'use server'

import { auth } from "@/auth";
import * as db from '@/db'
import { NextRequest, NextResponse } from "next/server";
import { RfiRequest } from "../type"
import { ErrorCreators } from '@/lib/api-error-handling';
import { getStartDate } from "@/lib/date-time/date-range";

const origin = 'api/data/rfi/rfi_request'

const query_text = `
SELECT 
  rr.id AS "id",
  rr.identifier AS "identifier",
  rr.entity_code AS "entity_code",
  rr.org_unit_code AS "org_unit_code",
  rr.direction AS "direction",
  rr.linked_entity_id AS "linked_entity_id",
  rr.linked_entity_code AS "linked_entity_code",
  rr.parent_rfi_id AS "parent_rfi_id",
  rr.related_rfi_ids AS "related_rfi_ids",
  rr.title AS "title",
  rr.description AS "description",
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
    'date_time', to_char(wes.date_time, 'dd/mm/yyyy'),
    'action_code', wes.action_code,
    'action_name', wes.action_name,
    'from_state_code', wes.from_state_code,
    'from_state_name', wes.from_state_name,
    'to_state_code', wes.to_state_code,
    'to_state_name', wes.to_state_name,
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
JOIN workflow_entity_state wes ON rr.entity_code = wes.entity_code and rr.id = wes.entity_id 
JOIN org_unit ou ON ou.code = rr.org_unit_code
JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
JOIN users u ON ouap.user_id = u.id
WHERE u.name=$1
AND rc.create_datetime >= $2
AND wes.assigned_to_user_name = $1
`

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    // We need a time_range param.
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get("time_range");
    if (!timeRange) return ErrorCreators.param.urlMissing(origin, 'time_range');
    const currentDate = new Date();
    const startDate = getStartDate(currentDate, timeRange);
    if (!startDate) return ErrorCreators.param.invalidTimeRange(origin, 'time_range', timeRange);

    if (!useMockData) {
        const query = {
            name: origin,
            text: query_text,
            values: [user.name, startDate]
        };
        try {
            const response = await db.pool.query(query);
            const res:RfiRequest[] = response.rows;
            return NextResponse.json(res);
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get rfi', error as Error);
        }
    }
}