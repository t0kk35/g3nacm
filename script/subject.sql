CREATE TYPE subject_type AS ENUM ('IND', 'CRP');

CREATE TABLE address (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    street TEXT NOT NULL,
    number TEXT NOT NULL,
    city TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL
);

CREATE INDEX idx_a_id on address(id);

CREATE TABLE subject_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_type subject_type NOT NULL,
    version NUMERIC NOT NULL,
    identifier TEXT NOT NULL,
    org_unit_code TEXT NOT NULL,
    segment TEXT NOT NULL,
    status TEXT NOT NULL,
    name TEXT NOT NULL,
    mail TEXT,
    phone TEXT,
    kyc_risk TEXT,
    acquisition_date TIMESTAMP,
    address_id UUID,
    CONSTRAINT fk_org_unit FOREIGN KEY (org_unit_code) REFERENCES org_unit(code),
    CONSTRAINT fk_address FOREIGN KEY (address_id) REFERENCES address(id)
);

CREATE INDEX idx_bs_id on subject_base(id);
-- Composite index for peer comparison lookups
-- Covers: org_unit_code, segment, subject_type
-- This makes "SELECT id FROM subject_base WHERE org_unit_code = X AND segment = Y AND subject_type = Z" extremely fast
CREATE INDEX idx_subject_base_peer_lookup ON subject_base(org_unit_code, segment, subject_type);

CREATE TABLE subject_base_history (
    date_from TIMESTAMP,
    date_to TIMESTAMP,
    id UUID NOT NULL,
    subject_type subject_type NOT NULL,
    version NUMERIC NOT NULL,
    identifier TEXT NOT NULL,
    org_unit_code TEXT NOT NULL,
    segment TEXT NOT NULL,
    status TEXT NOT NULL,
    name TEXT NOT NULL,
    mail TEXT,
    phone TEXT,
    kyc_risk TEXT,
    acquisition_date TIMESTAMP,
    address_id UUID,
    PRIMARY KEY (id, version),
    CONSTRAINT fk_subject_base FOREIGN KEY (id) REFERENCES subject_base(id),
    CONSTRAINT fk_org_unit FOREIGN KEY (org_unit_code) REFERENCES org_unit(code),
    CONSTRAINT fk_address FOREIGN KEY (address_id) REFERENCES address(id)
);

CREATE INDEX idx_bsh_id on subject_base_history(id);

CREATE TABLE subject_individual (
    id UUID PRIMARY KEY,
    version NUMERIC NOT NULL,
    gender TEXT,
    first_name TEXT,
    last_name TEXT,
    middle_name TEXT,
    date_of_birth DATE,
    profession TEXT,
    employment_status TEXT,
    nationality TEXT,
    residence TEXT,
    CONSTRAINT fk_subject_base FOREIGN KEY (id) REFERENCES subject_base(id)
);

CREATE INDEX idx_si_idn on subject_individual(id);

CREATE TABLE subject_individual_history (
    id UUID NOT NULL,
    version NUMERIC NOT NULL,
    gender TEXT,
    first_name TEXT,
    last_name TEXT,
    middle_name TEXT,
    date_of_birth DATE,
    profession TEXT,
    employment_status TEXT,
    nationality TEXT,
    residence TEXT,
    PRIMARY KEY (id, version),
    CONSTRAINT fk_subject_ind FOREIGN KEY (id, version) REFERENCES subject_base_history(id, version)
);

CREATE INDEX idx_sih_id on subject_individual_history(id);

CREATE TABLE subject_corporate (
    id UUID PRIMARY KEY,
    version NUMERIC NOT NULL,
    incorporation_date DATE,
    incorporation_country TEXT,
    incorporation_type TEXT,
    registration_number TEXT,
    segment TEXT, 
    tax_number TEXT,
    CONSTRAINT fk_subject_base FOREIGN KEY (id) REFERENCES subject_base(id)
);

CREATE INDEX idx_si_crp on subject_corporate(id);

CREATE TABLE subject_corporate_history (
    id UUID NOT NULL,
    version NUMERIC NOT NULL,
    incorporation_date DATE,
    incorporation_country TEXT,
    incorporation_type TEXT,
    registration_number TEXT,
    segment TEXT, 
    tax_number TEXT,
    PRIMARY KEY (id, version),
    CONSTRAINT fk_subject_corp FOREIGN KEY (id, version) REFERENCES subject_base_history(id, version)
);

CREATE INDEX idx_sih_crp on subject_corporate_history(id);