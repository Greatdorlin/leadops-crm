import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeBase32, decodeBase32, totp, matchingStep, generateRecoveryCodes, recoveryHash } from './totp';
test('TOTP matches RFC 6238 SHA1 vectors', () => { const secret = encodeBase32(Buffer.from('12345678901234567890')); for (const [seconds, expected] of [[59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'], [1234567890, '89005924'], [2000000000, '69279037'], [20000000000, '65353130']] as const)
    assert.equal(totp(secret, Math.floor(seconds / 30), 8), expected); assert.equal(decodeBase32(secret).toString(), '12345678901234567890'); });
test('codes have a narrow clock window and cannot reuse a consumed time step', () => { const secret = encodeBase32(Buffer.alloc(20, 5)), now = 1234567890000, step = Math.floor(now / 30000), code = totp(secret, step); assert.equal(matchingStep(secret, code, -1, now), step); assert.equal(matchingStep(secret, code, step, now), null); assert.equal(matchingStep(secret, totp(secret, step - 2), -1, now), null); for (const invalid of ['', '123', '1234567', 'xxxxxx'])
    assert.equal(matchingStep(secret, invalid, -1, now), null); });
test('recovery codes have independent entropy and stable normalized hashes', () => { const codes = generateRecoveryCodes(); assert.equal(codes.length, 10); assert.equal(new Set(codes).size, 10); for (const c of codes) {
    assert.match(c, /^[A-F0-9]{4}(-[A-F0-9]{4}){4}$/);
    assert.equal(recoveryHash(c), recoveryHash(c.toLowerCase().replaceAll('-', '')));
    assert.notEqual(recoveryHash(c), c);
} });
