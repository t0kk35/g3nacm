'use server'

import { auth } from '@/auth';
import * as db from '@/db'
import { NextRequest, NextResponse } from 'next/server';
import { UserHandled } from '../user';
import { ErrorCreators } from '@/lib/api-error-handling';
import { calculateDailyPeriods, calculateMonthlyPeriods, calculateWeeklyPeriods, Period } from '@/lib/date-time/period-calculator';

const origin = 'api/data/user/entities_handled/'

const query_text = `
WITH series AS (
  SELECT d AS period
  FROM generate_series(
    date_trunc(
      CASE
        WHEN $3 = 'h' THEN 'hour'
        WHEN $3 = 'd' THEN 'day'
        WHEN $3 = 'w' THEN 'week'
        WHEN $3 = 'm' THEN 'month'
      END,
      $2::timestamp
    ),
    date_trunc(
      CASE
        WHEN $3 = 'h' THEN 'hour'
        WHEN $3 = 'd' THEN 'day'
        WHEN $3 = 'w' THEN 'week'
        WHEN $3 = 'm' THEN 'month'
      END,
      now()::timestamp
    ),
    CASE
      WHEN $3 = 'h' THEN interval '1 hour'
      WHEN $3 = 'd' THEN interval '1 day'
      WHEN $3 = 'w' THEN interval '1 week'
      WHEN $3 = 'm' THEN interval '1 month'
    END
  ) d
),
counts AS (
  SELECT date_trunc(
      CASE
        WHEN $3 = 'h' THEN 'hour'
        WHEN $3 = 'd' THEN 'day'
        WHEN $3 = 'w' THEN 'week'
        WHEN $3 = 'm' THEN 'month'
      END,
      wes.date_time::timestamp
    ) AS period,
    COUNT(*) AS count
  FROM workflow_entity_state wes
  JOIN users u on wes.user_id = u.id
  JOIN workflow_action wa ON wa.code = wes.action_code
  JOIN workflow_state ws on ws.code = wa.to_state
  WHERE date_time > $2
    AND u.name = $1
    AND is_active = false
    AND wes.entity_code like '%alert%'
  GROUP BY 1
)
SELECT
  CASE
    WHEN $3 = 'h' THEN to_char(s.period, 'HH24')
    WHEN $3 = 'd' THEN to_char(s.period, 'YYYY-MM-DD')
    WHEN $3 = 'w' THEN to_char(s.period, 'IYYY-"W"IW')
    WHEN $3 = 'm' THEN to_char(s.period, 'YYYY-MM')
  END AS period,
  COALESCE(c.count, 0) AS count
FROM series s
LEFT JOIN counts c ON s.period = c.period
ORDER BY s.period
`

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";
        
    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

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
            values:[user.name, startDate, timeRange.slice(-1).toLocaleLowerCase()]
        };
        try {
            const user_stats = await db.pool.query(query);        
            if (user_stats.rows.length === 0) return ErrorCreators.db.entityNotFound(origin, 'user_handled', user.name);
            const res: UserHandled = {
                alerts: user_stats.rows.map(r => ({
                    period: r.period,
                    count: Number(r.count),
                })),
            };
            return NextResponse.json(res);
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get user assigments', error as Error);
        }
    }
}

function getStartDate(referenceDate: Date, timePeriod: string) {
    const period = timePeriod.slice(-1).toLocaleLowerCase();
    let periods:Period[]
    switch (period) {
        case 'h':
            const hDate = new Date(referenceDate.getTime());
            const hours = parseInt(timePeriod.slice(0, -1));
            hDate.setHours(hDate.getHours() - hours);
            hDate.setMinutes(0);
            hDate.setSeconds(0);
            hDate.setMilliseconds(0);
            return hDate;
        case 'd': 
            periods = calculateDailyPeriods(referenceDate, timePeriod);
            break;
        case 'w': 
            periods = calculateWeeklyPeriods(referenceDate, timePeriod);
            break;
        case 'm':
            periods = calculateMonthlyPeriods(referenceDate, timePeriod);
            break;
        default:
            periods = [];
            break;
    }

    if (periods.length === 0) return undefined;
    return periods[0].start;
}