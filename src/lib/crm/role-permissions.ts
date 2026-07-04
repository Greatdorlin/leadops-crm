import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { rolePermissions } from "@/lib/db/schema";
import type { CrmUserRole } from "@/lib/crm/types";
import { and, asc, sql } from "drizzle-orm";

export const PERMISSION_DEFINITIONS = [
  { key: "canViewLeads", label: "View leads", description: "Access the leads list and detail pages.", category: "Leads" },
  { key: "canCreateLeads", label: "Create leads", description: "Add new leads manually or via import.", category: "Leads" },
  { key: "canEditLeads", label: "Edit leads", description: "Update lead details, status, and assignments.", category: "Leads" },
  { key: "canDeleteLeads", label: "Delete leads", description: "Soft-delete leads to trash.", category: "Leads" },
  { key: "canAssignLeads", label: "Assign leads", description: "Reassign leads to other team members.", category: "Leads" },
  { key: "canExportLeads", label: "Export leads", description: "Export lead data to CSV or other formats.", category: "Leads" },
  { key: "canViewReports", label: "View reports", description: "Access the reports and analytics dashboard.", category: "Reports" },
  { key: "canManageUsers", label: "Manage team", description: "Add, edit, or deactivate team members.", category: "Team" },
  { key: "canManageSettings", label: "Manage settings", description: "Change system-wide settings.", category: "Settings" },
  { key: "canManageIntegrations", label: "Manage integrations", description: "Configure ad platform and webhook integrations.", category: "Settings" },
  { key: "canManageForms", label: "Manage forms", description: "Create, edit, and embed lead capture forms.", category: "Customization" },
  { key: "canManageCustomFields", label: "Manage custom fields", description: "Add or edit custom fields on leads.", category: "Customization" },
  { key: "canManageStages", label: "Manage stages", description: "Add, edit, or reorder lead pipeline stages.", category: "Customization" },
  { key: "canManageSources", label: "Manage sources", description: "Add or edit lead source definitions.", category: "Customization" },
  { key: "canManageBranches", label: "Manage branches", description: "Add or edit branch locations.", category: "Customization" },
  { key: "canManageCurrency", label: "Manage currency", description: "Set global and per-branch currency.", category: "Customization" },
  { key: "canManageIndustryPresets", label: "Apply industry presets", description: "Apply pre-built vertical configurations.", category: "Customization" },
  { key: "canManageDashboard", label: "Customize dashboard", description: "Configure dashboard widgets and layouts.", category: "Customization" },
  { key: "canManageAppearance", label: "Customize appearance", description: "Change colors, logos, and branding.", category: "Customization" },
  { key: "canManageNavigation", label: "Customize navigation", description: "Show or hide sidebar items.", category: "Customization" },
  { key: "canManageLeadPreview", label: "Customize lead preview", description: "Choose fields shown on lead cards.", category: "Customization" },
  { key: "canAccessAffiliateDashboard", label: "Access affiliate dashboard", description: "View affiliate-specific metrics and referrals.", category: "Affiliate" },
  { key: "canVerifyPayments", label: "Verify payments", description: "Review and approve payment claims.", category: "Finance" },
  { key: "canReviewApprovals", label: "Review approvals", description: "Approve or reject lead and user requests.", category: "Management" },
] as const;

export type PermissionKey = (typeof PERMISSION_DEFINITIONS)[number]["key"];

export const DEFAULT_ROLE_PERMISSIONS: Record<CrmUserRole, PermissionKey[]> = {
  admin: [
    "canViewLeads", "canCreateLeads", "canEditLeads", "canDeleteLeads", "canAssignLeads",
    "canExportLeads", "canViewReports", "canManageUsers", "canManageSettings",
    "canManageIntegrations", "canManageForms", "canManageCustomFields", "canManageStages",
    "canManageSources", "canManageBranches", "canManageCurrency", "canManageIndustryPresets",
    "canManageDashboard", "canManageAppearance", "canManageNavigation", "canManageLeadPreview",
    "canAccessAffiliateDashboard", "canVerifyPayments", "canReviewApprovals",
  ],
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
    "canExportLeads", "canViewReports",
    "canManageForms", "canManageCustomFields", "canManageStages", "canManageSources",
    "canManageDashboard",
  ],
  consultant: [
    "canViewLeads", "canCreateLeads", "canEditLeads", "canAssignLeads",
    "canExportLeads", "canViewReports", "canManageUsers",
    "canManageForms", "canManageCustomFields", "canManageStages", "canManageSources",
    "canManageDashboard",
  ],
  finance: [
    "canViewLeads", "canEditLeads", "canExportLeads", "canViewReports",
    "canVerifyPayments",
  ],
  affiliate: [
    "canAccessAffiliateDashboard",
  ],
  sales_agent: [
    "canViewLeads", "canCreateLeads", "canEditLeads",
  ],
};

export async function seedRolePermissions() {
  const db = getDb();
  const existing = await db.select({ count: sql<number>`count(*)` }).from(rolePermissions);
  if (Number(existing[0]?.count ?? 0) > 0) {
    return;
  }

  const entries: { role: CrmUserRole; permission: string; enabled: boolean }[] = [];
  for (const [role, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS) as [CrmUserRole, PermissionKey[]][]) {
    for (const def of PERMISSION_DEFINITIONS) {
      entries.push({
        role,
        permission: def.key,
        enabled: perms.includes(def.key as PermissionKey),
      });
    }
  }

  await db.insert(rolePermissions).values(entries);
}

export async function getRolePermission(role: CrmUserRole, permission: PermissionKey) {
  const db = getDb();
  const row = await db.query.rolePermissions.findFirst({
    where: (rp) => and(eq(rp.role, role), eq(rp.permission, permission)),
  });
  return row?.enabled ?? DEFAULT_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export async function listRolePermissions() {
  const db = getDb();
  return db.query.rolePermissions.findMany({
    orderBy: [asc(rolePermissions.role), asc(rolePermissions.permission)],
  });
}

export async function setRolePermission(role: CrmUserRole, permission: PermissionKey, enabled: boolean) {
  const db = getDb();
  await db
    .insert(rolePermissions)
    .values({ role, permission, enabled })
    .onConflictDoUpdate({
      target: [rolePermissions.role, rolePermissions.permission],
      set: { enabled, updatedAt: new Date() },
    });
}

export async function resetRolePermissionsToDefaults() {
  const db = getDb();
  await db.delete(rolePermissions);
  await seedRolePermissions();
}
