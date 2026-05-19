import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataNotFoundError, DataNotUniqueError, DataQueryError } from '@/lib/data/errors';
import { Alert } from '@/lib/data/queries/alert/alert';

const paramsSchema = z.object({
    alert_id: z.string().uuid(),
});

const query_text = `
SELECT
    ab.id,
    ab.alert_identifier,
    ab.create_date_time,
    ab.org_unit_code,
    ab.description,
    ab.schema_version,
    jsonb_build_object(
        'id', ai.item_id,
        'type', ai.item_type,
        'details', ai.item_details
    ) AS "alert_item",
    json_build_object(
        'entity_code', ab.entity_code,
        'entity_description', we.description,
        'entity_indentifier', wes.entity_identifier,
        'date_time', wes.date_time,
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
        'assigned_to_team_name', COALESCE(wes.assigned_to_team_name, ''),
        'user_name', wes.user_name,
        'comment', wes.comment
    ) as "entity_state",
    COALESCE(wesl.entity_state_history, '[]'::jsonb) as "entity_state_history",
    COALESCE(det.detections, '[]'::jsonb) AS "detections"
FROM alert_base ab
JOIN workflow_entity we ON ab.entity_code = we.code
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
        wes.entity_identifier,
        wes.date_time,
        wes.action_name,
        wes.action_code,
        wes.from_state_code,
        wes.from_state_name,
        wes.to_state_code,
        wes.to_state_name,
        wes.to_state_is_active,
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
            'entity_description', we.description,
            'entity_identifier', wesli.entity_identifier,
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
        jsonb_build_object('id', ad.id) || ad.detection_data
        ORDER BY ad.create_datetime
    ) AS detections
    FROM alert_detection ad
    WHERE ad.alert_id = ab.id
) det ON TRUE
WHERE u.name=$1 AND ab.id=$2
`;

export const queryAlertDetail = defineQuery({
    path: 'alert/detail',
    permissions: ['data.alert'],
    params: paramsSchema,
    execute: async ({ alert_id }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<Alert> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query({
                name: 'data_alert_detail',
                text: query_text,
                values: [ctx.userName, alert_id],
            });
            if (result.rows.length === 0) throw new DataNotFoundError('alert', alert_id);
            if (result.rows.length > 1) throw new DataNotUniqueError('alert', alert_id);
            return result.rows[0] as Alert;
        } catch (err) {
            if (err instanceof DataNotFoundError || err instanceof DataNotUniqueError) throw err;
            throw new DataQueryError('Get alert detail', err as Error);
        }
    },
});
