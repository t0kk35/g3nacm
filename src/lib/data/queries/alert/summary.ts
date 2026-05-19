import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { getSQLInterval } from '@/lib/date-time/date-range';
import { AlertSummary } from './type';

const paramsSchema = z.object({
    time_range: z.string().optional()
})

export const queryAlertSummary = defineQuery({
    path: 'alert/summary',
    permissions: [],
    params: paramsSchema,
    execute: async ({ time_range }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<AlertSummary> => {
        const conn = ctx.client ?? db.pool;
        try {
            const timeRange = time_range || '24h' 
            const interval = getSQLInterval(timeRange);

            // Get total alerts count
            const totalResult = await conn.query(`
                SELECT COUNT(*) as total
                FROM alert_base ab
                JOIN workflow_entity_state wes ON ab.id = wes.entity_id
                JOIN org_unit ou ON ou.code = ab.org_unit_code
                JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
                JOIN users u ON ouap.user_id = u.id
                WHERE u.name = $1 AND ab.create_date_time >= NOW() - INTERVAL '${interval}'`
            , [ctx.userName])

            const totalAlerts = parseInt(totalResult.rows[0]?.total || '0')

            // Get alerts by type
            const typeResult = await conn.query(`
                SELECT 
                    we.description AS "alert_type",
                    COUNT(*) as count
                FROM alert_base ab
                JOIN workflow_entity we ON ab.entity_code = we.code
                JOIN workflow_entity_state wes ON ab.id = wes.entity_id
                JOIN org_unit ou ON ou.code = ab.org_unit_code
                JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
                JOIN users u ON ouap.user_id = u.id
                WHERE u.name = $1 AND ab.create_date_time >= NOW() - INTERVAL '${interval}'
                GROUP BY we.description`
            , [ctx.userName])

            const byType: { [key: string]: number } = {}
            typeResult.rows.forEach(row => {
                byType[row.alert_type] = parseInt(row.count)
            })

            // Get alerts by status (workflow state)
            const statusResult = await conn.query(`
                SELECT 
                    ws.name as status,
                    COUNT(*) as count
                FROM alert_base ab
                JOIN workflow_entity_state wes ON ab.id = wes.entity_id
                JOIN workflow_state ws ON wes.to_state_code = ws.code
                JOIN org_unit ou ON ou.code = ab.org_unit_code
                JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
                JOIN users u ON ouap.user_id = u.id                
                WHERE u.name = $1 AND ab.create_date_time >= NOW() - INTERVAL '${interval}'
                GROUP BY ws.name
            `, [ctx.userName])

            const byStatus: { [key: string]: number } = {}
            statusResult.rows.forEach(row => {
                byStatus[row.status] = parseInt(row.count)
            })

            // Get alerts assigned to current user
            const assignedResult = await conn.query(`
                SELECT COUNT(*) as count
                FROM alert_base ab
                JOIN workflow_entity_state wes ON ab.id = wes.entity_id
                JOIN org_unit ou ON ou.code = ab.org_unit_code
                JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
                JOIN users u ON ouap.user_id = u.id  
                WHERE wes.assigned_to_user_name = $1 AND u.name = $1
                AND ab.create_date_time >= NOW() - INTERVAL '${interval}'
            `, [ctx.userName])
            
            const assignedToMe = parseInt(assignedResult.rows[0]?.count || '0')
            
            // Get unassigned alerts
            const unassignedResult = await conn.query(`
                SELECT COUNT(*) as count
                FROM alert_base ab
                JOIN workflow_entity_state wes ON ab.id = wes.entity_id
                JOIN org_unit ou ON ou.code = ab.org_unit_code
                JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
                JOIN users u ON ouap.user_id = u.id  
                WHERE u.name = $1 AND wes.assigned_to_user_name IS NULL 
                AND ab.create_date_time >= NOW() - INTERVAL '${interval}'
            `, [ctx.userName])

            const unassigned = parseInt(unassignedResult.rows[0]?.count || '0')

            // Get recent activity (last 10 alerts)
            const recentResult = await conn.query(`
                SELECT 
                    ab.id,
                    ab.alert_identifier,
                    we.description AS "alert_type",
                    ab.description,
                    ab.create_date_time,
                    ws.name as entity_state
                FROM alert_base ab
                JOIN workflow_entity we ON ab.entity_code = we.code
                JOIN workflow_entity_state wes ON ab.id = wes.entity_id
                JOIN workflow_state ws ON wes.to_state_code = ws.code
                JOIN org_unit ou ON ou.code = ab.org_unit_code
                JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
                JOIN users u ON ouap.user_id = u.id  
                WHERE u.name = $1 AND ab.create_date_time >= NOW() - INTERVAL '${interval}'
                ORDER BY ab.create_date_time DESC
                LIMIT 10
            `, [ctx.userName])

            const recentActivity = recentResult.rows.map(row => ({
                id: row.id,
                alert_identifier: row.alert_identifier,
                alert_type: row.alert_type,
                description: row.description,
                create_date_time: row.create_date_time,
                entity_state: row.entity_state
            }))

            // Get trend data (daily counts for the period)
            const trendResult = await conn.query(`
                SELECT 
                    DATE(ab.create_date_time) as date,
                    COUNT(*) as count
                FROM alert_base ab
                JOIN workflow_entity_state wes ON ab.id = wes.entity_id
                JOIN org_unit ou ON ou.code = ab.org_unit_code
                JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
                JOIN users u ON ouap.user_id = u.id                
                WHERE u.name = $1 AND ab.create_date_time >= NOW() - INTERVAL '${interval}'
                GROUP BY DATE(ab.create_date_time)
                ORDER BY DATE(ab.create_date_time)
            `, [ctx.userName])
            
            const trends = {
                period: timeRange,
                counts: trendResult.rows.map(row => ({
                    date: row.date,
                    count: parseInt(row.count)
                }))
            }
            
            const summary: AlertSummary = {
                total_alerts: totalAlerts,
                by_type: byType,
                by_status: byStatus,
                assigned_to_me: assignedToMe,
                unassigned: unassigned,
                recent_activity: recentActivity,
                trends: trends
            }

            return summary

        } catch (err) {
            throw new DataQueryError('Get Agent Config', err as Error);
        }
    },
});