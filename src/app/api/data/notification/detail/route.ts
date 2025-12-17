'use server'

import { auth } from "@/auth";
import * as db from '@/db'
import { NextRequest, NextResponse } from "next/server";
import { NotificationDetail } from "../types";
import { ErrorCreators } from '@/lib/api-error-handling';

const origin = 'api/data/notification/detail'

const query_text = `
SELECT
  n.id,
  n.sender_user_name,
  n.receiver_user_name,
  n.linked_entity_id,
  n.linked_entity_code,
  we.description AS "linked_entity_description",
  we.display_url AS "linked_entity_display_url",
  n.title,
  n.body,
  n.metadata,
  n.create_date_time,
  n.read_date_time
FROM notification n 
LEFT JOIN workflow_entity we ON n.linked_entity_code = we.code
WHERE n.id = $2
AND (
  n.sender_user_name = $1 OR
  n.receiver_user_name = $1
)
`

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    // We need an notification_id param.
    const searchParams = request.nextUrl.searchParams;
    const notificationId = searchParams.get("notification_id");
    if (!notificationId) return ErrorCreators.param.urlMissing(origin, 'notification_id');

    if (!useMockData) {
        const query = {
            name: origin,
            text: query_text,
            values: [user.name, notificationId]
        };    

        try {
            const response = await db.pool.query(query);
            if (response.rows.length === 0) return ErrorCreators.db.entityNotFound(origin, 'notification', notificationId);
            if (response.rows.length > 1) return ErrorCreators.db.entityNotUnique(origin, 'notification', notificationId);
            const res:NotificationDetail = response.rows[0];  
            return NextResponse.json(res);          
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get user Notifications', error as Error);
        }
    }
}