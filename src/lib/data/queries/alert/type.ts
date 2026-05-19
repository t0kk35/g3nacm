export interface AlertSummary {
  total_alerts: number
  by_type: { [key: string]: number }
  by_status: { [key: string]: number }
  assigned_to_me: number
  unassigned: number
  recent_activity: {
    id: string
    alert_identifier: string
    alert_type: string
    description: string
    create_date_time: string
    entity_state: string
  }[]
  trends: {
    period: string
    counts: { date: string; count: number }[]
  }
}