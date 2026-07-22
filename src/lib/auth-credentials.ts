import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { normalizeAdminEmail } from "@/lib/admin-access";
import { getDb } from "@/lib/db/client";
import { crmUsers, userCredentials, userInvitations } from "@/lib/db/schema";
import { recordWorkspaceAuditEvent } from "@/lib/crm/workspace-audit";

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const DEFAULT_INVITATION_TTL_HOURS = 72;
const DUMMY_PASSWORD_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.5tB6G2QaBL9U.Jq0TgFl7YQh9ZqG5K2";

export const GENERIC_SIGN_IN_ERROR = "We couldn't verify those sign-in details.";
export const GENERIC_ACTIVATION_ERROR = "This activation link is invalid or has expired.";

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createInvitationToken() {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashInvitationToken(token) };
}

export function validateNewPassword(password: string) {
  if (password.length < 12 || password.length > 128) {
    return false;
  }

  return /[A-Za-z]/.test(password) && /\d/.test(password);
}

export function getInvitationTtlHours(value = process.env.AUTH_INVITATION_TTL_HOURS) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 168
    ? parsed
    : DEFAULT_INVITATION_TTL_HOURS;
}

export function getActivationBaseUrl(environment: NodeJS.ProcessEnv = process.env) {
  const configured = environment.NEXTAUTH_URL?.trim() || environment.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) {
    return null;
  }

  try {
    return new URL(configured).origin;
  } catch {
    return null;
  }
}

export async function issueUserInvitation(input: {
  userId: string;
  createdBy: string;
  baseUrl?: string | null;
  now?: Date;
}) {
  const db = getDb();
  const now = input.now ?? new Date();
  const baseUrl = input.baseUrl ?? getActivationBaseUrl();
  if (!baseUrl) {
    throw new Error("A valid NEXTAUTH_URL or NEXT_PUBLIC_APP_URL is required to issue invitations.");
  }

  const { token, tokenHash } = createInvitationToken();
  const expiresAt = new Date(now.getTime() + getInvitationTtlHours() * 60 * 60 * 1000);

  await db.transaction(async (transaction) => {
    const user = await transaction.query.crmUsers.findFirst({
      columns: { id: true },
      where: eq(crmUsers.id, input.userId),
    });
    if (!user) {
      throw new Error("Workspace user not found.");
    }

    await transaction
      .update(userInvitations)
      .set({ usedAt: now })
      .where(and(eq(userInvitations.userId, input.userId), isNull(userInvitations.usedAt)));
    await transaction.insert(userInvitations).values({
      userId: input.userId,
      tokenHash,
      expiresAt,
      createdBy: normalizeAdminEmail(input.createdBy),
      createdAt: now,
    });
  });

  const activationUrl = new URL("/activate", baseUrl);
  activationUrl.searchParams.set("token", token);
  return { activationUrl: activationUrl.toString(), expiresAt };
}

export async function activateInvitation(token: string, password: string, now = new Date()) {
  if (!token || !validateNewPassword(password)) {
    return false;
  }

  const tokenHash = hashInvitationToken(token);
  const db = getDb();

  const [eligibleInvitation] = await db
    .select({ id: userInvitations.id })
    .from(userInvitations)
    .innerJoin(crmUsers, eq(crmUsers.id, userInvitations.userId))
    .where(
      and(
        eq(userInvitations.tokenHash, tokenHash),
        isNull(userInvitations.usedAt),
        gt(userInvitations.expiresAt, now),
        eq(crmUsers.isActive, true),
      ),
    )
    .limit(1);
  if (!eligibleInvitation) {
    return false;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  return db.transaction(async (transaction) => {
    const [consumed] = await transaction
      .update(userInvitations)
      .set({ usedAt: now })
      .where(
        and(
          eq(userInvitations.id, eligibleInvitation.id),
          eq(userInvitations.tokenHash, tokenHash),
          isNull(userInvitations.usedAt),
          gt(userInvitations.expiresAt, now),
          sql`exists (
            select 1 from ${crmUsers}
            where ${crmUsers.id} = ${userInvitations.userId}
              and ${crmUsers.isActive} = true
          )`,
        ),
      )
      .returning({ id: userInvitations.id, userId: userInvitations.userId });
    if (!consumed) {
      return false;
    }

    await transaction
      .insert(userCredentials)
      .values({
        userId: consumed.userId,
        passwordHash,
        failedLoginCount: 0,
        lockedUntil: null,
        passwordSetAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userCredentials.userId,
        set: {
          passwordHash,
          failedLoginCount: 0,
          lockedUntil: null,
          passwordSetAt: now,
          updatedAt: now,
        },
      });

    return true;
  });
}

export async function verifyUserPassword(email?: string | null, password?: string | null) {
  const normalizedEmail = normalizeAdminEmail(email ?? "");
  if (!normalizedEmail || !password) {
    return null;
  }

  const db = getDb();
  const [record] = await db
    .select({
      userId: crmUsers.id,
      email: crmUsers.email,
      fullName: crmUsers.fullName,
      isActive: crmUsers.isActive,
      passwordHash: userCredentials.passwordHash,
      failedLoginCount: userCredentials.failedLoginCount,
      lockedUntil: userCredentials.lockedUntil,
    })
    .from(crmUsers)
    .innerJoin(userCredentials, eq(userCredentials.userId, crmUsers.id))
    .where(eq(crmUsers.email, normalizedEmail))
    .limit(1);

  const passwordMatches = await bcrypt.compare(password, record?.passwordHash ?? DUMMY_PASSWORD_HASH);
  const now = new Date();
  if (!record || !record.isActive || (record.lockedUntil && record.lockedUntil > now)) {
    return null;
  }

  if (!passwordMatches) {
    await db
      .update(userCredentials)
      .set({
        failedLoginCount: sql`${userCredentials.failedLoginCount} + 1`,
        lockedUntil: sql`case when ${userCredentials.failedLoginCount} + 1 >= ${MAX_FAILED_ATTEMPTS} then now() + (${LOCKOUT_MINUTES} * interval '1 minute') else ${userCredentials.lockedUntil} end`,
        updatedAt: now,
      })
      .where(eq(userCredentials.userId, record.userId));
    return null;
  }

  await db
    .update(userCredentials)
    .set({ failedLoginCount: 0, lockedUntil: null, updatedAt: now })
    .where(eq(userCredentials.userId, record.userId));

  return { id: record.userId, email: record.email, name: record.fullName };
}

export async function changeAuthenticatedUserPassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}) {
  if (!input.userId || !input.currentPassword || !validateNewPassword(input.newPassword)) {
    return false;
  }

  const db = getDb();
  const [record] = await db
    .select({
      userId: crmUsers.id,
      email: crmUsers.email,
      isActive: crmUsers.isActive,
      passwordHash: userCredentials.passwordHash,
    })
    .from(crmUsers)
    .innerJoin(userCredentials, eq(userCredentials.userId, crmUsers.id))
    .where(eq(crmUsers.id, input.userId))
    .limit(1);

  const currentMatches = await bcrypt.compare(
    input.currentPassword,
    record?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );
  if (!record?.isActive || !currentMatches) {
    return false;
  }

  if (await bcrypt.compare(input.newPassword, record.passwordHash)) {
    return false;
  }

  const now = new Date();
  const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
  await db.transaction(async (transaction) => {
    await transaction
      .update(userCredentials)
      .set({
        passwordHash,
        failedLoginCount: 0,
        lockedUntil: null,
        passwordSetAt: now,
        updatedAt: now,
      })
      .where(eq(userCredentials.userId, record.userId));

    await recordWorkspaceAuditEvent({
      eventType: "account.password_changed",
      actorEmail: record.email,
      actorUserId: record.userId,
      targetType: "user",
      targetId: record.userId,
      details: { selfService: true },
    }, transaction);
  });

  return true;
}
