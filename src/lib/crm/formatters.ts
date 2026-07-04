export {
  crmLabelize,
  formatAdminAccessLevelLabel,
  formatCrmRoleLabel,
  formatIntegrationProviderLabel,
  formatIntegrationStatusLabel,
  formatLeadEventLabel,
  formatLeadInterestLabel,
  formatLeadSourceLabel,
  formatLeadStateLabel,
  formatSyncJobStatusLabel,
  formatSyncJobTypeLabel,
  formatSyncStateLabel,
} from "@/lib/crm/labels";

export const CRM_TIME_ZONE = "Africa/Lagos";

export function formatCrmDate(value?: string | Date | null) {
  if (!value) {
    return "Not yet";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: CRM_TIME_ZONE,
  }).format(date);
}

export function formatCrmDateTime(value?: string | Date | null) {
  if (!value) {
    return "Not yet";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: CRM_TIME_ZONE,
  }).format(date);
}
