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
import type { PermissionKey } from "@/lib/crm/role-permissions-contract";
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
  permissions?: readonly PermissionKey[];
  role?: CrmUserRole | null;
};

export function hasConfiguredPermission(
  user: AdminAuthzSubject,
  permission: PermissionKey,
  fallback: boolean,
) {
  if (user.permissions) {
    return user.permissions.includes(permission);
  }

  return fallback;
}

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
    case "finance":
      return "Finance";
    case "affiliate":
      return "Affiliate";
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
  permissions?: readonly PermissionKey[],
) {
  return hasConfiguredPermission(
    { accessLevel, role, permissions },
    "canManageIntegrations",
    canManageIntegrationsAccess(accessLevel, role),
  );
}

export function canAccessAdmin(user: AdminAuthzSubject) {
  return Boolean(user.email && user.accessLevel);
}

export function canManageUsers(user: AdminAuthzSubject) {
  return hasConfiguredPermission(
    user,
    "canManageUsers",
    hasRoleAtLeast(user, "admin") || resolveRole(user) === "team_lead",
  );
}

export function canExportLeads(user: AdminAuthzSubject) {
  const normalizedEmail = user.email ? normalizeAdminEmail(user.email) : "";

  const legacyAllowed =
    hasRoleAtLeast(user, "admin") ||
    isMasterAdminEmail(normalizedEmail) ||
    Boolean(normalizedEmail && getLeadExportAllowedEmails().includes(normalizedEmail));
  return hasConfiguredPermission(user, "canExportLeads", legacyAllowed);
}

export function canViewAllLeads(user: AdminAuthzSubject) {
  return hasRoleAtLeast(user, "team_lead");
}

export function canAssignLeads(user: AdminAuthzSubject) {
  if (!user.accessLevel) {
    return false;
  }

  return hasConfiguredPermission(
    user,
    "canAssignLeads",
    canAssignLeadOwners(user.accessLevel),
  );
}

export function canManageAdminSettings(user: AdminAuthzSubject) {
  if (!user.accessLevel) {
    return false;
  }

  return hasConfiguredPermission(
    user,
    "canManageSettings",
    canManageSettings(user.accessLevel, user.role),
  );
}

export function canManageCustomFields(user: AdminAuthzSubject) {
  const role = resolveRole(user);
  return hasConfiguredPermission(
    user,
    "canManageCustomFields",
    role === "owner" || role === "admin",
  );
}

export function canManageFormSources(user: AdminAuthzSubject) {
  const role = resolveRole(user);
  return hasConfiguredPermission(
    user,
    "canManageSources",
    role === "owner" || role === "admin",
  );
}

export function canManageForms(user: AdminAuthzSubject) {
  return hasConfiguredPermission(user, "canManageForms", canManageFormSources(user));
}

export function canManageLeadStages(user: AdminAuthzSubject) {
  const role = resolveRole(user);
  return hasConfiguredPermission(
    user,
    "canManageStages",
    role === "owner" || role === "admin",
  );
}

export function canManageLeadSources(user: AdminAuthzSubject) {
  const role = resolveRole(user);
  return hasConfiguredPermission(
    user,
    "canManageSources",
    role === "owner" || role === "admin",
  );
}

export function canManageSalesTargets(user: AdminAuthzSubject) {
  const role = resolveRole(user);
  return hasConfiguredPermission(
    user,
    "canManageSettings",
    role === "owner" || role === "admin",
  );
}

export function canManageAppearanceSettings(user: AdminAuthzSubject) {
  return hasConfiguredPermission(
    user,
    "canManageAppearance",
    canManageSalesTargets(user),
  );
}

export function canManageNavigationSettings(user: AdminAuthzSubject) {
  return hasConfiguredPermission(
    user,
    "canManageNavigation",
    canManageSalesTargets(user),
  );
}

export function canManageLeadPreviewSettings(user: AdminAuthzSubject) {
  return hasConfiguredPermission(
    user,
    "canManageLeadPreview",
    canManageSalesTargets(user),
  );
}

export function canManageDashboardSettings(user: AdminAuthzSubject) {
  return hasConfiguredPermission(
    user,
    "canManageDashboard",
    canManageSalesTargets(user),
  );
}

export function canManageIndustryPresets(user: AdminAuthzSubject) {
  return hasConfiguredPermission(
    user,
    "canManageIndustryPresets",
    canManageSalesTargets(user),
  );
}

export function canManageCurrencySettings(user: AdminAuthzSubject) {
  return hasConfiguredPermission(
    user,
    "canManageCurrency",
    canManageSalesTargets(user),
  );
}

export function canManageBranches(user: AdminAuthzSubject) {
  const role = resolveRole(user);
  return hasConfiguredPermission(
    user,
    "canManageBranches",
    role === "owner" || role === "admin",
  );
}

export function canAccessAffiliateDashboard(user: AdminAuthzSubject) {
  return hasConfiguredPermission(
    user,
    "canAccessAffiliateDashboard",
    resolveRole(user) === "affiliate",
  );
}

export function canReviewApprovalRequests(user: AdminAuthzSubject) {
  const role = resolveRole(user);
  return hasConfiguredPermission(
    user,
    "canReviewApprovals",
    role === "owner" || role === "admin",
  );
}

export function canVerifyPaymentClaims(user: AdminAuthzSubject) {
  const role = resolveRole(user);
  return hasConfiguredPermission(
    user,
    "canVerifyPayments",
    role === "owner" || role === "admin" || role === "finance",
  );
}

export function canViewIntakeLogs(user: AdminAuthzSubject) {
  return hasConfiguredPermission(
    user,
    "canManageIntegrations",
    hasRoleAtLeast(user, "admin"),
  );
}

export function canViewSystemStatus(user: AdminAuthzSubject) {
  return hasConfiguredPermission(
    user,
    "canManageSettings",
    hasRoleAtLeast(user, "admin"),
  );
}

export function canManageTeamScope(user: AdminAuthzSubject) {
  return hasConfiguredPermission(
    user,
    "canManageUsers",
    hasRoleAtLeast(user, "team_lead"),
  );
}

export function canManageBranchScope(user: AdminAuthzSubject) {
  return hasConfiguredPermission(
    user,
    "canManageBranches",
    hasRoleAtLeast(user, "manager"),
  );
}

export function canManageDepartmentScope(user: AdminAuthzSubject) {
  return hasConfiguredPermission(
    user,
    "canManageUsers",
    hasRoleAtLeast(user, "manager"),
  );
}

export function canViewReports(user: AdminAuthzSubject) {
  return hasConfiguredPermission(
    user,
    "canViewReports",
    Boolean(user.accessLevel && user.accessLevel !== "affiliate" && user.accessLevel !== "finance"),
  );
}

export function canViewLeads(user: AdminAuthzSubject) {
  return hasConfiguredPermission(user, "canViewLeads", Boolean(user.accessLevel));
}

export function canCreateLeads(user: AdminAuthzSubject) {
  return hasConfiguredPermission(user, "canCreateLeads", Boolean(user.accessLevel));
}

export function canEditLeads(user: AdminAuthzSubject) {
  return hasConfiguredPermission(
    user,
    "canEditLeads",
    Boolean(user.accessLevel && user.accessLevel !== "finance"),
  );
}

export function canDeleteLeads(user: AdminAuthzSubject) {
  return hasConfiguredPermission(
    user,
    "canDeleteLeads",
    Boolean(user.accessLevel && canAssignLeadOwners(user.accessLevel)),
  );
}
