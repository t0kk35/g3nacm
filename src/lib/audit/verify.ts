import { AuditData } from "./types";
import { computeAuditHash, computeHMAC } from "./crypto";
import { PoolClient } from "pg";
import { redirect } from "next/dist/server/api-utils";

export async function verifyAuditTrail(client: PoolClient) {
  const res = await client.query(`SELECT * FROM audit_log ORDER BY id ASC`);

  let prev = null;

  for (const row of res.rows) {
    const hashData: AuditData = {
        category: row.category,
        action: row.action,
        target_type: row.target_type
    }
    const expectedHash = computeAuditHash(row.user_name, hashData, row.prev_hash);
    const expectedHMAC = computeHMAC(expectedHash);

    if (row.prev_hash !== prev) return false;
    if (row.current_hash !== expectedHash) return false;
    if (row.hmac !== expectedHMAC) return false;

    prev = row.current_hash;
  }

  return true;
}
