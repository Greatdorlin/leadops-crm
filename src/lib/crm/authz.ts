import {
  canAssignLeadOwners,
  canManageSettings,
  canManageIntegrationsAccess,
  canViewLeadRecord,
  type AdminAccessLevel,
} from "@/lib/admin-permissions";
import {
  getLeadExportAllowedEmails,
  isMasterAdminEmail,
  normalizeAdminEmail,
} from "@/lib/admin-access";
import type { CrmUserRole, LeadRecord } from "@/lib/crm/types";
import {
  getDefaultPermissionScope,
  hasRoleAtLeast,
  resolveLeadsDeskRole,
  type LeadsDeskRole,
  type PermissionScope,
} from "@/lib/crm/roles";

type AdminAuthzSubject = {
  accessLevel?: AdminAccessLevel | null;
  email?: string | null;
  role?: CrmUserRole | null;
};

export function resolveRole(input: AdminAuthzSubject) {
  return resolveLeadsDeskRole(input);
}

export function getRoleLabel(input: LeadsDeskRole | AdminAuthzSubject | null | undefined) {
  const role = typeof input === "string" ? input : resolveRole(input ?? {});
  if (!role) {
    return "Team member";
  }

  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "team_lead":
      return "Team Lead";
    case "sales_rep":
    default:
      return "Sales Rep";
  }
}

export function getPermissionScope(input: AdminAuthzSubject): PermissionScope {
  return getDefaultPermissionScope(resolveRole(input));
}

export function canViewLead(
  accessLevel: AdminAccessLevel,
  lead: LeadRecord,
  currentUserEmail?: string | null,
) {
  return canViewLeadRecord(accessLevel, lead, currentUserEmail);
}

export function canManageIntegrations(
  accessLevel: AdminAccessLevel,
  role?: CrmUserRole | null,
) {
  return canManageIntegrationsAccess(accessLevel, role);
}

export function canAccessAdmin(user: AdminAuthzSubject) {
  return Boolean(user.email && user.accessLevel);
}

export function canManageUsers(user: AdminAuthzSubject) {
  return (
    hasRoleAtLeast(user, "admin") ||
    resolveRole(user) === "team_lead"
  );
}

export function canExportLeads(user: AdminAuthzSubject) {
  const normalizedEmail = user.email ? normalizeAdminEmail(user.email) : "";

  if (hasRoleAtLeast(user, "admin") || isMasterAdminEmail(normalizedEmail)) {
    return true;
  }

  if (!normalizedEmail) {
    return false;
  }

  return getLeadExportAllowedEmails().includes(normalizedEmail);
}

export function canViewAllLeads(user: AdminAuthzSubject) {
  return hasRoleAtLeast(user, "team_lead");
}

export function canAssignLeads(user: AdminAuthzSubject) {
  if (!user.accessLevel) {
    return false;
  }

  return canAssignLeadOwners(user.accessLevel);
}

export function canManageAdminSettings(user: AdminAuthzSubject) {
  if (!user.accessLevel) {
    return false;
  }

  return canManageSettings(user.accessLevel, user.role);
}

export function canManageCustomFields(user: AdminAuthzSubject) {
  const role = resolveRole(user);
  return role === "owner" || role === "admin";
}

export function canManageFormSources(user: AdminAuthzSubject) {
  const role = resolveRole(user);
  return role === "owner" || role === "admin";
}

export function canManageLeadStages(user: AdminAuthzSubject) {
  const role = resolveRole(user);
  return role === "owner" || role === "admin";
}

export function canManageLeadSources(user: AdminAuthzSubject) {
  const role = resolveRole(user);
  return role === "owner" || role === "admin";
}

export function canManageSalesTargets(user: AdminAuthzSubject) {
  const role = resolveRole(user);
  return role === "owner" || role === "admin";
}

export function canManageAppearanceSettings(user: AdminAuthzSubject) {
  return canManageSalesTargets(user);
}

export function canManageNavigationSettings(user: AdminAuthzSubject) {
  return canManageSalesTargets(user);
}

export function canManageLeadPreviewSettings(user: AdminAuthzSubject) {
  return canManageSalesTargets(user);
}

export function canManageDashboardSettings(user: AdminAuthzSubject) {
  return canManageSalesTargets(user);
}

export function canManageIndustryPresets(user: AdminAuthzSubject) {
  return canManageSalesTargets(user);
}

export function canViewIntakeLogs(user: AdminAuthzSubject) {
  return hasRoleAtLeast(user, "admin");
}

export function canViewSystemStatus(user: AdminAuthzSubject) {
  return hasRoleAtLeast(user, "admin");
}

export function canManageTeamScope(user: AdminAuthzSubject) {
  return hasRoleAtLeast(user, "team_lead");
}

export function canManageBranchScope(user: AdminAuthzSubject) {
  return hasRoleAtLeast(user, "manager");
}

export function canManageDepartmentScope(user: AdminAuthzSubject) {
  return hasRoleAtLeast(user, "manager");
}
