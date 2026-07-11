import type { NotificationType } from "@/lib/crm/domain";

export const NOTIFICATION_CATEGORIES = ["all", "action", "pipeline", "intake", "system"] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const notificationCategoryOptions: Array<{
  value: NotificationCategory;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "action", label: "Action needed" },
  { value: "pipeline", label: "Pipeline" },
  { value: "intake", label: "Intake" },
  { value: "system", label: "System" },
];

const categoryTypes: Record<Exclude<NotificationCategory, "all">, NotificationType[]> = {
  action: ["new_lead_assigned", "follow_up_due", "follow_up_overdue"],
  pipeline: ["lead_stage_changed", "lead_marked_won", "lead_marked_lost", "lead_offer_qualified", "target_milestone_reached"],
  intake: ["webhook_lead_captured", "import_completed"],
  system: ["export_completed"],
};

export function parseNotificationCategory(value?: string | null): NotificationCategory {
  return NOTIFICATION_CATEGORIES.includes(value as NotificationCategory)
    ? (value as NotificationCategory)
    : "all";
}

export function notificationTypesForCategory(category: NotificationCategory) {
  return category === "all" ? undefined : categoryTypes[category];
}

export function categoryForNotificationType(type: NotificationType): NotificationCategory {
  return (
    (Object.entries(categoryTypes).find(([, types]) => types.includes(type))?.[0] as
      | NotificationCategory
      | undefined) ?? "system"
  );
}
