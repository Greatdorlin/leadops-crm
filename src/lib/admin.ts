import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { cache } from "react";
import { redirect } from "next/navigation";
import {
  getInitialAdminName,
  isAdminAuthConfigured,
  isLocalAdminPreviewEmail,
  isLocalAdminPreviewEnabled,
  isMasterAdminEmail,
  LOCAL_ADMIN_PREVIEW_EMAIL,
  LOCAL_ADMIN_PREVIEW_NAME,
} from "@/lib/admin-access";
import { getStoredAdminUserByEmail, hasAdminWorkspaceAccess } from "@/lib/admin-directory";
import {
  getStoredRoleForAccessLevel,
  resolveAdminAccessLevel,
} from "@/lib/admin-permissions";
import {
  canPreviewAdminAccess,
  getRequestedAdminAccessView,
  resolveEffectiveAdminAccessLevel,
} from "@/lib/admin-view";
import { authOptions } from "@/lib/auth";
import { isCrmConfigurationError } from "@/lib/crm/runtime";
import {
  DEFAULT_ROLE_PERMISSIONS,
  listEnabledRolePermissions,
  listEnabledUserPermissions,
} from "@/lib/crm/role-permissions";
import type { PermissionKey } from "@/lib/crm/role-permissions-contract";
import type { CrmUserRecord } from "@/lib/crm/types";
import { leadStore } from "@/lib/storage";

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function buildLocalPreviewSession(): Session {
  return {
    user: {
      email: LOCAL_ADMIN_PREVIEW_EMAIL,
      name: LOCAL_ADMIN_PREVIEW_NAME,
      image: null,
    },
    expires: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  };
}

const loadEffectivePermissions = cache(async function loadEffectivePermissions(
  role: CrmUserRecord["role"],
  userId?: string | null,
): Promise<PermissionKey[]> {
  try {
    return userId
      ? await listEnabledUserPermissions(userId, role)
      : await listEnabledRolePermissions(role);
  } catch (error) {
    const logger = isCrmConfigurationError(error) ? console.warn : console.error;
    logger("[admin:role-permissions]", error);
    return [...DEFAULT_ROLE_PERMISSIONS[role]];
  }
});

export async function getAdminSession() {
  if (!isAdminAuthConfigured()) {
    if (isLocalAdminPreviewEnabled()) {
      return buildLocalPreviewSession();
    }

    return null;
  }

  let session = null;

  try {
    session = await getServerSession(authOptions);
  } catch {
    return null;
  }

  if (!session?.user?.email || !(await hasAdminWorkspaceAccess(session.user.email))) {
    return null;
  }

  return session;
}

export async function requireAdminSession(callbackPath = "/dashboard") {
  if (!isAdminAuthConfigured()) {
    if (isLocalAdminPreviewEnabled()) {
      return buildLocalPreviewSession();
    }

    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}&error=Configuration`);
  }

  let session = null;

  try {
    session = await getServerSession(authOptions);
  } catch {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}&error=Configuration`);
  }

  if (!session?.user?.email) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  if (!(await hasAdminWorkspaceAccess(session.user.email))) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}&error=AccessDenied`);
  }

  return session;
}

export async function getAdminAccessContext(callbackPath = "/dashboard") {
  const session = await requireAdminSession(callbackPath);
  const isLocalPreview = isLocalAdminPreviewEmail(session.user?.email);
  const crmUser = isLocalPreview ? null : await getCrmUserByEmail(session.user?.email);
  const role = crmUser?.role ?? (isLocalPreview ? ("admin" satisfies CrmUserRecord["role"]) : null);
  if (!role) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}&error=AccessDenied`);
  }
  const actualAccessLevel = resolveAdminAccessLevel({
    email: session.user?.email,
    role,
  });
  const requestedAccessLevel = await getRequestedAdminAccessView();
  const accessLevel = resolveEffectiveAdminAccessLevel({
    actualAccessLevel,
    email: session.user?.email,
    requestedAccessLevel,
  });
  const permissionRole = requestedAccessLevel
    ? getStoredRoleForAccessLevel(accessLevel)
    : role;
  const permissions = isLocalPreview
    ? [...DEFAULT_ROLE_PERMISSIONS[permissionRole]]
    : await loadEffectivePermissions(permissionRole, requestedAccessLevel ? null : crmUser?.id);

  return {
    session,
    crmUser,
    role,
    actualAccessLevel,
    requestedAccessLevel,
    canSwitchAccessViews: canPreviewAdminAccess(session.user?.email),
    accessLevel,
    permissions,
  };
}

export async function getCrmUserByEmail(email?: string | null) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  try {
    const existingUser = await getStoredAdminUserByEmail(normalizedEmail);

    if (!isMasterAdminEmail(normalizedEmail)) {
      return existingUser;
    }

    const initialAdminName = getInitialAdminName();
    if (!initialAdminName) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[crm:getCrmUserByEmail] INITIAL_ADMIN_NAME is required to bootstrap the initial admin user.",
        );
      }

      return existingUser;
    }

    return await leadStore.upsertCrmUser({
      email: normalizedEmail,
      fullName: existingUser?.fullName || initialAdminName,
      role: "admin",
      isActive: true,
    });
  } catch (error) {
    const logger = isCrmConfigurationError(error) ? console.warn : console.error;
    logger("[crm:getCrmUserByEmail]", error);
    return null;
  }
}

export async function getAdminRequestContext() {
  const session = await getAdminSession();
  if (!session?.user?.email) {
    return null;
  }

  const isLocalPreview = isLocalAdminPreviewEmail(session.user.email);
  const crmUser = isLocalPreview ? null : await getCrmUserByEmail(session.user.email);
  const role = crmUser?.role ?? (isLocalPreview ? ("admin" satisfies CrmUserRecord["role"]) : null);
  if (!role) {
    return null;
  }
  const actualAccessLevel = resolveAdminAccessLevel({
    email: session.user.email,
    role,
  });
  const requestedAccessLevel = await getRequestedAdminAccessView();
  const accessLevel = resolveEffectiveAdminAccessLevel({
    actualAccessLevel,
    email: session.user.email,
    requestedAccessLevel,
  });
  const permissionRole = requestedAccessLevel
    ? getStoredRoleForAccessLevel(accessLevel)
    : role;
  const permissions = isLocalPreview
    ? [...DEFAULT_ROLE_PERMISSIONS[permissionRole]]
    : await loadEffectivePermissions(permissionRole, requestedAccessLevel ? null : crmUser?.id);

  return {
    session,
    crmUser,
    role,
    actualAccessLevel,
    requestedAccessLevel,
    canSwitchAccessViews: canPreviewAdminAccess(session.user.email),
    accessLevel,
    permissions,
  };
}
