CREATE TYPE eval_condition_type AS ENUM ('atomic', 'group');
CREATE TYPE eval_operator AS ENUM ('AND', 'OR', 'equals', 'notEquals', 'greaterThan', 'lessThan', 'includes');
CREATE TYPE eval_field_type AS ENUM ('string', 'number', 'boolean', 'array', 'object', 'date');

CREATE TABLE eval_rule (
    id SERIAL PRIMARY KEY,
    rule_group TEXT NOT NULL,
    rank INTEGER NOT NULL,
    input_schema_id TEXT,
    output TEXT NOT NULL,
    CONSTRAINT fk_eval_rule_schema FOREIGN KEY (input_schema_id) REFERENCES eval_input_schema(id) ON DELETE SET NULL
);

CREATE INDEX idx_er_group on eval_rule(rule_group);

CREATE TABLE eval_condition (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER NOT NULL,
    parent_id INTEGER,
    type eval_condition_type NOT NULL,
    operator eval_operator NOT NULL,    
    negate BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_eval_rules FOREIGN KEY (rule_id) REFERENCES eval_rule(id),
    CONSTRAINT fk_eval_condition FOREIGN KEY (parent_id) REFERENCES eval_condition(id)
);

CREATE INDEX idx_ec_id ON eval_condition(id);
CREATE INDEX idx_ec_p_id ON eval_condition(parent_id);
CREATE INDEX idx_ec_r_id ON eval_condition(rule_id);


CREATE TABLE eval_atomic_condition (
    condition_id INTEGER PRIMARY KEY,
    field TEXT NOT NULL,
    value JSONB NOT NULL,
    CONSTRAINT fk_eval_rules FOREIGN KEY (condition_id) REFERENCES eval_condition(id)
);

CREATE INDEX idx_eac_cid ON eval_atomic_condition(condition_id);

CREATE TABLE eval_input_schema (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_eis_name ON eval_input_schema(name);

CREATE TABLE eval_schema_field (
    id SERIAL PRIMARY KEY,
    schema_id TEXT NOT NULL,
    field_path TEXT NOT NULL,        -- dot notation path like 'person.age'
    field_type eval_field_type NOT NULL,
    description TEXT,
    required BOOLEAN DEFAULT FALSE,
    array_item_type eval_field_type, -- for array fields
    validation_config JSONB,         -- {min: 0, max: 100, pattern: "regex", enum: ["A","B"]}
    CONSTRAINT fk_schema FOREIGN KEY (schema_id) REFERENCES eval_input_schema(id) ON DELETE CASCADE
);

CREATE INDEX idx_esf_schema_id ON eval_schema_field(schema_id);
CREATE INDEX idx_esf_field_path ON eval_schema_field(field_path);