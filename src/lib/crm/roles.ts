import type { AdminAccessLevel } from "@/lib/admin-permissions";
import type { CrmUserRole } from "@/lib/crm/types";

export const LEADS_DESK_ROLES = [
  "owner",
  "admin",
  "manager",
  "team_lead",
  "finance",
  "sales_rep",
  "affiliate",
] as const;

export const PERMISSION_SCOPES = [
  "global",
  "branch",
  "department",
  "team",
  "own",
] as const;

export type LeadsDeskRole = (typeof LEADS_DESK_ROLES)[number];
export type PermissionScope = (typeof PERMISSION_SCOPES)[number];

const ACCESS_LEVEL_ROLE_MAP: Record<AdminAccessLevel, LeadsDeskRole> = {
  master_admin: "owner",
  general_admin: "admin",
  lead_sales_rep: "team_lead",
  finance: "finance",
  sales_rep: "sales_rep",
  affiliate: "affiliate",
};

const LEGACY_CRM_ROLE_MAP: Record<CrmUserRole, LeadsDeskRole> = {
  admin: "owner",
  manager: "manager",
  sales_agent: "sales_rep",
  ad_manager: "manager",
  consultant: "team_lead",
  finance: "finance",
  affiliate: "affiliate",
};

const ROLE_LABELS: Record<LeadsDeskRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  team_lead: "Team Lead",
  finance: "Finance",
  sales_rep: "Sales Rep",
  affiliate: "Affiliate",
};

const ROLE_RANKS: Record<LeadsDeskRole, number> = {
  affiliate: 5,
  sales_rep: 10,
  finance: 15,
  team_lead: 20,
  manager: 30,
  admin: 40,
  owner: 50,
};

const DEFAULT_ROLE_SCOPES: Record<LeadsDeskRole, PermissionScope> = {
  owner: "global",
  admin: "global",
  manager: "branch",
  team_lead: "team",
  finance: "global",
  sales_rep: "own",
  affiliate: "own",
};

export type RoleResolutionInput = {
  accessLevel?: AdminAccessLevel | null;
  role?: CrmUserRole | null;
};

export function mapLegacyAccessLevelToRole(accessLevel?: AdminAccessLevel | null) {
  return accessLevel ? ACCESS_LEVEL_ROLE_MAP[accessLevel] ?? null : null;
}

export function mapLegacyCrmRoleToRole(role?: CrmUserRole | null) {
  return role ? LEGACY_CRM_ROLE_MAP[role] ?? null : null;
}

export function normalizeRole(value?: string | null): LeadsDeskRole | null {
  if (!value) {
    return null;
  }

  if (LEADS_DESK_ROLES.includes(value as LeadsDeskRole)) {
    return value as LeadsDeskRole;
  }

  return (
    mapLegacyAccessLevelToRole(value as AdminAccessLevel) ??
    mapLegacyCrmRoleToRole(value as CrmUserRole) ??
    null
  );
}

export function resolveLeadsDeskRole(input: RoleResolutionInput): LeadsDeskRole | null {
  return (
    mapLegacyAccessLevelToRole(input.accessLevel) ??
    mapLegacyCrmRoleToRole(input.role) ??
    null
  );
}

export function getRoleLabel(role?: LeadsDeskRole | null) {
  return role ? ROLE_LABELS[role] : "Team member";
}

export function getRoleRank(role?: LeadsDeskRole | null) {
  return role ? ROLE_RANKS[role] ?? 0 : 0;
}

export function hasRoleAtLeast(
  input: LeadsDeskRole | RoleResolutionInput | null | undefined,
  minimumRole: LeadsDeskRole,
) {
  const resolvedRole =
    typeof input === "string" ? normalizeRole(input) : resolveLeadsDeskRole(input ?? {});

  return getRoleRank(resolvedRole) >= getRoleRank(minimumRole);
}

export function getDefaultPermissionScope(role?: LeadsDeskRole | null) {
  return role ? DEFAULT_ROLE_SCOPES[role] : "own";
}
