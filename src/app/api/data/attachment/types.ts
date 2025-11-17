export type EntityAttachment = {
    id: string;
    entity_code: string;
    entity_id: string;
    org_unit_code: string;
    filename: string;
    original_filename: string;
    file_data?: BodyInit;
    file_size: number
    mime_type: string;
    uploaded_by_user_name: string;
    upload_date_time: string;
    description: string;
    is_active: boolean;
}