import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { authorizedFetch } from '@/lib/org-filtering'
import * as db from '@/db'
import { ErrorCreators } from '@/lib/api-error-handling'

const origin = 'api/data/alert/summary'

export interface AlertSummary {
  total_alerts: number
  by_type: { [key: string]: number }
  by_status: { [key: string]: number }
  assigned_to_me: number
  unassigned: number
  recent_activity: {
    id: string
    alert_identifier: string
    alert_type: string
    description: string
    create_date_time: string
    entity_state: string
  }[]
  trends: {
    period: string
    counts: { date: string; count: number }[]
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const userName = user.name
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '24h'
    //const orgUnitCode = searchParams.get('orgUnitCode')
    const orgUnitCode = 'EUR'

    // Convert timeRange to SQL interval
    const timeIntervals: { [key: string]: string } = {
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days'
    }

    const interval = timeIntervals[timeRange] || '24 hours'

    // This is a bug...
    

    // Build org unit filter
    const orgFilter = orgUnitCode ? 'AND ab.org_unit_code = $1' : ''
    //const orgParams = orgUnitCode ? [userName, orgUnitCode] : [userName]
    const orgParams = [orgUnitCode]
    const client = await db.pool.connect()

    try {
      // Get total alerts count
      const totalResult = await client.query(`
        SELECT COUNT(*) as total
        FROM alert_base ab
        JOIN workflow_entity_state wes ON ab.id = wes.entity_id
        WHERE ab.create_date_time >= NOW() - INTERVAL '${interval}'
        ${orgFilter}
      `, orgParams)

      const totalAlerts = parseInt(totalResult.rows[0]?.total || '0')

      // Get alerts by type
      const typeResult = await client.query(`
        SELECT 
          ab.alert_type,
          COUNT(*) as count
        FROM alert_base ab
        JOIN workflow_entity_state wes ON ab.id = wes.entity_id
        WHERE ab.create_date_time >= NOW() - INTERVAL '${interval}'
        ${orgFilter}
        GROUP BY ab.alert_type
      `, orgParams)

      const byType: { [key: string]: number } = {}
      typeResult.rows.forEach(row => {
        byType[row.alert_type] = parseInt(row.count)
      })

      // Get alerts by status (workflow state)
      const statusResult = await client.query(`
        SELECT 
          ws.name as status,
          COUNT(*) as count
        FROM alert_base ab
        JOIN workflow_entity_state wes ON ab.id = wes.entity_id
        JOIN workflow_state ws ON wes.to_state_code = ws.code
        WHERE ab.create_date_time >= NOW() - INTERVAL '${interval}'
        ${orgFilter}
        GROUP BY ws.name
      `, orgParams)

      const byStatus: { [key: string]: number } = {}
      statusResult.rows.forEach(row => {
        byStatus[row.status] = parseInt(row.count)
      })

      // Get alerts assigned to current user
      const assignedResult = await client.query(`
        SELECT COUNT(*) as count
        FROM alert_base ab
        JOIN workflow_entity_state wes ON ab.id = wes.entity_id
        WHERE wes.assigned_to_user_name = $1
        AND ab.create_date_time >= NOW() - INTERVAL '${interval}'
        ${orgFilter}
      `, orgParams)

      const assignedToMe = parseInt(assignedResult.rows[0]?.count || '0')

      // Get unassigned alerts
      const unassignedResult = await client.query(`
        SELECT COUNT(*) as count
        FROM alert_base ab
        JOIN workflow_entity_state wes ON ab.id = wes.entity_id
        WHERE wes.assigned_to_user_name IS NULL
        AND ab.create_date_time >= NOW() - INTERVAL '${interval}'
        ${orgFilter}
      `, orgParams)

      const unassigned = parseInt(unassignedResult.rows[0]?.count || '0')

      // Get recent activity (last 10 alerts)
      const recentResult = await client.query(`
        SELECT 
          ab.id,
          ab.alert_identifier,
          ab.alert_type,
          ab.description,
          ab.create_date_time,
          ws.name as entity_state
        FROM alert_base ab
        JOIN workflow_entity_state wes ON ab.id = wes.entity_id
        JOIN workflow_state ws ON wes.to_state_code = ws.code
        WHERE ab.create_date_time >= NOW() - INTERVAL '${interval}'
        ${orgFilter}
        ORDER BY ab.create_date_time DESC
        LIMIT 10
      `, orgParams)

      const recentActivity = recentResult.rows.map(row => ({
        id: row.id,
        alert_identifier: row.alert_identifier,
        alert_type: row.alert_type,
        description: row.description,
        create_date_time: row.create_date_time,
        entity_state: row.entity_state
      }))

      // Get trend data (daily counts for the period)
      const trendResult = await client.query(`
        SELECT 
          DATE(ab.create_date_time) as date,
          COUNT(*) as count
        FROM alert_base ab
        JOIN workflow_entity_state wes ON ab.id = wes.entity_id
        WHERE ab.create_date_time >= NOW() - INTERVAL '${interval}'
        ${orgFilter}
        GROUP BY DATE(ab.create_date_time)
        ORDER BY DATE(ab.create_date_time)
      `, orgParams)

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

      return NextResponse.json(summary)

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Error fetching alert summary:', error)
    return ErrorCreators.db.queryFailed(origin, 'not sure' , error as Error);
  }
}