CREATE TABLE workflow_entity (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL
);

CREATE INDEX idx_we_code on workflow_entity(code);