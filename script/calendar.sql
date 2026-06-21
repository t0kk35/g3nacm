CREATE TYPE event_type AS ENUM (
    'task',
    'reminder',
);

CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type event_type NOT NULL,
    assign_user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_date_time TIMESTAMPTZ,
    end_date_time TIMESTAMPTZ,
    all_day BOOLEAN DEFAULT FALSE,
    location TEXT,
    status TEXT DEFAULT 'active',
    create_user_id INTEGER,
    create_date_time TIMESTAMPTZ DEFAULT now(),
    update_date_time TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT fk_assign_user FOREIGN KEY (assign_user_id) REFERENCES users(id),
    CONSTRAINT fk_create_user FOREIGN KEY (create_user_id) REFERENCES users(id)
);

CREATE INDEX idx_calendar_events_assign on calendar_events(assign_user_id);

--CREATE TABLE task_details (
--    event_id UUID PRIMARY KEY REFERENCES calendar_events(id),
--    due_at TIMESTAMPTZ,
--    completed BOOLEAN DEFAULT FALSE,
--    completed_at TIMESTAMPTZ,
--    priority SMALLINT DEFAULT 3
--);

--CREATE TABLE recurrence_rules (
--    event_id UUID PRIMARY KEY REFERENCES calendar_events(id),
--
--    frequency TEXT NOT NULL,
--    interval INTEGER DEFAULT 1,
--
--    by_day TEXT[],
--    by_month_day INTEGER[],
--
--    until_at TIMESTAMPTZ,
--
--    occurrence_count INTEGER
);

--CREATE TABLE event_reminders (
--    id UUID PRIMARY KEY,

--    event_id UUID NOT NULL REFERENCES calendar_events(id),

--    minutes_before INTEGER NOT NULL,

--    method TEXT NOT NULL
--);