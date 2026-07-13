import bcrypt from "bcryptjs";
import {
  getChiefLoginEmail,
  isChiefLoginConfigured,
  normalizeAdminEmail,
} from "@/lib/admin-access";

const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

type LoginAttempt = {
  count: number;
  expiresAt: number;
};

const failedAttempts = new Map<string, LoginAttempt>();

function getAttempt(email: string, now = Date.now()) {
  const attempt = failedAttempts.get(email);

  if (attempt && attempt.expiresAt <= now) {
    failedAttempts.delete(email);
    return null;
  }

  return attempt ?? null;
}

function recordFailedAttempt(email: string, now = Date.now()) {
  const previous = getAttempt(email, now);
  failedAttempts.set(email, {
    count: (previous?.count ?? 0) + 1,
    expiresAt: now + ATTEMPT_WINDOW_MS,
  });
}

/**
 * Verifies the explicitly enabled owner fallback without granting access to a
 * different account. Workspace access is still checked by the Auth.js callback.
 */
export async function verifyChiefLogin(
  email: string | null | undefined,
  password: string | null | undefined,
) {
  if (!isChiefLoginConfigured() || !email || !password) {
    return null;
  }

  const normalizedEmail = normalizeAdminEmail(email);
  const chiefEmail = getChiefLoginEmail();
  const currentAttempt = getAttempt(normalizedEmail);

  if (
    !chiefEmail ||
    normalizedEmail !== chiefEmail ||
    (currentAttempt && currentAttempt.count >= MAX_FAILED_ATTEMPTS)
  ) {
    return null;
  }

  const validPassword = await bcrypt.compare(password, process.env.CHIEF_LOGIN_PASSWORD_HASH ?? "");

  if (!validPassword) {
    recordFailedAttempt(normalizedEmail);
    return null;
  }

  failedAttempts.delete(normalizedEmail);
  return {
    email: chiefEmail,
    id: chiefEmail,
    name: process.env.INITIAL_ADMIN_NAME ?? "Workspace owner",
  };
}

export function resetChiefLoginRateLimitsForTest() {
  failedAttempts.clear();
}
