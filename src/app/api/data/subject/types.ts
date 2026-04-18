import { OrgUnitFilter } from "../org_unit/org_unit";

type Address = {
    street: string;
    number: string;
    city: string;
    postal_code: string;
    country: string;
};

// Base fields common to all subject types.
// `type` is an open string — values are config-driven via subject_type_config.
// `kyc_risk` has moved to type_specific (it is not universal across all subject types).
export type BaseSubject = OrgUnitFilter & {
    id: string;
    type: string;
    type_name: string;
    type_description: string;
    version: number;
    identifier: string;
    segment: string;
    status: string;
    name: string;
    address: Address;
    mail: string;
    phone: string;
    acquisition_date: string;
    schema_version: string;
    type_specific: Record<string, unknown>;
};

// Subject is the open base type. Components that previously relied on the
// discriminated union should use the type guards below to narrow.
export type Subject = BaseSubject;

export type SubjectEvent = {
    id: string;
    title: string;
    description: string;
    date_time: string;
    type: string;
};

export type SubjectHistory = OrgUnitFilter & {
    valid_from: string;
    valid_to: string;
    subject_history: Subject;
};

export enum NetworkNodeType {
    SUBJECT = "subject",
    PRODUCT = "product",
    ALERT   = "alert",
    CASE    = "case",
}

export type NetworkNode = {
    id: string;
    type: NetworkNodeType;
    name: string;
    date_time: string;
    details?: Record<string, unknown>;
};

export type NetworkLink = {
    source_id: string;
    source_type: NetworkNodeType;
    destination_id: string;
    destination_type: NetworkNodeType;
    role: string;
    date_time: string;
};

export type NetworkData = {
    nodes: NetworkNode[];
    links: NetworkLink[];
};
