CREATE TYPE credit_debit AS ENUM ('D', 'C');

CREATE TABLE general_ledger(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submit_date_time TIMESTAMP NOT NULL,
    identifier TEXT NOT NULL,
    org_unit_code TEXT NOT NULL,
    subject_id UUID NOT NULL,
    product_id UUID NOT NULL,
    booking_type TEXT NOT NULL,
    credit_debit credit_debit NOT NULL,
    currency_base TEXT NOT NULL,
    amount_base NUMERIC NOT NULL,
    currency_orig TEXT,
    amount_orig NUMERIC,
    channel TEXT,
    description TEXT,
    counter_party_bank_code TEXT NOT NULL,
    counter_pary_bank TEXT NOT NULL,
    counter_party_account TEXT NOT NULL,
    counter_party_name TEXT,
    counter_party_address TEXT,
    counter_party_country TEXT NOT NULL,
    orginal_date_time TIMESTAMP,
    posting_date_time TIMESTAMP,
    value_date_time TIMESTAMP,
    CONSTRAINT fk_org FOREIGN KEY (org_unit_code) REFERENCES org_unit(code),
    CONSTRAINT fk_sb FOREIGN KEY (subject_id) REFERENCES subject_base(id),
    CONSTRAINT fk_pr FOREIGN KEY (product_id) REFERENCES product_base(id)
);

CREATE INDEX idx_gl_id ON general_ledger(id);
CREATE INDEX idx_gl_sid ON general_ledger(subject_id);
CREATE INDEX idx_gl_pid ON general_ledger(product_id);