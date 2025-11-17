CREATE TABLE org_unit (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    parent_id INTEGER, 
    path TEXT NOT NULL UNIQUE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_parent_id FOREIGN KEY (parent_id) REFERENCES org_unit(id) ON DELETE CASCADE
);

CREATE INDEX idx_ou_id on org_unit(id);
CREATE INDEX idx_ou_code on org_unit(code);
CREATE INDEX idx_path_prefix ON org_unit(path text_pattern_ops);

CREATE TABLE org_unit_user_access (
    user_id INTEGER NOT NULL,
    org_unit_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, org_unit_id),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_org_unit FOREIGN KEY (org_unit_id) REFERENCES org_unit(id) ON DELETE CASCADE
);

CREATE INDEX idx_oua_user_id on org_unit_user_access(user_id);
CREATE INDEX idx_oua_org_id on org_unit_user_access(org_unit_id);