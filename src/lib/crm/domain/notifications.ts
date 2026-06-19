export const NOTIFICATION_TYPES = [
  "new_lead_assigned",
  "follow_up_due",
  "follow_up_overdue",
  "lead_stage_changed",
  "lead_marked_won",
  "lead_marked_lost",
  "webhook_lead_captured",
  "import_completed",
  "export_completed",
  "target_milestone_reached",
] as const;

export const NOTIFICATION_CHANNELS = ["in_app", "email"] as const;
export const NOTIFICATION_STATUSES = ["pending", "sent", "read", "failed"] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export interface NotificationEvent {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipientUserId: string | null;
  leadId: string | null;
  title: string;
  message: string;
  status: NotificationStatus;
  createdAt: string;
  readAt: string | null;
}
