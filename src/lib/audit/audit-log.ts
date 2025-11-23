import { PoolClient } from "pg";
import { AuditData } from "./types";
import { computeAuditHash } from "./crypto";
import { computeHMAC } from "./crypto";

const aquire_meta_lock = `
SELECT last_hash FROM audit_meta WHERE id = true FOR UPDATE 
` 

const update_meta = `
UPDATE audit_meta SET
    last_hash = $1,
    last_created_date_time = now()
WHERE id = true
`

const insert_audit_log = `
INSERT INTO audit_log(
    correlation_id,
    category,
    action,
    user_id,
    user_name,
    target_type,
    target_id_num,
    target_id_string,
    metadata,
    before_data,
    after_data,
    source,
    prev_hash,
    hash,
    hmac
) VALUES 
    ($1, $2, $3, 
    (SELECT id FROM users WHERE name=$4),
    $4, $5, $6, $7, $8, $9, $10, 
    'nodejs-server',
    $11, $12, $13) 
`

/**
 * Main Audit Log function. This can be called to create an Audit Entry.
 * We don't do error handling here, we'll assume the calling application has a catch block.
 * 
 * @param client Database client (must be within a transaction)
 * @param userName The name of the user (in string format). Can be retreived from the auth session.
 * @param data Object containing the data to be logged.
 */
export async function createAuditEntry(client: PoolClient, userName: string, data: AuditData) {
    // First get a lock and the previous hash. 
    const previous_hash_query = {
        name: 'audit.client.lock.meta',
        text: aquire_meta_lock,
        values:[]        
    }
    const res = (await client.query(previous_hash_query))
    const previousHash = res.rows[0].last_hash

    const newHash = computeAuditHash(userName, data, previousHash)
    const hmac = computeHMAC(newHash)

    // Insert the log line
    const insert_query = {
        name: 'audit.client.insert.log',
        text: insert_audit_log,
        values: [
            data.correlation_id, data.category, data.action, 
            userName, data.target_type, data.target_id_num, data.target_id_string, 
            data.metadata, data.before_data, data.after_data,
            previousHash, newHash, hmac
        ]
    };
    await client.query(insert_query);

    // Update last hash in meta table
    const update_meta_query = {
        name: 'audit.client.update.meta',
        text: update_meta,
        values: [
            newHash
        ]
    }
    await client.query(update_meta_query);
}