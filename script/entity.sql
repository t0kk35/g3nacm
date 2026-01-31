CREATE TABLE workflow_entity (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  display_url TEXT
);

CREATE INDEX idx_we_code on workflow_entity(code);

CREATE TABLE workflow_entity_summary (
  entity_id UUID PRIMARY KEY,
  entity_code TEXT NOT NULL,
  summary TEXT NOT NULL,
  create_date_time TIMESTAMPTZ DEFAULT now(),
  update_date_time TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_workflow_entity FOREIGN KEY (entity_code) REFERENCES workflow_entity(code)
);

CREATE INDEX idx_wes_id_code on workflow_entity_summary(entity_id, entity_code);