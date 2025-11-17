'use server'

import { auth } from '@/auth';
import * as db from '@/db'
import { NextRequest, NextResponse } from 'next/server';
import { RequestEntityLock, ResponseEntityLock } from '../entity_locking';
import { ErrorCreators } from '@/lib/api-error-handling';

const origin = 'api/action/entity/lock'

const query_insert_lock = `
INSERT INTO workflow_entity_lock (entity_code, entity_id, lock_user_name, lock_date_time)
VALUES ($2, $3, $1, NOW())
ON CONFLICT (entity_code, entity_id)
DO UPDATE
  SET 
    lock_user_name = EXCLUDED.lock_user_name,
    lock_date_time = NOW()
  WHERE workflow_entity_lock.lock_user_name = $1
  OR (NOW() - workflow_entity_lock.lock_date_time) > INTERVAL '30 minutes'
RETURNING 
  entity_code,
  entity_id,
  lock_user_name,
  lock_date_time
`

const query_current_lock_holder = `
SELECT lock_user_name 
FROM workflow_entity_lock
WHERE entity_code = $1 AND entity_id = $2
`

const query_insert_history = `
INSERT INTO workflow_entity_lock_log (
  entity_code, 
  entity_id,
  lock_user_name,
  lock_date_time,
  lock_action
) 
VALUES ($2, $3, $1, $4, 'aquire')
`

const query_lock_timing = `
SELECT  
    ROUND(SUM(EXTRACT(EPOCH FROM well.release_date_time - well.lock_date_time))) AS lock_time 
    FROM workflow_entity_lock_log well
WHERE entity_code = $2 AND entity_id = $3 AND lock_user_name = $1 AND lock_action = 'release'
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
    }

    // Set up a connection and start main logic
    let client;
    let transactionStarted = false;
    try {
        client = await db.pool.connect();     
        await client.query('BEGIN');
        transactionStarted = true;
        const il_query = {
            name: 'api_entity_lock_insert_lock',
            text: query_insert_lock,
            values:[requestLock.userName, requestLock.entityCode, requestLock.entityId]
        }
        const entity = await client.query(il_query);
        
        // If the return of the upsert is 0 then the lock was not acquired. Need to get the current holder and return
        if (entity.rows.length === 0) {
            const ch_query = {
                name: 'api_entity_current_lock_holder',
                text: query_current_lock_holder,
                values:[requestLock.entityCode, requestLock.entityId]
            }
            const holder = await client.query(ch_query);
            // Return fail and the current holder
            const res:ResponseEntityLock = {
                success: false,
                data: {
                    userName: holder.rows[0].lock_user_name,
                    totalTimeSpent: 0
                }
            } 
            await client.query('ROLLBACK');
            return NextResponse.json(res);
        }
        else {
            // If we get here the lock was obtained. Write an audit lock_log entry.
            const ll_query = {
                name: 'api_entity_lock_insert_lock_log',
                text: query_insert_history,
                values: [
                    entity.rows[0].lock_user_name, 
                    entity.rows[0].entity_code, 
                    entity.rows[0].entity_id,
                    entity.rows[0].lock_date_time
                ]
            };
            // Commit, so others can also lock.
            await client.query(ll_query);
            await client.query('COMMIT');
        
            // Now still need to get the timing info
            const lt_query = {
                name: 'api_entity_lock_timing',
                text: query_lock_timing,
                values: [requestLock.userName, requestLock.entityCode, requestLock.entityId]
            };
            const timing = await client.query(lt_query); 
            const totalTimeSpent: number = (timing.rows.length !== 0) ?  Number(timing.rows[0].lock_time) : 0
            // Return success 
            const res:ResponseEntityLock = {
                success: true,
                data: {
                    userName: requestLock.userName,
                    totalTimeSpent: totalTimeSpent
                }
            }
            return NextResponse.json(res);
        }
    } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        console.error('Error locking entity:', error);
        return ErrorCreators.db.queryFailed(origin, 'Locking Entity', error as Error);
      } finally {
          if (client) client.release();
      }
};
