CREATE TYPE wl_field_type AS ENUM ('text', 'textarea', 'hyperlink');

CREATE TABLE wl_list(
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE INDEX idx_wl_list ON wl_list(id);

CREATE TABLE wl_list_schema(
    id SERIAL PRIMARY KEY,
    version INTEGER NOT NULL,
    name TEXT NOT NULL,
    list_id INTEGER NOT NULL,
    CONSTRAINT fk_wl_list FOREIGN KEY (list_id) REFERENCES wl_list(id)
);

CREATE INDEX idx_wl_list_schema_id ON wl_list_schema(id);

CREATE TABLE wl_list_schema_entry(
    id SERIAL PRIMARY KEY,
    schema_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    field_type wl_field_type NOT NULL,
    display_rank INTEGER NOT NULL,
    display_label TEXT NOT NULL,
    CONSTRAINT fk_wl_schema_id FOREIGN KEY (schema_id) REFERENCES wl_list_schema(id)
);

CREATE INDEX idx_wl_list_schema_entry_id ON wl_list_schema_entry(id);

CREATE TABLE wl_list_entry(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_unit_code TEXT NOT NULL,
    schema_id INTEGER NOT NULL,
    row_id INTEGER NOT NULL,
    version INTEGER NOT NULL,
    create_date_time TIMESTAMP NOT NULL,
    data JSONB,
    CONSTRAINT fl_org_unit FOREIGN KEY (org_unit_code) REFERENCES org_unit(code),
    CONSTRAINT fk_wl_list_schema FOREIGN KEY (schema_id) REFERENCES wl_list_schema(id)
);

CREATE INDEX idx_wl_list_entry ON wl_list_entry(id);