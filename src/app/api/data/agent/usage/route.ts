'use server'

import { auth } from '@/auth';
import * as db from '@/db'
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';
import { AgentUsage } from '../types';
import { getStartDate } from '@/lib/date-time/date-range';
import { requirePermissions } from '@/lib/permissions/check';

const origin = 'api/data/agent/usage/'

const query_text = `
WITH series AS (
  SELECT d AS period
  FROM generate_series(
    --- start date
    date_trunc(
      CASE
        WHEN $2 = 'h' THEN 'hour'
        WHEN $2 = 'd' THEN 'day'
        WHEN $2 = 'w' THEN 'week'
        WHEN $2 = 'm' THEN 'month'
      END,
      $1::timestamp
    ),
    --- end date
    date_trunc(
      CASE
        WHEN $2 = 'h' THEN 'hour'
        WHEN $2 = 'd' THEN 'day'
        WHEN $2 = 'w' THEN 'week'
        WHEN $2 = 'm' THEN 'month'
      END,
      now()::timestamp
    ),
    --- interval
    CASE
      WHEN $2 = 'h' THEN interval '1 hour'
      WHEN $2 = 'd' THEN interval '1 day'
      WHEN $2 = 'w' THEN interval '1 week'
      WHEN $2 = 'm' THEN interval '1 month'
    END
  ) d
), 
chat_agent_cost AS (
  SELECT 
    u.name as "user_name",
    cs.id as "session_id",
    cm.agent_code,
    a.name,
    date_trunc(
      CASE
        WHEN $2 = 'h' THEN 'hour'
        WHEN $2 = 'd' THEN 'day'
        WHEN $2 = 'w' THEN 'week'
        WHEN $2 = 'm' THEN 'month'
      END,
      cm.created_at::timestamp
    ) AS period,
    cm.input_tokens * apmc.input_token_cost / 1000000 as "input_token_cost",
    cm.cached_input_tokens * apmc.cached_input_token_cost / 1000000 as "cached_input_token_cost",
    cm.output_tokens * apmc.cached_input_token_cost / 1000000 as "output_token_cost"
  FROM chat_session cs
  JOIN chat_message cm on cs.id = cm.session_id
  JOIN users u on cs.user_id = u.id
  JOIN agent a ON a.code = cm.agent_code
  JOIN agent_model am on a.model_code = am.code
  LEFT JOIN agent_provider_model_cost apmc ON am.model = apmc.model 
  WHERE cm.input_tokens is NOT NULL 
  AND cm.output_tokens IS NOT NULL 
  AND cm.cached_input_tokens IS NOT NULL
  AND cm.created_at >= $1
)
SELECT 
  agent_code,
  user_name,
  CASE
    WHEN $2 = 'h' THEN to_char(s.period, 'HH24')
    WHEN $2 = 'd' THEN to_char(s.period, 'YYYY-MM-DD')
    WHEN $2 = 'w' THEN to_char(s.period, 'IYYY-"W"IW')
    WHEN $2 = 'm' THEN to_char(s.period, 'YYYY-MM')
  END AS period,
  COALESCE(SUM(cac.input_token_cost), 0)::float8 as "input_token_cost",
  COALESCE(SUM(cac.cached_input_token_cost), 0)::float8 as "cached_input_token_cost",
  COALESCE(SUM(cac.output_token_cost), 0)::float8 as "output_token_cost",
  COALESCE(SUM(cac.input_token_cost) + SUM(cac.cached_input_token_cost) + SUM(cac.output_token_cost), 0)::float8 as "total_token_cost" 
FROM series s
LEFT JOIN chat_agent_cost cac ON s.period = cac.period 
GROUP BY 1, 2, 3
`

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";
        
    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['reporting.agent.usage.all']);
    if (permissionCheck) return permissionCheck;

    // See if we have optional parameters
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
            values:[startDate, timeRange.slice(-1).toLocaleLowerCase()]
        };
        try {
            const agent_usage = await db.pool.query(query);
            const res: AgentUsage[] = agent_usage.rows;
            return NextResponse.json(res);
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get agent Usage', error as Error);
        }
    }
}