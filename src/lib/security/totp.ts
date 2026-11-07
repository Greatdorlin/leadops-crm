import { createHmac, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function encodeBase32(bytes: Buffer) { let bits = 0, value = 0, result = ''; for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
    }
} if (bits)
    result += alphabet[(value << (5 - bits)) & 31]; return result; }
export function decodeBase32(secret: string) { let bits = 0, value = 0; const bytes: number[] = []; for (const c of secret.replace(/=+$/, '').toUpperCase()) {
    const n = alphabet.indexOf(c);
    if (n < 0)
        throw new Error('Invalid authenticator key');
    value = (value << 5) | n;
    bits += 5;
    if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
    }
} return Buffer.from(bytes); }
export function generateSecret() { return encodeBase32(randomBytes(20)); }
export function totp(secret: string, step: number, digits = 6) { const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step)); const hash = createHmac('sha1', decodeBase32(secret)).update(counter).digest(); const offset = hash[hash.length - 1] & 15; return ((hash.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits).toString().padStart(digits, '0'); }
export function matchingStep(secret: string, code: string, lastStep: number, now = Date.now()) { if (!/^\d{6}$/.test(code))
    return null; const step = Math.floor(now / 30000); for (const candidate of [step, step - 1, step + 1])
    if (candidate > lastStep && candidate >= 0 && timingSafeEqual(Buffer.from(totp(secret, candidate)), Buffer.from(code)))
        return candidate; return null; }
export function recoveryHash(code: string) { return createHash('sha256').update(code.replace(/[-\s]/g, '').toUpperCase()).digest('hex'); }
export function generateRecoveryCodes() { return Array.from({ length: 10 }, () => randomBytes(10).toString('hex').toUpperCase().match(/.{1,4}/g)!.join('-')); }
