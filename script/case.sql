CREATE TYPE case_priority AS ENUM ('High', 'Medium', 'Low');

CREATE TABLE case (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    org_unit_code TEXT NOT NULL,
    entity_code TEXT NOT NULL,
    create_date_time TIMESTAMP NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    priority case_priority NOT NULL,
    CONSTRAINT fk_org_unit FOREIGN KEY (org_unit_code) REFERENCES org_unit(code),
    CONSTRAINT fk_entity_code FOREIGN KEY (entity_code) REFERENCES workflow_entity(code)
);

CREATE INDEX idx_case_id ON case(id);

CREATE TABLE case_entity (
    entity_type TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL
)

CREATE INDEX idx_case_entity_id ON case_entity(entity_type);

CREATE TABLE case_link(
    link_type TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    CONSTRAINT fk_case_entity FOREIGN KEY (entity_type) REFERENCES case_entity(entity_type)
);

CREATE INDEX idx_case_link_link_type ON case_link(link_type);
CREATE INDEX idx_case_link_entity_type ON case_link(entity_type);

CREATE TABLE case_entity_link (
    case_id UUID NOT NULL,
    entity_type TEXT NOT NULL,
    link_type TEXT NOT NULL,
    link_id UUID NOT NULL,
    data_time TIMESTAMP NOT NULL,
    PRIMARY KEY (case_id, entity_type, link_id),
    CONSTRAINT fk_case_id FOREIGN KEY (case_id) REFERENCES cases(id),
    CONSTRAINT fk_entity_type FOREIGN KEY (entity_type) REFERENCES case_entity(entity_type)
);

CREATE INDEX idx_case_entity_link_case_id ON case_entity_link(case_id);
CREATE INDEX idx_case_entity_link_link_id ON case_entity_link(link_id);

CREATE TABLE case_entity_link_history (
    case_id UUID NOT NULL,
    entity_type TEXT NOT NULL,
    link_type TEXT NOT NULL,
    link_id UUID NOT NULL,
    from_date TIMESTAMP NOT NULL,
    to_date TIMESTAMP NOT NULL,
    PRIMARY KEY (case_id, entity_type, link_id, from_date),
    CONSTRAINT fk_case_id FOREIGN KEY (case_id) REFERENCES cases(id),
    CONSTRAINT fk_entity_type FOREIGN KEY (entity_type) REFERENCES case_entity(entity_type)
);

CREATE INDEX idx_case_entity_link_history_case_id ON case_entity_link_history(case_id);
CREATE INDEX idx_case_entity_link_history_link_id ON case_entity_link_history(link_id);