CREATE TABLE country (
    code TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    tax_haven BOOLEAN NOT NULL,
    terrorist_haven BOOLEAN NOT NULL,
    fatf_flag BOOLEAN NOT NULL,
    high_risk BOOLEAN NOT NULL
);

CREATE INDEX idx_crty_code on country(code);