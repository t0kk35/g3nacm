CREATE TYPE product_type AS ENUM ('ACCT');

CREATE TABLE product_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_type product_type NOT NULL,
    version NUMERIC NOT NULL,
    identifier TEXT NOT NULL,
    opened_date_time TIMESTAMP NOT NULL,
    category TEXT NOT NULL,
    org_unit_code TEXT NOT NULL,
    CONSTRAINT fk_org_unit FOREIGN KEY (org_unit_code) REFERENCES org_unit(org_unit_code)
);

CREATE INDEX idx_pb_id on product_base(id);

CREATE TABLE product_account (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UID NOT NULL,
    number TEXT NOT NULL,
    name TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    balance NUMERIC,
    status TEXT,
    CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES product_base(id)
);

CREATE INDEX idx_pa_product_id on product_account(product_id);

CREATE TABLE product_subject_link (
    product_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    version NUMERIC NOT NULL,
    date_time TIMESTAMP NOT NULL,
    role TEXT NOT NULL,
    PRIMARY KEY (product_id, subject_id, role),
    CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES product_base(id),
    CONSTRAINT fk_subject FOREIGN KEY (subject_id) REFERENCES subject_base(id)
);

CREATE INDEX idx_psl_product_id on product_subject_link(product_id);
CREATE INDEX idx_psl_subject_id on product_subject_link(subject_id);