// types.ts
import { EntityState, LinkedEntity } from "../entity_state/entity-state";

/* =========================
   ENUMS
========================= */

export enum RfiDirection {
  Inbound = "Inbound",
  Outbound = "Outbound"
}

export enum RfiPriority {
  Urgent = "Urgent",
  High = "High",
  Normal = "Normal",
  Low = "Low"
}

export enum RfiChannelType {
  Email = "Email",
  SWIFT = "SWIFT",
  Portal = "Portal",
  Mail = "Mail"
}

export enum RfiQuestionType {
  OpenEnded = "Open Ended",
  DocumentRequest = "Document Request",
  YesNo = "Yes/No",
  MultipleChoice = "Multiple Choice",
  Date = "Date",
  Amount = "Amount",
  StructuredData = "Structured Data"
}

export enum RfiStatus {
  Draft = 'Draft',
  Sent = 'Sent',
  Failed = 'Failed'
}

/* =========================
   TABLE TYPES
========================= */
export type RfiChannel = {
  id: number;
  code: string;
  name: string;
  type: RfiChannelType;
  is_inbound: boolean;
  is_outbound: boolean;
  configuration: Record<string, any>;
  credentials: Record<string, any>;
  validation_regex?: string;
  requires_authentication: boolean;
  supports_delivery_confirmation: boolean;
  supports_read_receipts: boolean;
  supports_attachments: boolean;
  max_attachment_size_mb?: number;
  is_active: boolean;
  is_default: boolean;
  create_datetime: string;
  update_datetime: string;
}

export type RfiTemplate = {
  id: string;
  name: string;
  code: string;
  use_case?: string;
  subject_template?: string;
  body_template?: string;
  default_questions?: Record<string, any>;
  is_approved: boolean;
  approve_user_id?: number;
  approve_datetime?: string;
  compliance_notes?: string;
  is_active: boolean;
  create_user_id?: number;
  create_datetime: string;
  update_datetime: string;
}

export type RfiRequest = {
  id: string;
  identifier: string;
  entity_code: string;
  org_unit_code: string;
  direction: RfiDirection;
  linked_entity: LinkedEntity;
  parent_rfi_id?: string;
  related_rfi_ids?: string[];
  title: string;
  body?: string;
  purpose?: string;
  /* Outbound */
  recipient_subject_id?: string;
  recipient_contact_details?: Record<string, any>;
  /* Inbound */
  requester_subject_id?: string;
  requester_contact_details?: Record<string, any>;
  requester_reference?: string;
  /* Channel */
  channel: {
    code: string;
    name: string;
    type: RfiChannelType;
    is_inbound: boolean;
    is_outbound: boolean;
  };
  /* Template */
  template_id?: string;
  status: RfiStatus;
  /* AI Support */
  ai_generated_draft: boolean;
  ai_confidence_score?: number;
  ai_suggestions?: Record<string, any>;
  ai_classification?: Record<string, any>;
  create_datetime: string;
  update_datetime: string;
  due_datetime: string;
  reminder_datetime?: string;
  sent_datetime?: string;
  tags?: string[];
  entity_state: EntityState;
}

export type RfiQuestion = {
  id: string;
  rfi_request_id: string;
  question_order: number;
  question_text: string;
  question_type?: RfiQuestionType;
  expected_response_format?: string;
  is_mandatory: boolean;
  related_transaction_ids?: Record<string, any>;
  related_entity_ids?: Record<string, any>;
  ai_generated: boolean;
  ai_reasoning?: string;
  create_datetime: string;
  received_datetime: string;
}

export interface RfiResponse {
  id: string;
  rfi_request_id: string;
  rfi_message_id?: string;
  repsonse_text?: string;
  response_data?: Record<string, any>;
  respondent_entity_id?: string;
  respondent_name?: string;
  respondent_contact_details?: Record<string, any>;
  /* Quality */
  is_complete: boolean;
  is_satisfactory?: boolean;
  quality_notes?: string;
  completeness_score?: number;
  /* AI */
  ai_extracted_entities?: Record<string, any>;
  ai_sentiment_score?: number;
  ai_relevance_score?: number;
  ai_risk_indicators?: Record<string, any>;
  ai_summary?: string;
  ai_structured_extraction?: Record<string, any>;
  create_datetime: string;
  update_datetime: string;
}