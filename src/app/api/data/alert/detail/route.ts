'use server'

import { auth } from '@/auth';
import * as db from '@/db'
import { requirePermissions } from '@/lib/permissions/check';
import { NextRequest, NextResponse } from 'next/server';
import { Alert } from '../alert';
import { ErrorCreators } from '@/lib/api-error-handling';

const origin = 'api/data/alert/detail'

const query_text = `
SELECT
    ab.id,
    ab.alert_identifier,
    ab.create_date_time,
    ab.org_unit_code,
    ab.description,
    ab.alert_type,
    jsonb_build_object(
        'id', ai.item_id,
        'type', ai.item_type,
        'details', ai.item_details
    ) AS "alert_item",
    json_build_object(
        'entity_code', ab.entity_code,
        'date_time', wes.date_time,
        'action_code', wes.action_code,
        'action_name', wes.action_name,
        'from_state_code', wes.from_state_code,
        'from_state_name', wes.from_state_name,        
        'to_state_code', wes.to_state_code,
        'to_state_name', wes.to_state_name,
        'priority', wes.priority,
        'priority_num', wes.priority_num,   
        'assigned_to_user_name', COALESCE(wes.assigned_to_user_name, ''),
        'assigned_to_team_name', COALESCE(wes.assigned_to_team_name, ''),
        'user_name', wes.user_name,
        'comment', wes.comment 
    ) as "entity_state",
    COALESCE(wesl.entity_state_history, '[]'::jsonb) as "entity_state_history", 
    CASE 
        WHEN ab.alert_type = 'TM' THEN COALESCE(atd.tm_detections, '[]'::jsonb)
        WHEN ab.alert_type = 'NS' THEN COALESCE(ansd.ns_detections, '[]'::jsonb)
        WHEN ab.alert_type = 'TF' THEN COALESCE(atfd.tf_detections, '[]'::jsonb)
    END as "detections"  
FROM alert_base ab
JOIN org_unit ou ON ou.code = ab.org_unit_code
JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
JOIN users u ON ouap.user_id = u.id
LEFT JOIN LATERAL (
    SELECT ai.item_id, ai.item_identifier, ai.item_type, ai.item_details
    FROM alert_item ai
    WHERE ai.alert_id = ab.id
    LIMIT 1
) ai ON TRUE
LEFT JOIN LATERAL (
    SELECT
        wes.date_time,
        wes.action_name,
        wes.action_code,
        wes.from_state_code,
        wes.from_state_name,
        wes.to_state_code,
        wes.to_state_name,
        wes.priority,
        wes.priority_num,   
        wes.assigned_to_user_name,
        wes.assigned_to_team_name,
        wes.user_name,
        wes.comment
    FROM workflow_entity_state wes
    WHERE wes.entity_id = ab.id
    AND wes.entity_code = ab.entity_code
) wes on TRUE
LEFT JOIN LATERAL (
    SELECT jsonb_agg(   
        jsonb_build_object(
            'entity_code', ab.entity_code,
            'date_time', wesli.date_time,
            'action_code', wesli.action_code,
            'action_name', wesli.action_name,
            'from_state_code', wesli.from_state_code,
            'from_state_name', wesli.from_state_name,
            'priority', wesli.priority,
            'priority_num', wesli.priority_num,            
            'to_state_code', wesli.to_state_code,
            'to_state_name', wesli.to_state_name,
            'assigned_to_user_name', COALESCE(wesli.assigned_to_user_name, ''),
            'assigned_to_team_name', COALESCE(wesli.assigned_to_team_name, ''),
            'user_name', wesli.user_name,
            'comment', wesli.comment
    )) AS "entity_state_history"
    FROM workflow_entity_state_log wesli
    WHERE wesli.entity_id = ab.id
    AND wesli.entity_code = ab.entity_code
) wesl on TRUE
LEFT JOIN LATERAL (
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', atdi.id,
            'model_id', atdi.model_id,
            'name', atdi.name,
            'info', atdi.info,
            'score', atdi.score,
            'time_frame', atdi.time_frame
    )) AS "tm_detections"
    FROM alert_tm_detection atdi
    WHERE ab.alert_type = 'TM'
    AND atdi.alert_id = ab.id
) atd on TRUE
LEFT JOIN LATERAL (
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', andi.id,
            'input_data', andi.input_data,
            'list_name', andi.list_name,
            'list_uid', andi.list_uid,
            'list_data', andi.list_data,
            'algorithm', andi.algorithm,
            'score', andi.score
    )) AS "ns_detections"
    FROM alert_ns_detection andi
    WHERE ab.alert_type = 'NS'
    AND andi.alert_id = ab.id
) ansd on TRUE
LEFT JOIN LATERAL (
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', atfdi.id,
            'message_id', atfdi.tf_message_id,
            'transaction_id', atfdi.tf_transaction_id,
            'participant_role', atfdi.tf_participant_role,
            'list_name', wl.name,
            'input_data', atfdi.input_data,
            'list_data', atfdi.list_data,
            'algorithm', atfdi.algorithm,
            'score', atfdi.score
    )) AS "tf_detections"
    FROM alert_tf_detection atfdi
    JOIN wl_list_entry wle ON wle.id = atfdi.wl_list_entry_id
    JOIN wl_list_schema wls ON wls.id = wle.schema_id
    JOIN wl_list wl ON wl.id = wls.list_id
    WHERE ab.alert_type = 'TF'
    AND atfdi.alert_id = ab.id
) atfd on TRUE
WHERE u.name=$1 AND ab.id=$2
`

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";
    
    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['data.alert']);
    if (permissionCheck) return permissionCheck;    

    // Get the URL params. Throw errors if we can't find the mandatory ones.
    const searchParams = request.nextUrl.searchParams;
    const alertId = searchParams.get("alert_id");
    if (!alertId) return ErrorCreators.param.urlMissing(origin, "alert_id");
    
    if (!useMockData) {
        const query = {
            name: origin,
            text: query_text,
            values:[user.name, alertId]
        };
        try {
            const alerts = await db.pool.query(query);
            if (alerts.rows.length === 0) return ErrorCreators.db.entityNotFound(origin, 'alert', alertId);
            if (alerts.rows.length > 1) return ErrorCreators.db.entityNotUnique(origin, 'alert', alertId);
            const res:Alert = alerts.rows[0];
            return NextResponse.json(res);
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get alert detail', error as Error);
        }
    }
}