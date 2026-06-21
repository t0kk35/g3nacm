type CalendarItemType = "task" | "reminder";

interface CalendarEventBase {
  id: string;
  type: CalendarItemType;
  assign_user_id: number;
  title: string;
  description?: string;
  start_date_time?: string;
  end_date_time?: string;
  all_day?: boolean;
  location?: string;
  status: string;
  create_user_id: number;
  create_date_time: string;
  update_date_time: string;
}

export type CalendarTaskStatus =
  | "todo"
  | "in_progress"
  | "completed"
  | "cancelled";

export type CalendarTaskPriority =
  | "low"
  | "medium"
  | "high"
  | "urgent";

interface CalendarTask extends CalendarEventBase {
  type: "task";
/*  dueAt?: Date;
  status: CalendarTaskStatus;
  priority: CalendarTaskPriority;
  completedAt?: Date; */
}

interface ReminderItem extends CalendarEventBase {
  type: "reminder";
/*   remindAt: Date; */
}

export type CalendarEvent = CalendarTask | ReminderItem
