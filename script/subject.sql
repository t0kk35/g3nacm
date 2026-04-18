-- ============================================================
-- Subject schema v2 — config-driven JSONB profile model
--
-- New types are added by inserting a row into subject_type_config.
-- No DDL changes are required for new subject types.
--
-- ── address ──────────────────────────────────────────────────────────────────
-- Unchanged: shared relational table used across all subject types.

CREATE TABLE address (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    street      TEXT NOT NULL,
    number      TEXT NOT NULL,
    city        TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country     TEXT NOT NULL
);

CREATE INDEX idx_a_id ON address(id);

-- ── subject_type_config ───────────────────────────────────────────────────────
-- Config-driven type registry. Insert a row here to add a new subject type.
-- To retire a type, set is_active = FALSE — do not delete, as existing rows
-- in subject_base still reference the code.

CREATE TABLE subject_type_config (
    code           TEXT PRIMARY KEY,
    display_name   TEXT NOT NULL,
    description    TEXT,
    is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stc_code ON subject_type_config(code);

INSERT INTO subject_type_config (code, display_name, description) VALUES
    ('IND', 'Individual', 'A natural person'),
    ('CRP', 'Corporate',  'A legal / corporate entity');

-- ── subject_base ──────────────────────────────────────────────────────────────
-- Core relational fields common to all subject types.

CREATE TABLE subject_base (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_type     TEXT        NOT NULL,
    version          NUMERIC     NOT NULL,
    identifier       TEXT        NOT NULL,
    org_unit_code    TEXT        NOT NULL,
    segment          TEXT        NOT NULL,
    status           TEXT        NOT NULL,
    name             TEXT        NOT NULL,
    mail             TEXT,
    phone            TEXT,
    acquisition_date TIMESTAMP,
    address_id       UUID,
    CONSTRAINT fk_subject_type FOREIGN KEY (subject_type) REFERENCES subject_type_config(code),
    CONSTRAINT fk_org_unit     FOREIGN KEY (org_unit_code) REFERENCES org_unit(code),
    CONSTRAINT fk_address      FOREIGN KEY (address_id)    REFERENCES address(id)
);

CREATE INDEX idx_bs_id         ON subject_base(id);
CREATE INDEX idx_bs_identifier ON subject_base(identifier);
-- Composite index for peer comparison lookups
-- Covers: org_unit_code, segment, subject_type
CREATE INDEX idx_subject_base_peer_lookup ON subject_base(org_unit_code, segment, subject_type);

-- ── subject_base_history ──────────────────────────────────────────────────────
-- Temporal history of subject_base. PK is (id, version).

CREATE TABLE subject_base_history (
    date_from        TIMESTAMP,
    date_to          TIMESTAMP,
    id               UUID    NOT NULL,
    subject_type     TEXT    NOT NULL,
    version          NUMERIC NOT NULL,
    identifier       TEXT    NOT NULL,
    org_unit_code    TEXT    NOT NULL,
    segment          TEXT    NOT NULL,
    status           TEXT    NOT NULL,
    name             TEXT    NOT NULL,
    mail             TEXT,
    phone            TEXT,
    acquisition_date TIMESTAMP,
    address_id       UUID,
    PRIMARY KEY (id, version),
    CONSTRAINT fk_subject_base FOREIGN KEY (id)            REFERENCES subject_base(id),
    CONSTRAINT fk_org_unit     FOREIGN KEY (org_unit_code) REFERENCES org_unit(code),
    CONSTRAINT fk_address      FOREIGN KEY (address_id)    REFERENCES address(id)
);

CREATE INDEX idx_bsh_id ON subject_base_history(id);

-- ── subject_detail ────────────────────────────────────────────────────────────
-- Type-specific fields stored as JSONB. Replaces subject_individual and subject_corporate.
-- schema_version tracks the data shape — bump for breaking field changes.
--
-- IND example fields: gender, first_name, last_name, middle_name, date_of_birth,
--                     profession, employment_status, nationality, residence, kyc_risk
-- CRP example fields: incorporation_date, incorporation_country, incorporation_type,
--                     registration_number, segment, tax_number, kyc_risk
CREATE TABLE subject_detail (
    id              UUID        PRIMARY KEY,
    version         NUMERIC     NOT NULL,
    detail_data     JSONB       NOT NULL DEFAULT '{}',
    schema_version  VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    create_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    update_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_subject_base FOREIGN KEY (id) REFERENCES subject_base(id)
);

CREATE INDEX idx_sd_id          ON subject_detail(id);
-- GIN index supports JSONB field-level queries (e.g. WHERE detail_data->>'nationality' = 'DE')
CREATE INDEX idx_sd_detail_data ON subject_detail USING GIN (detail_data);

-- ── subject_detail_history ────────────────────────────────────────────────────
-- Temporal history of type-specific data. Replaces subject_individual_history
-- and subject_corporate_history. PK is (id, version) matching subject_base_history.

CREATE TABLE subject_detail_history (
    id             UUID        NOT NULL,
    version        NUMERIC     NOT NULL,
    detail_data    JSONB       NOT NULL DEFAULT '{}',
    schema_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    PRIMARY KEY (id, version),
    CONSTRAINT fk_subject_base_history FOREIGN KEY (id, version) REFERENCES subject_base_history(id, version)
);

CREATE INDEX idx_sdh_id ON subject_detail_history(id);