import { isMasterAdminEmail, normalizeAdminEmail } from "@/lib/admin-access";
import { buildLeadAssigneeList, leadHasAssignee } from "@/lib/crm/lead-assignees";
import type {
  CrmUserRole,
  LeadRecord,
  LeadTaskRecord,
} from "@/lib/crm/types";
import type { PermissionKey } from "@/lib/crm/role-permissions-contract";
import type { LeadListFilters } from "@/lib/storage/types";

export const ADMIN_ACCESS_LEVELS = [
  "master_admin",
  "general_admin",
  "lead_sales_rep",
  "finance",
  "sales_rep",
  "affiliate",
] as const;

export type AdminAccessLevel = (typeof ADMIN_ACCESS_LEVELS)[number];

type AdminNavKey =
  | "dashboard"
  | "leads"
  | "forms"
  | "tasks"
  | "team"
  | "reports"
  | "notifications"
  | "integrations"
  | "settings";

function normalizeEmail(value?: string | null) {
  return value ? normalizeAdminEmail(value) : "";
}

function getConfiguredPermission(
  permissions: readonly PermissionKey[] | undefined,
  permission: PermissionKey,
) {
  return permissions ? permissions.includes(permission) : null;
}

export function getAccessLevelFromRole(role?: CrmUserRole | null): AdminAccessLevel {
  switch (role) {
    case "admin":
      return "master_admin";
    case "manager":
    case "ad_manager":
      return "general_admin";
    case "consultant":
      return "lead_sales_rep";
    case "finance":
      return "finance";
    case "affiliate":
      return "affiliate";
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
    return "sales_rep";
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
    case "finance":
      return "finance";
    case "affiliate":
      return "affiliate";
    case "sales_rep":
    default:
      return "sales_agent";
  }
}

export function canAccessReports(
  accessLevel: AdminAccessLevel = "sales_rep",
  permissions?: readonly PermissionKey[],
) {
  const configured = getConfiguredPermission(permissions, "canViewReports");
  if (configured !== null) {
    return configured;
  }

  return accessLevel !== "affiliate" && accessLevel !== "finance";
}

export function canViewSalesTeam(
  accessLevel: AdminAccessLevel,
  permissions?: readonly PermissionKey[],
) {
  if (permissions) {
    return permissions.includes("canManageUsers") || permissions.includes("canViewReports");
  }

  return (
    accessLevel === "master_admin" ||
    accessLevel === "general_admin" ||
    accessLevel === "lead_sales_rep"
  );
}

export function canManageIntegrationsAccess(
  accessLevel: AdminAccessLevel,
  role?: CrmUserRole | null,
  permissions?: readonly PermissionKey[],
) {
  const configured = getConfiguredPermission(permissions, "canManageIntegrations");
  if (configured !== null) {
    return configured;
  }

  return accessLevel === "master_admin" || role === "ad_manager";
}

export function canManageSettings(
  accessLevel: AdminAccessLevel,
  role?: CrmUserRole | null,
  permissions?: readonly PermissionKey[],
) {
  const configured = getConfiguredPermission(permissions, "canManageSettings");
  if (configured !== null) {
    return configured;
  }

  if (role === "ad_manager") {
    return false;
  }

  return (
    accessLevel === "master_admin" ||
    accessLevel === "general_admin" ||
    accessLevel === "lead_sales_rep"
  );
}

export function canAccessFormsWorkspace(
  accessLevel: AdminAccessLevel,
  role?: CrmUserRole | null,
  permissions?: readonly PermissionKey[],
) {
  const configured = getConfiguredPermission(permissions, "canManageForms");
  if (configured !== null) {
    return configured;
  }

  if (role === "ad_manager") {
    return false;
  }

  return accessLevel === "master_admin" || accessLevel === "general_admin";
}

export function canEditTeamAccess(
  accessLevel: AdminAccessLevel,
  permissions?: readonly PermissionKey[],
) {
  const configured = getConfiguredPermission(permissions, "canManageUsers");
  if (configured !== null) {
    return configured;
  }

  return accessLevel === "master_admin" || accessLevel === "general_admin";
}

export function canManageTeamRoster(
  accessLevel: AdminAccessLevel,
  permissions?: readonly PermissionKey[],
) {
  const configured = getConfiguredPermission(permissions, "canManageUsers");
  if (configured !== null) {
    return configured;
  }

  return (
    accessLevel === "master_admin" ||
    accessLevel === "general_admin" ||
    accessLevel === "lead_sales_rep"
  );
}

export function getGrantableAccessLevels(accessLevel: AdminAccessLevel): AdminAccessLevel[] {
  switch (accessLevel) {
    case "master_admin":
      return ["general_admin", "lead_sales_rep", "finance", "sales_rep", "affiliate"];
    case "general_admin":
      return ["lead_sales_rep", "finance", "sales_rep", "affiliate"];
    case "lead_sales_rep":
      return ["sales_rep", "affiliate"];
    case "finance":
    case "sales_rep":
    case "affiliate":
    default:
      return [];
  }
}

export function canAssignTasksToOthers(
  accessLevel: AdminAccessLevel,
  permissions?: readonly PermissionKey[],
) {
  const configured = getConfiguredPermission(permissions, "canAssignLeads");
  if (configured !== null) {
    return configured;
  }

  return (
    accessLevel === "master_admin" ||
    accessLevel === "general_admin" ||
    accessLevel === "lead_sales_rep"
  );
}

export function canAssignLeadOwners(
  accessLevel: AdminAccessLevel,
  permissions?: readonly PermissionKey[],
) {
  const configured = getConfiguredPermission(permissions, "canAssignLeads");
  if (configured !== null) {
    return configured;
  }

  return (
    accessLevel === "master_admin" ||
    accessLevel === "general_admin" ||
    accessLevel === "lead_sales_rep"
  );
}

export function canSoftDeleteLead(
  accessLevel: AdminAccessLevel,
  permissions?: readonly PermissionKey[],
) {
  const configured = getConfiguredPermission(permissions, "canDeleteLeads");
  if (configured !== null) {
    return configured;
  }

  return (
    accessLevel === "master_admin" ||
    accessLevel === "general_admin" ||
    accessLevel === "lead_sales_rep"
  );
}

export function canAccessLeadTrash(
  accessLevel: AdminAccessLevel,
  permissions?: readonly PermissionKey[],
) {
  const configured = getConfiguredPermission(permissions, "canDeleteLeads");
  if (configured !== null) {
    return configured;
  }

  return accessLevel === "master_admin" || accessLevel === "general_admin";
}

export function canCreateLeadRecords(permissions?: readonly PermissionKey[]) {
  return getConfiguredPermission(permissions, "canCreateLeads") ?? true;
}

export function canImportLeadRecords(
  accessLevel: AdminAccessLevel,
  permissions?: readonly PermissionKey[],
) {
  const configured = getConfiguredPermission(permissions, "canCreateLeads");
  if (configured !== null) {
    return configured;
  }

  return (
    accessLevel === "master_admin" ||
    accessLevel === "general_admin" ||
    accessLevel === "lead_sales_rep"
  );
}

export function canViewTechnicalLeadContext(
  accessLevel: AdminAccessLevel,
  role?: CrmUserRole | null,
  permissions?: readonly PermissionKey[],
) {
  return canManageIntegrationsAccess(accessLevel, role, permissions);
}

export function canViewLeadRecord(
  accessLevel: AdminAccessLevel,
  lead: LeadRecord,
  currentUserEmail?: string | null,
  permissions?: readonly PermissionKey[],
) {
  if (getConfiguredPermission(permissions, "canViewLeads") === false) {
    return false;
  }

  if (accessLevel !== "sales_rep" && accessLevel !== "affiliate") {
    return true;
  }

  return leadHasAssignee(
    buildLeadAssigneeList({
      primary: lead.assignedTo,
      all: lead.assignedToList,
    }).join("|"),
    currentUserEmail,
  );
}

export function canManageLeadRecord(
  accessLevel: AdminAccessLevel,
  lead: LeadRecord,
  currentUserEmail?: string | null,
  permissions?: readonly PermissionKey[],
) {
  if (getConfiguredPermission(permissions, "canEditLeads") === false) {
    return false;
  }

  if (accessLevel === "finance") {
    return false;
  }

  return canViewLeadRecord(accessLevel, lead, currentUserEmail, permissions);
}

export function canManageTeamMember(
  accessLevel: AdminAccessLevel,
  targetAccessLevel: AdminAccessLevel,
  currentUserEmail?: string | null,
  targetEmail?: string | null,
  permissions?: readonly PermissionKey[],
) {
  if (!canManageTeamRoster(accessLevel, permissions)) {
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
    return (
      targetAccessLevel === "lead_sales_rep" ||
      targetAccessLevel === "finance" ||
      targetAccessLevel === "sales_rep" ||
      targetAccessLevel === "affiliate"
    );
  }

  if (accessLevel === "lead_sales_rep") {
    return targetAccessLevel === "sales_rep" || targetAccessLevel === "affiliate";
  }

  return true;
}

export function canManageTaskRecord(
  accessLevel: AdminAccessLevel,
  task: LeadTaskRecord,
  currentUserEmail?: string | null,
  permissions?: readonly PermissionKey[],
) {
  if (getConfiguredPermission(permissions, "canEditLeads") === false) {
    return false;
  }

  if (accessLevel !== "sales_rep" && accessLevel !== "affiliate" && accessLevel !== "finance") {
    return true;
  }

  return normalizeEmail(task.assignedTo) === normalizeEmail(currentUserEmail);
}

export function scopeLeadListFilters(
  filters: LeadListFilters,
  accessLevel: AdminAccessLevel,
  currentUserEmail?: string | null,
): LeadListFilters {
  if (accessLevel !== "sales_rep" && accessLevel !== "affiliate") {
    return filters;
  }

  const email = normalizeEmail(currentUserEmail);
  const scopedFilters = { ...filters };
  delete scopedFilters.assignment;
  return {
    ...scopedFilters,
    assignedTo: email || undefined,
  };
}

export function getVisibleAdminNavKeys(
  accessLevel: AdminAccessLevel,
  role?: CrmUserRole | null,
) {
  const keys: AdminNavKey[] = ["dashboard", "leads", "tasks"];

  if (canAccessFormsWorkspace(accessLevel, role)) {
    keys.push("forms");
  }

  keys.push("notifications");

  if (canViewSalesTeam(accessLevel)) {
    keys.push("team");
  }

  if (canAccessReports(accessLevel)) {
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
