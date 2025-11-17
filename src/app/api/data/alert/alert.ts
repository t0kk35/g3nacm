import { OrgUnitFilter } from "../org_unit/org_unit";
import { EntityState, EntityStateHistory } from "../entity_state/entity-state";

// Common Alert Type
export enum AlertType {
    AML_TM = "TM",
    CDD = "CDD",
    NAME_SCREENING = "NS",
    TRANSACTION_FILTERING = "TF"
}

export enum AlertItemType {
    SUBJECT = "SUB",
    TF_TRANSACTION = "TF"
}

// DataItem (Could be a subject or transaction)
type AlertItem = {
    id: string;
    type: AlertItemType;
    details: Record<string, any>;
}

export type AlertBase = OrgUnitFilter & {
    id: string;
    alert_identifier: string;
    create_date_time: string;
    description: string;
    alert_type: AlertType;
    alert_item: AlertItem;
    entity_state: EntityState;
};

// AML TM Detection
export type TMDetection = {
    id: string;
    name: string;
    info: string;
    score: number;
    time_frame: "DAILY" | "WEEKLY" | "MONTHLY";
};
  
export type TMAlert = AlertBase & EntityStateHistory & {
    alert_type: AlertType.AML_TM;
    detections: TMDetection[];
};

// CDD Detection
export type CDDDetection = {
    id: string;
    risk_contributor: string;
    risk_weight: number;
};

export type CDDAlert = AlertBase & EntityStateHistory & {
    alert_type: AlertType.CDD;
    detections: CDDDetection[];
};

// Name Screening Detection
export type NSDetection = {
    id: string;
    input_data: string;
    list_name: string;
    list_uid: string;
    list_data: string;
    algorithm: string;
    score: number;
};

export type NSAlert = AlertBase & EntityStateHistory & {
    alert_type: AlertType.NAME_SCREENING;
    detections: NSDetection[];
};

export type TFDetection = {
    id: string;
    message_id: string;
    transaction_id: string;
    participant_role: string;
    list_name: string;
    list_data: string;
    input_data: string;
    algorithm: string;
    score: number;
};

export type TFAlert = AlertBase & EntityStateHistory & {
    alert_type: AlertType.TRANSACTION_FILTERING;
    detections: TFDetection[];
};

// Alert Union Type (Ensures only one detection type)
export type Alert = TMAlert | CDDAlert | NSAlert | TFAlert ;

export const isAmlTmAlert = (alert: Alert): alert is TMAlert => 
    alert.alert_type === AlertType.AML_TM;
  
const isCddAlert = (alert: Alert): alert is CDDAlert => 
    alert.alert_type === AlertType.CDD;
  
const isNameScreeningAlert = (alert: Alert): alert is NSAlert => 
    alert.alert_type === AlertType.NAME_SCREENING;

export const isTransactionFilteringAlert = (alert: Alert): alert is TFAlert =>
    alert.alert_type === AlertType.TRANSACTION_FILTERING;