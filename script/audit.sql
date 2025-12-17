-- Main audit log: append-only, immutable via trigger
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_date_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  correlation_id UUID NULL,     -- For grouping events triggered by a single action.
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  user_name TEXT NOT NULL,
  target_type TEXT NULL,        -- Type of data that was audit logged
  target_id_num INTEGER NULL,   -- A unique numerical id for the record that was logged
  target_id_string TEXT NULL,   -- A unique string id for the record that was logged
  metadata JSONB,               -- extra event info (e.g. login failure reason)
  before_data JSONB,           -- snapshot before update (optional)
  after_data JSONB,            -- snapshot after update (optional)
  source TEXT NULL,             -- e.g. "api-server-1"
  prev_hash TEXT NULL,          -- hex SHA256 of previous audit_log row
  hash TEXT NOT NULL,           -- hex SHA256 of this row's canonical data
  hmac TEXT NULL                -- optional HMAC/signature computed with server key
);

-- Index for Rate limiting check
CREATE INDEX idx_audit_log_rl ON audit_log(category, action, user_name, recorded_date_time);

-- Minimal meta row for chain locking
CREATE TABLE audit_meta (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  last_hash TEXT NULL,
  last_created_date_time TIMESTAMPTZ NULL
);

INSERT INTO audit_meta (id, last_hash, last_created_date_time) VALUES (true, 'start', now())
  ON CONFLICT (id) DO NOTHING;

-- Make the audit_log table immutable.
CREATE OR REPLACE FUNCTION audit_no_modif() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_no_modif_trigger
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION audit_no_modif();