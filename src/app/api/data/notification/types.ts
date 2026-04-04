import { LinkedEntity } from "../entity_state/entity-state";

export type Notification = {
    id: string;
    identifier: string;
    sender_user_name: string;
    receiver_user_name: string;
    title: string;
    create_date_time: string;
    read_date_time?: string;
    linked_entity: LinkedEntity;
    body?: string;
    metadata?: string;
}