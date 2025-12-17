export type NotificationList = {
    id: string;
    sender_user_name: string;
    receiver_user_name: string;
    title: string;
    create_date_time: string;
    read_date_time?: string;
}

export type NotificationDetail = NotificationList & {
    linked_entity_id?: string;
    linked_entity_code?: string;
    linked_entity_description?: string;
    linked_entity_display_url?: string;
    body?: string;
    metadata?: string;
}