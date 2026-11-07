import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { crmUsers, userCredentials, workspaceAuditLogs, assistantTokens } from '@/lib/db/schema';
import { decryptMessage, encryptMessage, encryptionReady } from '@/lib/inbox/crypto';
import { generateSecret, matchingStep, recoveryHash, generateRecoveryCodes } from './totp';
export async function mfaVersion(email: string) { const [row] = await getDb().select({ enabledAt: userCredentials.mfaChangedAt }).from(userCredentials).innerJoin(crmUsers, eq(crmUsers.id, userCredentials.userId)).where(eq(crmUsers.email, email.toLowerCase().trim())).limit(1); return row?.enabledAt?.toISOString() ?? 'none'; }
export async function mfaStatus(userId: string) { const [row] = await getDb().select({ enabledAt: userCredentials.mfaEnabledAt, hashes: userCredentials.mfaRecoveryHashes }).from(userCredentials).where(eq(userCredentials.userId, userId)).limit(1); return { enabled: !!row?.enabledAt, enabledAt: row?.enabledAt?.toISOString() ?? null, recoveryCodesRemaining: row?.hashes.length ?? 0, available: encryptionReady() }; }
export async function startMfa(userId: string) { if (!encryptionReady())
    throw new Error('The workspace encryption key must be configured before enabling two-factor authentication.'); const secret = generateSecret(); const [saved] = await getDb().update(userCredentials).set({ mfaPendingCipher: encryptMessage(secret, `mfa:${userId}`), mfaPendingExpiresAt: new Date(Date.now() + 5 * 60000) }).where(and(eq(userCredentials.userId, userId), sql `${userCredentials.mfaEnabledAt} is null`)).returning({ id: userCredentials.userId }); if (!saved)
    throw new Error('Two-factor authentication is already enabled, or this account needs a password first.'); return secret; }
export async function checkMfa(userId: string, code: string, operation: 'login' | 'enable' | 'disable' = 'login') {
    return getDb().transaction(async (tx) => {
        const [row] = await tx.select().from(userCredentials).where(eq(userCredentials.userId, userId)).for('update');
        if (!row)
            return { ok: false };
        if (operation === 'login' && !row.mfaEnabledAt)
            return { ok: true, version: row.mfaChangedAt?.toISOString() ?? 'none' };
        if (row.mfaLockedUntil && row.mfaLockedUntil > new Date())
            return { ok: false };
        const enrolling = operation === 'enable';
        const cipher = enrolling ? row.mfaPendingCipher : row.mfaSecretCipher;
        if (!cipher || (enrolling && (!row.mfaPendingExpiresAt || row.mfaPendingExpiresAt < new Date() || row.mfaEnabledAt)))
            return { ok: false };
        const secret = decryptMessage<string>(cipher, `mfa:${userId}`);
        const step = matchingStep(secret, code, enrolling ? -1 : row.mfaLastStep);
        const recoveryIndex = !enrolling && code.length > 10 ? row.mfaRecoveryHashes.indexOf(recoveryHash(code)) : -1;
        if (step === null && recoveryIndex < 0) {
            const failed = row.mfaFailedCount + 1;
            await tx.update(userCredentials).set({ mfaFailedCount: failed, mfaLockedUntil: failed >= 5 ? new Date(Date.now() + 15 * 60000) : null }).where(eq(userCredentials.userId, userId));
            return { ok: false };
        }
        const codes = enrolling ? generateRecoveryCodes() : undefined;
        const enabledAt = enrolling ? new Date() : row.mfaEnabledAt;
        const changedAt = operation === 'login' ? row.mfaChangedAt : new Date();
        await tx.update(userCredentials).set({ mfaChangedAt: changedAt, mfaFailedCount: 0, mfaLockedUntil: null, mfaLastStep: step ?? row.mfaLastStep, mfaRecoveryHashes: codes ? codes.map(recoveryHash) : row.mfaRecoveryHashes.filter((_, i) => i !== recoveryIndex), ...(enrolling ? { mfaEnabledAt: enabledAt, mfaSecretCipher: cipher, mfaPendingCipher: null, mfaPendingExpiresAt: null } : {}), ...(operation === 'disable' ? { mfaEnabledAt: null, mfaSecretCipher: null, mfaRecoveryHashes: [], mfaPendingCipher: null, mfaPendingExpiresAt: null, mfaLastStep: -1 } : {}) }).where(eq(userCredentials.userId, userId));
        if (operation !== 'login')
            await tx.update(assistantTokens).set({ revokedAt: new Date() }).where(eq(assistantTokens.userId, userId));
        const [actor] = await tx.select({ email: crmUsers.email }).from(crmUsers).where(eq(crmUsers.id, userId)).limit(1);
        if (operation !== 'login' || recoveryIndex >= 0)
            await tx.insert(workspaceAuditLogs).values({ actorEmail: actor.email, eventType: `account.mfa.${operation === 'login' ? 'recovery_used' : operation === 'enable' ? 'enabled' : 'disabled'}`, actorUserId: userId, targetType: 'crm_user', targetId: userId, details: {} });
        return { ok: true, version: changedAt?.toISOString() ?? 'none', recoveryCodes: codes };
    });
}
