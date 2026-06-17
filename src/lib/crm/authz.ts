import {
  canManageIntegrationsAccess,
  canViewLeadRecord,
  type AdminAccessLevel,
} from "@/lib/admin-permissions";
import type { CrmUserRole, LeadRecord } from "@/lib/pathway-engine/types";

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
