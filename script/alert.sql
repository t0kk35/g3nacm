CREATE TABLE alert_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Single schema-less detection table replacing the old per-type tables.
-- detection_data holds all type-specific fields as JSONB.
-- schema_version tracks the data shape — bump it for breaking changes (field renames/restructuring).
-- Additive changes (new fields) do not require a version bump.
CREATE TABLE alert_detection (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id         UUID NOT NULL,
    detection_data   JSONB NOT NULL,
    schema_version   VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    create_datetime  TIMESTAMPTZ DEFAULT NOW(),
    update_datetime  TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_alert_base FOREIGN KEY (alert_id) REFERENCES alert_base(id)
);

CREATE INDEX idx_alert_detection_alert_id ON alert_detection(alert_id);
