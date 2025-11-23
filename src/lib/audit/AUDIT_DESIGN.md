# Design summary (short)

There are various ways to design a audit log. Making sure we commit in the same transactions as the business data and get anti-tamper mechanisms is a trade-off. Either we do the anti-tamper in full real-time and intruduce a locking mechanism, or we use a mail-box implementation with a worker that moves the data from a temporary table to the audit and calculates the hashes but is not fully real time. 

At present we assume we will not create a massive amount of audit log, and will use option 1. I.e a locking in order to serialise

1. The audit trails are created in the same transactions as the business data.
2. When the audit is created a lock will be acquired. The audit_meta table will be used for locking.
3. When the lock is aquired an anti-tamper hash is calculated, the audit_log is written.
4. The anti-tamper is a hash-chain + HMAC.

Note that the lock is held for the length of the transaction.

## Audit log function

### Preventing race conditions and ensuring consistent prev_hash chain

In order to have a consistent anti-tamper the order in which we insert must be strictly controlled. If multiple workers/servers might append concurrently, we need a simple serialization for chain order:

Use the audit_meta row as a lock: SELECT last_hash FROM audit_meta FOR UPDATE inside the worker TX, compute new hash with that last_hash, insert into audit_log, then UPDATE audit_meta SET last_hash = <new_hash>, last_recorded_at = now(). The FOR UPDATE lock serializes appenders.

### Anti-tamper details (practical)

1. Chain hashing: store prev_hash and hash computed over canonicalized fields. Any change to any previous row invalidates hashes downstream.

2. HMAC/signature: We compute an HMAC over the hash and store hmac with the record. An attacker with DB access who tries to change both hash and hmac would need the KMS key. The HMAC secret is located server-side in the env.local by default. A KMS might be a future improvement.

3. Immutable DB protections: triggers forbidding UPDATE/DELETE, RBAC so only the worker can INSERT, and DB admins limited. For stronger guarantee, replicate audit_log to a secondary read-only DB or S3 logs (e.g., periodic export) or append anchors externally.

4. Anchoring: periodically (e.g., daily) compute a merkle root or last hash and publish that externally: push to an external service, write to an S3 object with versioning, or record in a public timestamping service. This provides proof even if DB is compromised later.

5. WAL / backups: ensure WAL archiving is enabled and backups are managed; this helps for forensic restore.