CREATE TABLE USER_TASK (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    create_user_id SERIAL NOT NULL,
    create_date_time SERIAL NOT NULL,
    title TEXT NOT NULL,
    date TIMESTAMP NOT NULL,
    due_date TIMESTAMP,
    duration: NUMERIC,
    priority: NUMERIC,
    CONSTRAINT fk_user FOREIGN KEY (USER_ID) REFERENCES users(id)
)

CREATE INDEX idx_ut_uid ON USER_TASK(create_user_id)