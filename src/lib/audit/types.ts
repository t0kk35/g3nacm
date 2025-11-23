export type AuditData = {
    correlation_id?: string
    category: string;
    action: string;
    target_type: string;
    target_id_num?: number;
    target_id_string?: string;
    metadata?: Record<string, any>;
    before_data?: Record<string, any>;
    after_data?: Record<string, any>;
}