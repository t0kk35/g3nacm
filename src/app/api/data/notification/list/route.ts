'use server'

import { auth } from "@/auth";
import * as db from '@/db'
import { NextRequest, NextResponse } from "next/server";
import { NotificationList } from "../types";
import { ErrorCreators } from '@/lib/api-error-handling';
import { getStartDate } from "@/lib/date-time/date-range";

const origin = 'api/data/notification/list'

const query_text = `
SELECT
  id,
  sender_user_name,
  receiver_user_name,
  title,
  create_date_time,
  read_date_time
FROM notification n
WHERE n.receiver_user_name = $1
AND n.create_date_time >= $2
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
            const res:NotificationList[] = response.rows;
            return NextResponse.json(res);
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get user Notifications', error as Error);
        }
    }
}