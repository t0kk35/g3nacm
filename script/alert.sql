CREATE TYPE alert_type AS ENUM ('TM', 'NS', 'TF', 'CDD');
CREATE TYPE tm_detection_timeframe AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

CREATE TABLE alert_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type alert_type NOT NULL,
    alert_identifier TEXT NOT NULL,
    org_unit_code TEXT NOT NULL,
    entity_code TEXT NOT NULL,
    create_date_time TIMESTAMP,
    description TEXT,
    CONSTRAINT fk_org_unit FOREIGN KEY (org_unit_code) REFERENCES org_unit(code),
    CONSTRAINT fk_entity_type FOREIGN KEY (entity_code) REFERENCES workflow_entity(code)
);

CREATE INDEX idx_ab_id on alert_base(id);

CREATE TABLE alert_item (
    alert_id UUID NOT NULL,
    item_id UUID NOT NULL,
    item_identifier TEXT NOT NULL,
    item_type TEXT NOT NULL,
    item_details JSONB NOT NULL,
    PRIMARY KEY (alert_id, item_id, item_type),
    CONSTRAINT fk_alert_base FOREIGN KEY (alert_id) REFERENCES alert_base(id)
);

CREATE INDEX idx_ai_alert_id on alert_item(alert_id);

CREATE TABLE alert_tm_detection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL,
    model_id TEXT NOT NULL,
    name TEXT NOT NULL,
    info TEXT NOT NULL,
    score NUMERIC NOT NULL,
    time_frame tm_detection_timeframe NOT NULL,
    CONSTRAINT fk_alert_base FOREIGN KEY (alert_id) REFERENCES alert_base(id)
);

CREATE INDEX idx_atd_alert_id on alert_tm_detection(alert_id);

CREATE TABLE alert_ns_detection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL,
    input_data TEXT NOT NULL,
    list_name TEXT NOT NULL,
    list_uid TEXT NOT NULL,
    list_data TEXT NOT NULL,
    algorithm TEXT NOT NULL,
    score TEXT NOT NULL,
    CONSTRAINT fk_alert_base FOREIGN KEY (alert_id) REFERENCES alert_base(id)
);

CREATE INDEX idx_ns_alert_id on alert_ns_detection(alert_id);

CREATE TABLE alert_tf_detection(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL,
    wl_list_entry_id UUID NOT NULL,
    tf_message_id UUID NOT NULL,
    tf_transaction_id TEXT NOT NULL,
    tf_participant_role TEXT NOT NULL,
    input_data TEXT NOT NULL,
    list_data TEXT NOT NULL,
    algorithm TEXT NOT NULL,
    score TEXT NOT NULL,
    CONSTRAINT fk_alert_base FOREIGN KEY (alert_id) REFERENCES alert_base(id),
    CONSTRAINT fk_wl_list_entry FOREIGN KEY (wl_list_entry_id) REFERENCES wl_list_entry(id),
    CONSTRAINT fk_tf_message FOREIGN KEY (tf_message_id) REFERENCES tf_message_base(id)
);

CREATE INDEX idx_tf_detection_id on alert_tf_detection(id);
CREATE INDEX idx_tf_detection_alert_id on alert_tf_detection(alert_id);
