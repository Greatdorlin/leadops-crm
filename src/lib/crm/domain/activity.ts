import type { LeadPriority } from "./leads";

export const TASK_STATUSES = ["open", "completed", "overdue", "cancelled"] as const;

export const LEAD_ACTIVITY_TYPES = [
  "lead_created",
  "lead_assigned",
  "stage_changed",
  "note_added",
  "task_created",
  "task_completed",
  "follow_up_due",
  "follow_up_overdue",
  "marked_won",
  "marked_lost",
  "intake_received",
  "intake_failed",
  "export_completed",
  "import_completed",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type LeadActivityType = (typeof LEAD_ACTIVITY_TYPES)[number];

export interface LeadTask {
  id: string;
  leadId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: LeadPriority;
  assignedUserId: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadNote {
  id: string;
  leadId: string;
  authorId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadActivityEvent {
  id: string;
  leadId: string;
  actorId: string | null;
  type: LeadActivityType;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
