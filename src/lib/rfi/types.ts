import { RfiQuestionType } from "@/app/api/data/rfi/type";

export type RfiStatus = 'Draft' | 'PendingApproval' | 'Approved' | 'Sent' | 'Failed' | 'Cancelled';

export type RfiQuestionInput = {
    question_order: number;
    question_text: string;
    question_type?: RfiQuestionType;
    expected_response_format?: string;
    is_mandatory?: boolean;     // default: true
    ai_generated?: boolean;     // default: false
    ai_reasoning?: string;
};

export type CreateOutboundRfiParams = {
    channel_code: string;
    entity_code: string;           // rfi workflow entity code e.g. "rfi.outbound"
    org_unit_code: string;
    linked_entity_id: string;      // UUID of the linked alert/case
    linked_entity_code: string;    // e.g. "aml.rule.alert"
    title: string;
    body?: string;
    purpose?: string;
    recipient_subject_id: string;  // UUID → subject_base.id
    template_id?: string;
    due_datetime: string;          // ISO date string
    questions?: RfiQuestionInput[];
    ai_generated_draft?: boolean;
    ai_confidence_score?: number;
};

/** Subset of RFI data passed to channel handlers at dispatch time. */
export type RfiSendContext = {
    title: string;
    body?: string;
    questions?: RfiQuestionInput[];
};

export type CreateRfiResult = {
    rfi_id: string;
    identifier: string;
};

export type DispatchRfiResult = {
    delivery_result: RfiDeliveryResult;
};

export type RfiDeliveryResult = {
    success: boolean;
    message_id?: string;
    delivery_timestamp?: string;
    error?: string;
};

// Snapshot stored in rfi_request.recipient_contact_details (JSONB)
export type RfiEmailContactDetails = {
    channel_type: 'Email';
    email_address: string;
    subject_name: string;
};

// Union — extend with new shapes as more channel handlers are added
export type RfiContactDetails = RfiEmailContactDetails;
