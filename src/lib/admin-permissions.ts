import { isMasterAdminEmail, normalizeAdminEmail } from "@/lib/admin-access";
import { buildLeadAssigneeList, leadHasAssignee } from "@/lib/crm/lead-assignees";
import type {
  CrmUserRole,
  LeadRecord,
  LeadTaskRecord,
} from "@/lib/pathway-engine/types";
import type { LeadListFilters } from "@/lib/storage/types";

export const ADMIN_ACCESS_LEVELS = [
  "master_admin",
  "general_admin",
  "lead_sales_rep",
  "sales_rep",
] as const;

export type AdminAccessLevel = (typeof ADMIN_ACCESS_LEVELS)[number];

type AdminNavKey =
  | "dashboard"
  | "leads"
  | "tasks"
  | "team"
  | "reports"
  | "integrations"
  | "settings";

function normalizeEmail(value?: string | null) {
  return value ? normalizeAdminEmail(value) : "";
}

export function getAccessLevelFromRole(role?: CrmUserRole | null): AdminAccessLevel {
  switch (role) {
    case "admin":
      return "master_admin";
    case "manager":
    case "finance":
    case "ad_manager":
      return "general_admin";
    case "consultant":
      return "lead_sales_rep";
    case "sales_agent":
    default:
      return "sales_rep";
  }
}

export function resolveAdminAccessLevel(input: {
  email?: string | null;
  role?: CrmUserRole | null;
}): AdminAccessLevel {
  if (isMasterAdminEmail(input.email)) {
    return "master_admin";
  }

  if (!input.role) {
    return "master_admin";
  }

  return getAccessLevelFromRole(input.role);
}

export function getStoredRoleForAccessLevel(level: AdminAccessLevel): CrmUserRole {
  switch (level) {
    case "master_admin":
      return "admin";
    case "general_admin":
      return "manager";
    case "lead_sales_rep":
      return "consultant";
    case "sales_rep":
    default:
      return "sales_agent";
  }
}

export function canAccessReports() {
  return true;
}

export function canViewSalesTeam(accessLevel: AdminAccessLevel) {
  return accessLevel !== "sales_rep";
}

export function canManageIntegrationsAccess(
  accessLevel: AdminAccessLevel,
  role?: CrmUserRole | null,
) {
  return accessLevel === "master_admin" || role === "ad_manager";
}

export function canManageSettings(
  accessLevel: AdminAccessLevel,
  role?: CrmUserRole | null,
) {
  if (role === "ad_manager") {
    return false;
  }

  return (
    accessLevel === "master_admin" ||
    accessLevel === "general_admin" ||
    accessLevel === "lead_sales_rep"
  );
}

export function canEditTeamAccess(accessLevel: AdminAccessLevel) {
  return accessLevel === "master_admin" || accessLevel === "general_admin";
}

export function canManageTeamRoster(accessLevel: AdminAccessLevel) {
  return (
    accessLevel === "master_admin" ||
    accessLevel === "general_admin" ||
    accessLevel === "lead_sales_rep"
  );
}

export function getGrantableAccessLevels(accessLevel: AdminAccessLevel): AdminAccessLevel[] {
  switch (accessLevel) {
    case "master_admin":
      return [...ADMIN_ACCESS_LEVELS];
    case "general_admin":
      return ["lead_sales_rep", "sales_rep"];
    case "lead_sales_rep":
      return ["sales_rep"];
    case "sales_rep":
    default:
      return [];
  }
}

export function canAssignTasksToOthers(accessLevel: AdminAccessLevel) {
  return accessLevel !== "sales_rep";
}

export function canAssignLeadOwners(accessLevel: AdminAccessLevel) {
  return accessLevel !== "sales_rep";
}

export function canSoftDeleteLead(accessLevel: AdminAccessLevel) {
  return (
    accessLevel === "master_admin" ||
    accessLevel === "general_admin" ||
    accessLevel === "lead_sales_rep"
  );
}

export function canAccessLeadTrash(accessLevel: AdminAccessLevel) {
  return accessLevel === "master_admin" || accessLevel === "general_admin";
}

export function canCreateLeadRecords() {
  return true;
}

export function canImportLeadRecords(accessLevel: AdminAccessLevel) {
  return accessLevel !== "sales_rep";
}

export function canViewTechnicalLeadContext(
  accessLevel: AdminAccessLevel,
  role?: CrmUserRole | null,
) {
  return canManageIntegrationsAccess(accessLevel, role);
}

export function canViewLeadRecord(
  accessLevel: AdminAccessLevel,
  lead: LeadRecord,
  currentUserEmail?: string | null,
) {
  if (accessLevel !== "sales_rep") {
    return true;
  }

  return leadHasAssignee(
    buildLeadAssigneeList({ all: lead.assignedToList }).join("|"),
    currentUserEmail,
  );
}

export function canManageLeadRecord(
  accessLevel: AdminAccessLevel,
  lead: LeadRecord,
  currentUserEmail?: string | null,
) {
  return canViewLeadRecord(accessLevel, lead, currentUserEmail);
}

export function canManageTeamMember(
  accessLevel: AdminAccessLevel,
  targetAccessLevel: AdminAccessLevel,
  currentUserEmail?: string | null,
  targetEmail?: string | null,
) {
  if (!canManageTeamRoster(accessLevel)) {
    return false;
  }

  if (
    normalizeEmail(currentUserEmail) &&
    normalizeEmail(currentUserEmail) === normalizeEmail(targetEmail)
  ) {
    return false;
  }

  if (targetAccessLevel === "master_admin") {
    return false;
  }

  if (accessLevel === "general_admin") {
    return targetAccessLevel === "lead_sales_rep" || targetAccessLevel === "sales_rep";
  }

  if (accessLevel === "lead_sales_rep") {
    return targetAccessLevel === "sales_rep";
  }

  return true;
}

export function canManageTaskRecord(
  accessLevel: AdminAccessLevel,
  task: LeadTaskRecord,
  currentUserEmail?: string | null,
) {
  if (accessLevel !== "sales_rep") {
    return true;
  }

  return normalizeEmail(task.assignedTo) === normalizeEmail(currentUserEmail);
}

export function scopeLeadListFilters(
  filters: LeadListFilters,
  accessLevel: AdminAccessLevel,
  currentUserEmail?: string | null,
): LeadListFilters {
  if (accessLevel !== "sales_rep") {
    return filters;
  }

  const email = normalizeEmail(currentUserEmail);
  return {
    ...filters,
    assignedTo: email || undefined,
  };
}

export function getVisibleAdminNavKeys(
  accessLevel: AdminAccessLevel,
  role?: CrmUserRole | null,
) {
  const keys: AdminNavKey[] = ["dashboard", "leads", "tasks"];

  if (canViewSalesTeam(accessLevel)) {
    keys.push("team");
  }

  if (canAccessReports()) {
    keys.push("reports");
  }

  if (canManageIntegrationsAccess(accessLevel, role)) {
    keys.push("integrations");
  }

  if (canManageSettings(accessLevel, role)) {
    keys.push("settings");
  }

  return keys;
}
