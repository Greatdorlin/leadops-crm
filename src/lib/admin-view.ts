import { cookies } from "next/headers";
import { isMasterAdminEmail } from "@/lib/admin-access";
import {
  ADMIN_ACCESS_LEVELS,
  type AdminAccessLevel,
} from "@/lib/admin-permissions";

export const ADMIN_ACCESS_VIEW_COOKIE = "fc_admin_access_view";

export function canPreviewAdminAccess(email?: string | null) {
  return isMasterAdminEmail(email);
}

export function parseAdminAccessView(value?: string | null) {
  if (!value) {
    return null;
  }

  return ADMIN_ACCESS_LEVELS.includes(value as AdminAccessLevel)
    ? (value as AdminAccessLevel)
    : null;
}

export function resolveEffectiveAdminAccessLevel(input: {
  actualAccessLevel: AdminAccessLevel;
  email?: string | null;
  requestedAccessLevel?: string | null;
}) {
  if (!canPreviewAdminAccess(input.email)) {
    return input.actualAccessLevel;
  }

  return (
    parseAdminAccessView(input.requestedAccessLevel) ?? input.actualAccessLevel
  );
}

export async function getRequestedAdminAccessView() {
  const cookieStore = await cookies();
  return parseAdminAccessView(
    cookieStore.get(ADMIN_ACCESS_VIEW_COOKIE)?.value ?? null,
  );
}
