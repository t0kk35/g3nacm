CREATE TABLE notification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_user_id INTEGER NOT NULL,
    receiver_user_id INTEGER NOT NULL,
    sender_user_name TEXT NOT NULL,
    receiver_user_name TEXT NOT NULL,
    linked_entity_id UUID,
    linked_entity_code TEXT,
    title TEXT NOT NULL,
    body TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    create_date_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_date_time TIMESTAMPTZ,
    CONSTRAINT fk_sender FOREIGN KEY (sender_user_id) REFERENCES users(id),
    CONSTRAINT fk_receiver FOREIGN KEY (receiver_user_id) REFERENCES users(id),
    CONSTRAINT fk_entity_code FOREIGN KEY (linked_entity_code) REFERENCES workflow_entity(code)
);

CREATE INDEX idx_notifications_recipient_created ON notification (receiver_user_name, create_date_time DESC);