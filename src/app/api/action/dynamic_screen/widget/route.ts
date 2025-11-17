'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';
import { DynamicScreenWidgetDelete, DynamicScreenWidgetCreate, DynamicScreenWidgetUpdate } from "../types";

const origin = 'api/action/dynamic/screen/widget'

const query_get_user_config_text = `
    SELECT 
        dsuc.id, 
        dsuc.user_id,
        dsuc.name
    FROM dynamic_screen_user_config dsuc
    JOIN users u on u.id = dsuc.user_id
    WHERE u.name = $1
    AND dsuc.name = $2
`

const query_insert_user_config_text = `
    INSERT INTO dynamic_screen_user_config(user_id, name)
    SELECT 
        u.id, 
        $2
    FROM users u WHERE name = $1
    RETURNING id
`

const query_insert_user_widget_config_text = `
    INSERT INTO dynamic_screen_user_widget_config (dynamic_screen_config_id, widget_code, widget_id, config, is_visible)
    VALUES ($1, $2, $3, $4, TRUE)
`

const query_update_text = `
    UPDATE dynamic_screen_user_widget_config 
    SET config = $4
    WHERE id = (
        SELECT dsuwc.id 
        FROM dynamic_screen_user_widget_config dsuwc
        JOIN dynamic_screen_user_config dsuc ON dsuc.id = dsuwc.dynamic_screen_config_id
        JOIN users u on u.id = dsuc.user_id
        WHERE u.name = $1 AND dsuc.name = $2 AND dsuwc.widget_id = $3
    )
`

const query_delete_text = `
    DELETE FROM dynamic_screen_user_widget_config
    WHERE id = (
        SELECT dsuwc.id 
        FROM dynamic_screen_user_widget_config dsuwc
        JOIN dynamic_screen_user_config dsuc ON dsuc.id = dsuwc.dynamic_screen_config_id
        JOIN users u on u.id = dsuc.user_id
        WHERE u.name = $1 
        AND dsuc.name = $2
        AND dsuwc.widget_id = $3
    )
 `

// Creation of a widget
export async function POST(request: NextRequest) {

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    // Get the widget to create from the body and validate
    const create: DynamicScreenWidgetCreate = await request.json();
    const req_params = [
        { name: 'create.name', field: create.name },
        { name: 'create.widgetCode', field: create.widgetCode },
        { name: 'create.widgetName', field: create.widgetName },
        { name: 'create.widgetConfig', field: create.widgetConfig }
    ]
    for (var param of req_params) {
        if (!param.field) return ErrorCreators.param.bodyMissing(origin, param.name);
    }

    // Set up a connection and transactions
    let client;
    let transactionStarted = false;

    try {
        client = await db.pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;
        const userConfig = await client.query(query_get_user_config_text, [user.name, create.name]);
        // If no entry in the dynamic_screen_user_config we need to set one up.
        const screenConfigId = ((userConfig.rows.length === 0)) 
            ? (await client.query(query_insert_user_config_text, [user.name, create.name])).rows[0].id
            : userConfig.rows[0].id
        // Insert into dynamic_screen_user_widget_config
        await client.query(query_insert_user_widget_config_text, [
            screenConfigId,
            create.widgetCode,
            create.widgetCode + '-1',
            create.widgetConfig
        ])
        await client.query('COMMIT'); 
        return NextResponse.json( { success: true });
    } catch (error) {
        console.log('Error in create widget ' + error);
        if (client && transactionStarted) await client.query('ROLLBACK');
        return ErrorCreators.db.queryFailed(origin, 'delete widget', error as Error);        
    } finally {
        if (client) client.release();
    }
}

// Delete of a widget
export async function DELETE(request: NextRequest) {

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    // Get the screen and widget we need to remove and validate
    const del: DynamicScreenWidgetDelete = await request.json();
    const req_params = [
        { name: 'del.name', field: del.name },
        { name: 'del.description', field: del.widgetId }
    ]
    for (var param of req_params) {
        if (!param.field) return ErrorCreators.param.bodyMissing(origin, param.name);
    }

    try {
        await db.pool.query(query_delete_text, [user.name, del.name, del.widgetId]);
        return NextResponse.json({ 'success': true });
    } catch (error) {
        console.log('Error in delete widget ' + error);
        return ErrorCreators.db.queryFailed(origin, 'delete widget', error as Error);
    }
}

// Update widget configuration
export async function PUT(request: NextRequest) {
    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    // Get the widget update data from the body and validate
    const update: DynamicScreenWidgetUpdate = await request.json();
    const req_params = [
        { name: 'update.name', field: update.name },
        { name: 'update.widgetId', field: update.widgetId },
        { name: 'update.widgetConfig', field: update.widgetConfig }
    ]
    for (var param of req_params) {
        if (!param.field) return ErrorCreators.param.bodyMissing(origin, param.name);
    }

    try {
        await db.pool.query(query_update_text, [user.name, update.name, update.widgetId, update.widgetConfig]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.log('Error in update widget config ' + error);
        return ErrorCreators.db.queryFailed(origin, 'update widget config', error as Error);
    }
}