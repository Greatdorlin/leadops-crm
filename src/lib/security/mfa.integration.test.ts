import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { applyMigrations, type MigrationSession } from '@/lib/db/migrations';
import { mfaStatus, startMfa, checkMfa, mfaVersion } from './mfa';
import { totp } from './totp';
const client = new PGlite(), db = drizzle(client, { schema });
function session(c: PGlite): MigrationSession { return { execute: (q, p = []) => c.query(q, p), applied: async () => (await c.query<{
        hash: string;
        created_at: string;
    }>('SELECT hash,created_at FROM drizzle.__drizzle_migrations ORDER BY created_at')).rows, transaction: work => c.transaction(t => work(session(t as unknown as PGlite))) }; }
const oldKey = process.env.CRM_INBOX_DATA_KEY;
before(async () => { process.env.CRM_INBOX_DATA_KEY = randomBytes(32).toString('base64'); await applyMigrations(session(client)); Object.assign(globalThis, { __leadsDeskDb: db }); });
after(async () => { Reflect.deleteProperty(globalThis, '__leadsDeskDb'); if (oldKey === undefined)
    delete process.env.CRM_INBOX_DATA_KEY;
else
    process.env.CRM_INBOX_DATA_KEY = oldKey; await client.close(); });
async function account(email: string) { const [u] = await db.insert(schema.crmUsers).values({ email, isActive: true, role: 'admin' }).returning(); await db.insert(schema.userCredentials).values({ userId: u.id, passwordHash: 'fixture-not-a-password' }); return u; }
test('enrollment encrypts setup keys, requires confirmation and exposes recovery codes only once', async () => { const u = await account('mfa-a@example.test'); assert.equal((await mfaStatus(u.id)).enabled, false); const secret = await startMfa(u.id); assert.equal((await mfaStatus(u.id)).enabled, false); assert.ok(!JSON.stringify(await db.select().from(schema.userCredentials)).includes(secret)); const step = Math.floor(Date.now() / 30000); const enabled = await checkMfa(u.id, totp(secret, step), 'enable'); assert.equal(enabled.ok, true); assert.equal(enabled.recoveryCodes?.length, 10); assert.equal((await mfaStatus(u.id)).enabled, true); assert.equal((await mfaStatus(u.id)).recoveryCodesRemaining, 10); assert.equal((await checkMfa(u.id, totp(secret, step))).ok, false); assert.equal((await checkMfa(u.id, totp(secret, step + 1))).ok, true); assert.equal((await checkMfa(u.id, totp(secret, step + 1))).ok, false); assert.equal((await checkMfa(u.id, enabled.recoveryCodes![0])).ok, true); assert.equal((await checkMfa(u.id, enabled.recoveryCodes![0])).ok, false); assert.equal((await mfaStatus(u.id)).recoveryCodesRemaining, 9); assert.ok(!JSON.stringify(await mfaStatus(u.id)).includes(secret)); await assert.rejects(() => startMfa(u.id)); const version = await mfaVersion(u.email); await new Promise(r => setTimeout(r, 2)); assert.equal((await checkMfa(u.id, enabled.recoveryCodes![1], 'disable')).ok, true); assert.equal((await mfaStatus(u.id)).enabled, false); assert.notEqual(await mfaVersion(u.email), version); const [row] = await db.select().from(schema.userCredentials).where(eq(schema.userCredentials.userId, u.id)); assert.equal(row.mfaSecretCipher, null); assert.deepEqual(row.mfaRecoveryHashes, []); });
test('expired enrollment and repeated failures cannot enable a factor', async () => { const u = await account('mfa-b@example.test'), secret = await startMfa(u.id); await db.update(schema.userCredentials).set({ mfaPendingExpiresAt: new Date(Date.now() - 1000) }).where(eq(schema.userCredentials.userId, u.id)); assert.equal((await checkMfa(u.id, totp(secret, Math.floor(Date.now() / 30000)), 'enable')).ok, false); const fresh = await startMfa(u.id); for (let i = 0; i < 5; i++)
    assert.equal((await checkMfa(u.id, 'invalid', 'enable')).ok, false); assert.equal((await checkMfa(u.id, totp(fresh, Math.floor(Date.now() / 30000)), 'enable')).ok, false); assert.equal((await mfaStatus(u.id)).enabled, false); });
test('Google cannot bypass an enrolled factor and JWT cannot invent factor verification', async () => {
    const { authOptions } = await import('@/lib/auth');
    const u = await account('mfa-google@example.test');
    const signIn = authOptions.callbacks!.signIn!;
    const user = { id: u.id, email: u.email, name: 'Security test' };
    const args = { user, account: { provider: 'google', type: 'oauth' }, profile: { email_verified: true } };
    assert.equal(await signIn(args as never), true);
    assert.equal((user as typeof user & {
        mfaVersion?: string;
    }).mfaVersion, 'none');
    const secret = await startMfa(u.id);
    assert.equal((await checkMfa(u.id, totp(secret, Math.floor(Date.now() / 30000)), 'enable')).ok, true);
    assert.equal(await signIn({ ...args, user: { id: u.id, email: u.email } } as never), false);
    // A factor enabled after OAuth authorization invalidates its earlier version.
    assert.notEqual((user as typeof user & {
        mfaVersion?: string;
    }).mfaVersion, await mfaVersion(u.email));
    await assert.rejects(async () => authOptions.callbacks!.jwt!({ token: {}, user: { email: u.email }, account: { provider: 'google' } } as never));
});
