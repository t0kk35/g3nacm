--
-- RFI Tables, what we use to send and receice RFI's (Request for Information)
---
CREATE TYPE rfi_direction AS ENUM ('Inbound', 'Outbound');
CREATE TYPE rfi_channel_type AS ENUM ('Email', 'SWIFT', 'Portal', 'Mail');
CREATE TYPE rfi_question_type as ENUM ('Open Ended', 'Document Request', 'Yes/No', 'Multiple Choice', 'Date', 'Amount', 'Structured Data');
CREATE TYPE rfi_status AS ENUM ('Draft', 'Sent', 'Failed');

-- Possible RFI Channels, the communication method used for the RFI.
CREATE TABLE rfi_channel (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type rfi_channel_type NOT NULL,
    is_inbound BOOLEAN DEFAULT FALSE,
    is_outbound BOOLEAN DEFAULT TRUE,
    configuration JSONB NOT NULL,
    credentials JSONB NOT NULL,
    validation_regex TEXT,
    requires_authentication BOOLEAN DEFAULT false,
    supports_delivery_confirmation BOOLEAN DEFAULT false,
    supports_read_receipts BOOLEAN DEFAULT false,
    supports_attachments BOOLEAN DEFAULT false,
    max_attachment_size_mb INTEGER,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    create_datetime TIMESTAMPTZ DEFAULT now(),
    update_datetime TIMESTAMPTZ DEFAULT now(),
);

CREATE INDEX idx_rfi_c_id ON rfi_channel(id);
CREATE INDEX idx_rfi_c_code ON rfi_channel(code);

CREATE TABLE rfi_template(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    use_case TEXT,
    subject_template TEXT,
    body_template TEXT,
    default_questions JSONB,
    is_approved BOOLEAN DEFAULT false,
    approve_user_id INTEGER,
    approve_datetime TIMESTAMPTZ,
    compliance_notes TEXT,
    is_active BOOLEAN DEFAULT true,
    create_user_id INTEGER,
    create_datetime TIMESTAMPTZ DEFAULT now(),
    update_datetime TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rfi_t_id ON rfi_template(id);

-- Base RFI request table. 
CREATE TABLE rfi_request(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    entity_code TEXT NOT NULL,
    org_unit_code TEXT NOT NULL,
    direction rfi_direction NOT NULL,
    linked_entity_id UUID NOT NULL, -- Linked to alert or case
    linked_entity_code TEXT NOT NULL, -- Linked to alert or case
    parent_rfi_id UUID,
    related_rfi_ids UUID[],
    title TEXT NOT NULL,
    body TEXT, -- Main body of the RFI.
    purpose TEXT,
    -- Outbound fields
    recipient_subject_id UUID,
    recipient_contact_details JSONB, --- Snapshot of contact details at time of sending
    -- Inbound fields
    requester_subject_id UUID,
    requester_contact_details JSONB, --- Snapshot of contact details at time of receipt
    requester_reference TEXT,
    -- Channel
    channel_id INTEGER NOT NULL,
    --- Template
    template_id UUID,
    status rfi_status NOT NULL DEFAULT 'Draft',
    --- AI Support
    ai_generated_draft BOOLEAN DEFAULT false,
    ai_confidence_score DECIMAL(3,2),
    ai_suggestions JSONB,
    ai_classification JSONB,
    create_datetime TIMESTAMPTZ NOT NULL DEFAULT now(),
    update_datetime TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_datetime TIMESTAMPTZ NOT NULL,
    reminder_datetime TIMESTAMPTZ,
    sent_datetime TIMESTAMPTZ,
    tags TEXT[], -- for categorization/search
    CONSTRAINT fk_rfi_r_entity_code FOREIGN KEY (entity_code) REFERENCES workflow_entity(code),
    CONSTRAINT fk_rfi_r_org_unit_code FOREIGN KEY (org_unit_code) REFERENCES org_unit(code),
    CONSTRAINT fk_rfi_r_linked_entity_code FOREIGN KEY (linked_entity_code) REFERENCES workflow_entity(code),
    CONSTRAINT fk_rfi_r_recipient_subject_id FOREIGN KEY (recipient_subject_id) REFERENCES subject_base(id),
    CONSTRAINT fk_rfi_r_requester_subject_id FOREIGN KEY (requester_subject_id) REFERENCES subject_base(id),
    CONSTRAINT fk_rfi_r_channel_id FOREIGN KEY (channel_id) REFERENCES rfi_channel(id),
    CONSTRAINT fk_rfi_r_template FOREIGN KEY (template_id) REFERENCES rfi_template(id)
);

CREATE INDEX idx_rfi_uid ON rfi_request(id);
CREATE INDEX idx_rfi_related ON rfi_request(linked_entity_id, linked_entity_code);
CREATE INDEX idx_rfi_recipient_id ON rfi_request(recipient_subject_id);
CREATE INDEX idx_rfi_requester_id ON rfi_request(requester_subject_id);

--- RFI Questions (If a request contains multiple distinguisable questions)
CREATE TABLE rfi_question (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfi_request_id UUID NOT NULL,
    -- Question content
    question_order INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type rfi_question_type,
    expected_response_format TEXT,
    is_mandatory BOOLEAN default TRUE,
    -- Context
    related_transaction_ids JSONB,
    related_entity_ids JSONB,
    -- AI support
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_reasoning TEXT,
    -- Dates
    create_datetime TIMESTAMPTZ DEFAULT now(),
    received_datetime TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT rfi_id FOREIGN KEY (rfi_request_id) REFERENCES rfi_request(id)
);

CREATE INDEX idx_rfi_i_rfi_id ON rfi_question(rfi_request_id);

--- RFI Reponses
CREATE TABLE rfi_response (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfi_request_id UUID NOT NULL,
    rfi_message_id UUID,
    -- Responder content
    repsonse_text TEXT,
    response_data JSONB,
    respondent_entity_id UUID,
    respondent_name TEXT,
    respondent_contact_details JSONB,
    -- Quality assessment
    is_complete BOOLEAN DEFAULT false,
    is_satisfactory BOOLEAN,
    quality_notes TEXT,
    completeness_score DECIMAL(3,2), -- 0.00 to 1.00 
    -- AI analysis
    ai_extracted_entities JSONB,
    ai_sentiment_score DECIMAL(3,2),
    ai_relevance_score DECIMAL(3,2),
    ai_risk_indicators JSONB,
    ai_summary TEXT,
    ai_structured_extraction JSONB,
    -- Dates
    create_datetime TIMESTAMPTZ DEFAULT now(),
    update_datetime TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT rfi_id FOREIGN KEY (rfi_request_id) REFERENCES rfi_request(id),
    CONSTRAINT rfi_r_contact_method FOREIGN KEY (respondent_entity_id) REFERENCES subject_base(id)
);

CREATE INDEX idx_rfi_r_rfi_id ON rfi_response(rfi_request_id);