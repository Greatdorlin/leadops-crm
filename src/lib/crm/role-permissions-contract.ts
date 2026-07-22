import type { CrmUserRole } from "@/lib/crm/types";

export const PERMISSION_DEFINITIONS = [
  { key: "canViewLeads", label: "View leads", description: "Access the leads list and detail pages.", category: "Leads" },
  { key: "canCreateLeads", label: "Create leads", description: "Add new leads manually or via import.", category: "Leads" },
  { key: "canEditLeads", label: "Edit leads", description: "Update lead details, status, and assignments.", category: "Leads" },
  { key: "canDeleteLeads", label: "Delete leads", description: "Soft-delete leads to trash.", category: "Leads" },
  { key: "canAssignLeads", label: "Assign leads", description: "Reassign leads to other team members.", category: "Leads" },
  { key: "canExportLeads", label: "Export leads", description: "Export lead data to CSV or other formats.", category: "Leads" },
  { key: "canViewReports", label: "View reports", description: "Access reports and sales analytics.", category: "Reports" },
  { key: "canManageUsers", label: "Manage team", description: "Add, edit, or deactivate team members.", category: "Team" },
  { key: "canManageSettings", label: "Manage settings", description: "Change workspace-wide settings.", category: "Settings" },
  { key: "canResetWorkspace", label: "Reset workspace settings", description: "Restore workspace appearance and layout defaults without deleting business data.", category: "Settings" },
  { key: "canManageIntegrations", label: "Manage integrations", description: "Configure lead and marketing connections.", category: "Settings" },
  { key: "canManageForms", label: "Manage forms", description: "Create, edit, and embed lead capture forms.", category: "Customization" },
  { key: "canManageCustomFields", label: "Manage custom fields", description: "Add or edit custom fields on leads.", category: "Customization" },
  { key: "canManageStages", label: "Manage stages", description: "Add, edit, or reorder lead pipeline stages.", category: "Customization" },
  { key: "canManageSources", label: "Manage sources", description: "Add or edit lead source definitions.", category: "Customization" },
  { key: "canManageBranches", label: "Manage branches", description: "Add or edit branch locations.", category: "Customization" },
  { key: "canManageCurrency", label: "Manage currency", description: "Set workspace and branch currency.", category: "Customization" },
  { key: "canManageIndustryPresets", label: "Apply industry presets", description: "Apply pre-built workspace configurations.", category: "Customization" },
  { key: "canManageDashboard", label: "Customize dashboard", description: "Configure dashboard widgets and layouts.", category: "Customization" },
  { key: "canManageAppearance", label: "Customize appearance", description: "Change colors, logos, and branding.", category: "Customization" },
  { key: "canManageNavigation", label: "Customize navigation", description: "Show or hide sidebar items.", category: "Customization" },
  { key: "canManageLeadPreview", label: "Customize lead preview", description: "Choose context fields shown in the queue.", category: "Customization" },
  { key: "canAccessAffiliateDashboard", label: "Access affiliate dashboard", description: "View affiliate metrics and referrals.", category: "Affiliate" },
  { key: "canVerifyPayments", label: "Verify payments", description: "Review and approve payment claims.", category: "Finance" },
  { key: "canReviewApprovals", label: "Review approvals", description: "Approve or reject lead and user requests.", category: "Management" },
] as const;

export type PermissionKey = (typeof PERMISSION_DEFINITIONS)[number]["key"];

export const ROLE_PERMISSION_ROLES = [
  "admin",
  "manager",
  "ad_manager",
  "consultant",
  "finance",
  "affiliate",
  "sales_agent",
] as const satisfies readonly CrmUserRole[];

export function isPermissionKey(value: unknown): value is PermissionKey {
  return (
    typeof value === "string" &&
    PERMISSION_DEFINITIONS.some((permission) => permission.key === value)
  );
}

export function isPermissionRole(value: unknown): value is CrmUserRole {
  return (
    typeof value === "string" &&
    ROLE_PERMISSION_ROLES.includes(value as CrmUserRole)
  );
}

export const DEFAULT_ROLE_PERMISSIONS: Record<CrmUserRole, PermissionKey[]> = {
  admin: PERMISSION_DEFINITIONS.map((permission) => permission.key).filter((permission) => permission !== "canResetWorkspace"),
  manager: [
    "canViewLeads", "canCreateLeads", "canEditLeads", "canDeleteLeads", "canAssignLeads",
    "canExportLeads", "canViewReports", "canManageUsers", "canManageSettings",
    "canManageForms", "canManageCustomFields", "canManageStages", "canManageSources",
    "canManageBranches", "canManageCurrency", "canManageIndustryPresets",
    "canManageDashboard", "canManageAppearance", "canManageNavigation", "canManageLeadPreview",
    "canReviewApprovals",
  ],
  ad_manager: [
    "canViewLeads", "canCreateLeads", "canEditLeads", "canAssignLeads",
    "canExportLeads", "canViewReports", "canManageForms", "canManageCustomFields",
    "canManageStages", "canManageSources", "canManageDashboard",
  ],
  consultant: [
    "canViewLeads", "canCreateLeads", "canEditLeads", "canAssignLeads",
    "canExportLeads", "canViewReports", "canManageUsers", "canManageForms",
    "canManageCustomFields", "canManageStages", "canManageSources", "canManageDashboard",
  ],
  finance: [
    "canViewLeads", "canEditLeads", "canExportLeads", "canViewReports", "canVerifyPayments",
  ],
  affiliate: ["canViewLeads", "canCreateLeads", "canAccessAffiliateDashboard"],
  sales_agent: ["canViewLeads", "canCreateLeads", "canEditLeads"],
};

export function resolvePermissionList(
  permissions: readonly PermissionKey[] | null | undefined,
  fallbackRole: CrmUserRole,
): readonly PermissionKey[] {
  return permissions ?? DEFAULT_ROLE_PERMISSIONS[fallbackRole];
}

export function applyPermissionOverrides(
  rolePermissions: readonly PermissionKey[],
  overrides: readonly { permission: string; enabled: boolean }[],
): PermissionKey[] {
  const resolved = new Set(rolePermissions);

  for (const override of overrides) {
    if (!isPermissionKey(override.permission)) {
      continue;
    }

    if (override.enabled) {
      resolved.add(override.permission);
    } else {
      resolved.delete(override.permission);
    }
  }

  return PERMISSION_DEFINITIONS
    .map((permission) => permission.key)
    .filter((permission) => resolved.has(permission));
}
