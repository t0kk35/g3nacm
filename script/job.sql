CREATE TYPE job_status_type AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');

CREATE TABLE job (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type          TEXT NOT NULL,
    status            job_status_type NOT NULL DEFAULT 'pending',
    priority          SMALLINT NOT NULL DEFAULT 2,
    -- 1=HIGH 2=NORMAL 3=LOW 4=BACKGROUND
    payload           JSONB NOT NULL DEFAULT '{}',
    result            JSONB,
    error_message     TEXT,
    user_name         TEXT NOT NULL,
    org_unit_code     TEXT,
    create_datetime   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    start_datetime    TIMESTAMPTZ,
    complete_datetime TIMESTAMPTZ,
    queue_job_id      TEXT,
    retry_count       INT NOT NULL DEFAULT 0,
    max_retries       INT NOT NULL DEFAULT 3,
    metadata          JSONB DEFAULT '{}'
);

CREATE INDEX idx_job_status           ON job(status);
CREATE INDEX idx_job_type             ON job(job_type);
CREATE INDEX idx_job_user             ON job(user_name);
CREATE INDEX idx_job_priority         ON job(priority);
CREATE INDEX idx_job_create_datetime ON job(create_datetime DESC);