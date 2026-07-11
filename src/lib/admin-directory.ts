import {
  isEmailDomainAllowed,
  isInitialAdminEmail,
  normalizeAdminEmail,
} from "@/lib/admin-access";
import { isCrmConfigurationError } from "@/lib/crm/runtime";
import { leadStore } from "@/lib/storage";

export async function getStoredAdminUserByEmail(email?: string | null) {
  const normalizedEmail = email ? normalizeAdminEmail(email) : "";
  if (!normalizedEmail) {
    return null;
  }

  try {
    const user = await leadStore.getCrmUserByEmail(normalizedEmail);
    return user && user.isActive ? user : null;
  } catch (error) {
    const logger = isCrmConfigurationError(error) ? console.warn : console.error;
    logger("[admin-directory:getStoredAdminUserByEmail]", error);
    return null;
  }
}

export async function hasAdminWorkspaceAccess(email?: string | null) {
  if (!email) {
    return false;
  }

  if (!isEmailDomainAllowed(email)) {
    return false;
  }

  if (isInitialAdminEmail(email)) {
    return true;
  }

  const user = await getStoredAdminUserByEmail(email);
  return Boolean(user?.isActive);
}
