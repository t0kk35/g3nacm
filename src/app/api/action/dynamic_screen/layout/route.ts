'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';
import { DynamicScreenLayoutUpdate } from "../types";

const origin = 'api/action/dynamic_screen/layout'

const query_text = `
UPDATE dynamic_screen_user_config
SET 
  layout = $3::jsonb,
  updated_at = CURRENT_TIMESTAMP
FROM users us 
WHERE
  us.id = dynamic_screen_user_config.user_id 
  AND us.name = $1 
  AND dynamic_screen_user_config.name = $2
`

// Creation of a widget
export async function POST(request: NextRequest) {

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    // Get layout update and validate
    const update: DynamicScreenLayoutUpdate = await request.json();
    const req_params = [
        { name: 'update.name', field: update.name },
        { name: 'update.layout', field: update.layout }
    ]
    for (var param of req_params) {
        if (!param.field) return ErrorCreators.param.bodyMissing(origin, param.name);
    }

    // Convert responsive layouts object to JSON string
    const jsonParam = JSON.stringify(update.layout);
    try {
        await db.pool.query(query_text, [user.name, update.name, jsonParam]);
        return NextResponse.json({ 'success': true });
    } catch(error) {
        console.log('Error ' + error)
        return ErrorCreators.db.queryFailed(origin, 'Update responsive layouts', error as Error); 
    }
}