CREATE TYPE tf_message_store_type AS ENUM ('xml');

CREATE TABLE tf_message_base(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submit_date_time TIMESTAMP NOT NULL,
    identifier TEXT NOT NULL,
    org_unit_code TEXT NOT NULL,
    direction TEXT NOT NULL ----
    sender TEXT NOT NULL,
    receiver TEXT NOT NULL,
    message_type TEXT NOT NULL,
    message_store_type tf_message_store_type NOT NULL,
    amount NUMERIC(12, 2),
    currency TEXT,
    CONSTRAINT fk_org_unit FOREIGN KEY (org_unit_code) REFERENCES org_unit(code)    
);

CREATE INDEX idx_tf_message_id on tf_message_base(id);

CREATE TABLE tf_message_xml(
    tf_message_id UUID PRIMARY KEY,
    message XML NOT NULL,
    CONSTRAINT fk_tf_message_base FOREIGN KEY (tf_message_id) REFERENCES tf_message_base(id)
);

CREATE INDEX idx_tf_message_xml_id on tf_message_xml(tf_message_id);