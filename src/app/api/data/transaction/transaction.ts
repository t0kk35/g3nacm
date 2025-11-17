import { OrgUnitFilter } from "../org_unit/org_unit";

export enum entity_data_type  {
    STRING = 'string',
    NUMBER = 'number',
    BOOLEAN = 'boolean', 
    OBJECT = 'object'
}

type BaseTransaction = OrgUnitFilter & {
    id: string;
    submit_date_time: string;
    identifier: string;
    org_unit_code: string;
}

export type GLTransaction = BaseTransaction & {
    type: "GL",
    type_specific: {
        subject_id: string,
        subject_identifier: string,
        product_id: string,
        product_identifier: string,
        booking_type: string,
        credit_debit: string,
        currency_base: string,
        amount_base: number,
        currency_orig: string,
        amount_currency: number,
        channel: string,
        description: string,
        counter_party_bank_code: string,
        counter_party_bank: string,
        counter_party_account: string,
        counter_party_name: string,
        counter_party_address: string,
        counter_party_country: string,
    } 
}

// Represents a party involved in the message (debtor, creditor, intermediary, etc.)
export type TFParticipant = {
    role: TFParticipantRole; // e.g., 'debtor', 'creditor', 'debtorAgent', etc.
    label?: string; // Optional label for UI (e.g. "Debtor Agent")
    fields: TFField[];
};

// Enum of roles to ensure consistency
export type TFParticipantRole = 
    | 'debtor'
    | 'debtorAgent'
    | 'creditor'
    | 'creditorAgent'
    | 'intermediaryAgent'
    | 'initiatingAgent'
    | 'instructedAgent'
    | 'ultimateDebtor'
    | 'ultimateCreditor'
    | 'other'; // catch-all

// Represents a field within a party (e.g., name, BIC, address, etc.)
export type TFField = {
    name: string; // e.g., 'BIC', 'Name', 'Account'
    value: string;
    type?: TFFieldType; // For rendering controls (e.g., text, currency)
    display_label?: string; // Friendly name (e.g. "Bank Identifier Code")
    isPreview: boolean; // Indication if this should be in the header card
};

// Optional field type enum
export type TFFieldType =
    | 'text'
    | 'iban'
    | 'bic'
    | 'currency'
    | 'amount'
    | 'address'
    | 'country'
    | 'date'
    | 'datetime'
    | 'code'
    | 'reference'
    | 'number';

// Wrapper for a parsed financial transaction
export type TFFinancialTransaction = {
  transactionId: string;
  transactionDate: string;
  fields: TFField[];
  participants: TFParticipant[];
};

 export type TFFinancialMessage = {
    messageId: string;
    messageType: string; // e.g., 'pacs.008.001.08', 'MT103'
    fields: TFField[];
    transactions: TFFinancialTransaction[];
}

export type TFTransaction = BaseTransaction & {
    type: "TF",
    type_specific: {
        message_type: string;
        sender: string;
        receiver: string;
        amount?: number;
        currency?: string;
        fields: TFField[];
        transactions: TFFinancialTransaction[];
    }
}

export type Transaction = GLTransaction | TFTransaction