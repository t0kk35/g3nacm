export type EntityState = {
    entity_code: string;
    date_time: string;
    action_code: string;
    action_name: string;
    from_state_code: string;
    from_state_name: string;
    priority: EntityPriority;
    priority_num: number;
    to_state_code: string;
    to_state_name: string;
    assigned_to_user_name: string;
    assigned_to_team_name: string;
    user_name: string;
}

export enum EntityPriority {
    HIGH = "High",
    MEDIUM = "Medium",
    LOW = "Low"
}

export type EntityStateHistory = {
    entity_state_history: EntityState[];
}