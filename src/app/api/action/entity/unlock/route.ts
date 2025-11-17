'use server'

import { auth } from '@/auth';
import * as db from '@/db'
import { NextRequest, NextResponse } from 'next/server';
import { RequestEntityLock } from '../entity_locking';
import { ErrorCreators } from '@/lib/api-error-handling';

const origin = 'api/action/entity/unlock'

const query_delete_lock = `
DELETE FROM workflow_entity_lock
WHERE entity_id = $3 AND entity_code = $2 AND lock_user_name = $1
RETURNING 
  entity_code,
  entity_id,
  lock_user_name,
  lock_date_time
`

const query_insert_history = `
INSERT INTO workflow_entity_lock_log (
  entity_code, 
  entity_id,
  lock_user_name,
  lock_date_time,
  lock_action,
  release_date_time
) 
VALUES ($2, $3, $1, $4, 'release', NOW())
`

export async function POST(req: NextRequest) {

    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    // Get Lock Request and validate
    const requestLock: RequestEntityLock = await req.json();
    const params = [
        {name: 'entityCode', field:requestLock.entityCode},
        {name: 'entityId', field: requestLock.entityId},
        {name: 'userName', field: requestLock.userName}
    ];
    for (const param of params) {
        if (!param.field) return ErrorCreators.param.bodyMissing(origin, param.name);
    };

    // Set up a connection and start main logic
    let client;
    let transactionStarted = false;
    try {
        client = await db.pool.connect();     
        await client.query('BEGIN');
        transactionStarted = true;
        const dl_query = {
            name: 'api_entity_unlock_delete_lock',
            text: query_delete_lock,
            values:[requestLock.userName, requestLock.entityCode, requestLock.entityId]
        }
        const entity = await client.query(dl_query);
        // If the return of the delete is 0 rows then no lock was found.
        if (entity.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({result: { success: false }});
        }
        else {
            // Update the lock_log
            const ll_query = {
                name: 'api_entity_unlock_insert_lock_log',
                text: query_insert_history,
                values:[
                    entity.rows[0].lock_user_name,
                    entity.rows[0].entity_code,
                    entity.rows[0].entity_id,
                    entity.rows[0].lock_date_time
                ]
            };
            await client.query(ll_query);
            await client.query('COMMIT');
            return NextResponse.json({result: {success: true}});
        };
      } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        console.error('Error locking entity:', error);
        return ErrorCreators.db.queryFailed(origin, 'Unlocking Entity', error as Error);
      } finally {
          if (client) client.release();
      };
};