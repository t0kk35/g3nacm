import { OrgUnitFilter } from "../org_unit/org_unit";
import { EntityState, EntityStateHistory } from "../entity_state/entity-state";

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
    schema_version: string;
    alert_item: AlertItem;
    entity_state: EntityState;
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
    schema_version: string;
};

// All alerts share the same generic detections array. The detection shape
// varies by alert_type — use the typed interfaces above for casting when needed.
export type Alert = AlertBase & EntityStateHistory & {
    detections: Record<string, any>[];
};