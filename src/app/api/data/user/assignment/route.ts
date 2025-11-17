'use server'

import { auth } from '@/auth';
import * as db from '@/db'
import { NextRequest, NextResponse } from 'next/server';
import { UserAssignment } from '../user';
import { ErrorCreators } from '@/lib/api-error-handling';

const origin = 'api/data/user/assignment/'

const query_text = `
SELECT jsonb_build_object(
  'total', alert_stats.overall,
  'user', jsonb_build_object(
    'total', alert_stats.user_all,
    'high_priority', alert_stats.user_high,
    'medium_priority', alert_stats.user_medium,
    'low_priority', alert_stats.user_low
  ),
  'team', jsonb_build_object(
    'total', alert_stats.team_all,
    'high_priority', alert_stats.team_high,
    'medium_priority', alert_stats.team_medium,
    'low_priority', alert_stats.team_low
  )
) AS alerts
FROM (
  SELECT 
    COALESCE(SUM(CASE WHEN a.assignment_type = 'user' THEN 1 END), 0) AS overall, 
    COALESCE(SUM(CASE WHEN a.assignment_type = 'user' THEN 1 END), 0) AS user_all,    
    COALESCE(SUM(CASE WHEN a.assignment_type = 'user' AND a.priority = 'High' THEN 1 END), 0) AS user_high,
    COALESCE(SUM(CASE WHEN a.assignment_type = 'user' AND a.priority = 'Medium' THEN 1 END), 0) AS user_medium,
    COALESCE(SUM(CASE WHEN a.assignment_type = 'user' AND a.priority = 'Low' THEN 1 END), 0) AS user_low,
    COALESCE(SUM(CASE WHEN a.assignment_type = 'team' THEN 1 END), 0) AS team_all,   
    COALESCE(SUM(CASE WHEN a.assignment_type = 'team' AND a.priority = 'High' THEN 1 END), 0) AS team_high,
    COALESCE(SUM(CASE WHEN a.assignment_type = 'team' AND a.priority = 'Medium' THEN 1 END), 0) AS team_medium,
    COALESCE(SUM(CASE WHEN a.assignment_type = 'team' AND a.priority = 'Low' THEN 1 END), 0) AS team_low
  FROM (
    SELECT 
      ab.id,
      wes.priority,
      wes.assigned_to_user_id,
      'user' AS assignment_type
    FROM alert_base ab
    JOIN workflow_entity_state wes ON wes.entity_code = ab.entity_code AND wes.entity_id = ab.id
    JOIN users u ON wes.assigned_to_user_id = u.id
    WHERE ab.alert_type = 'TM'
    AND wes.assigned_to_user_id IS NOT null
    AND u.name = $1
  UNION ALL 
    SELECT 
      ab.id,
      wes.priority,
      wes.assigned_to_team_id,
      'team' AS assignment_type
    FROM alert_base ab
    JOIN workflow_entity_state wes ON wes.entity_code = ab.entity_code AND wes.entity_id = ab.id
    JOIN users u ON wes.assigned_to_user_id = u.id
    WHERE ab.alert_type = 'TM'
    AND wes.assigned_to_team_id is NOT null
    AND wes.assigned_to_team_id in (
      SELECT ut.id FROM users u
      JOIN user_team_link utl ON u.id = utl.user_id
      JOIN user_team ut ON ut.id = utl.team_id
      WHERE u.name = $1
    )
  ) a
) alert_stats
`

export async function GET(_request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";
        
    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    if (!useMockData) {
        const query = {
            name: origin,
            text: query_text,
            values:[user.name]
        };
        try {
            const alert_stats = await db.pool.query(query);
            if (alert_stats.rows.length === 0) return ErrorCreators.db.entityNotFound(origin, 'user_assignmets', user.name);
            if (alert_stats.rows.length > 1) return ErrorCreators.db.entityNotUnique(origin, 'user_assignmets', user.name);
            const res:UserAssignment = alert_stats.rows[0];
            return NextResponse.json(res);
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get user assigments', error as Error);
        }
    }
}