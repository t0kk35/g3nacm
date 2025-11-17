import { OrgUnitFilter } from "../org_unit/org_unit";

type Address = {
    street: string;
    number: string;
    city: string;
    postal_code: string;
    country: string;
  };

export type BaseSubject = OrgUnitFilter & {
    id: string;
    type: "IND" | "CRP";
    identifier: string;
    segment: string;
    status: string;
    name: string;
    address: Address;
    mail: string;
    phone: string;
    kyc_risk: string;
    acquisition_date: string;
  };
  
export type IndividualSubject = BaseSubject & {
    type: "IND";
    type_specific: {
      gender: string;
      first_name: string;
      last_name: string;
      middle_name: string;
      date_of_birth: string;
      profession: string;
      employment_status: string;
      nationality: string;
      residence: string;
    };
  };
  
export type CorporateSubject = BaseSubject & {
    type: "CRP";
    type_specific: {
      incorporation_date: string;
      incorporation_country: string;
      incorporation_type: string;
      registration_number: string;
      segment: string;
      tax_number: string;
    };
  };
  
export type Subject = IndividualSubject | CorporateSubject;

//Type guard for IndividualSubject
export function IndividualSubject(subject: BaseSubject): subject is IndividualSubject {
  return (subject as IndividualSubject).type === 'IND'
}

export type SubjectEvent = {
  id: string
  title: string
  description: string
  date_time: string;
  type: string;
}

export type SubjectHistory = OrgUnitFilter & {
    valid_from: string, 
    valid_to: string,
    subject_history: Subject
}

export enum NetworkNodeType {
    SUBJECT = "subject",
    PRODUCT = "product",
    ALERT = "alert",
    CASE = "case",
}

export type NetworkNode = {
    id: string;
    type: NetworkNodeType
    name: string;
    date_time: string;
    details?: Record<string, any>;
}
  
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