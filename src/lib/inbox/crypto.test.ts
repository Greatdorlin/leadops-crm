import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { encryptMessage, decryptMessage, encryptionReady } from "./crypto";
test("message encryption uses random nonces, authenticated context and explicit key rotation", () => {
  const old = process.env.CRM_INBOX_DATA_KEY,
    previous = process.env.CRM_INBOX_PREVIOUS_ENCRYPTION_KEYS;
  try {
    const key = randomBytes(32).toString("base64");
    process.env.CRM_INBOX_DATA_KEY = key;
    delete process.env.CRM_INBOX_PREVIOUS_ENCRYPTION_KEYS;
    const a = encryptMessage({ text: "Private sales note" }, "message:one"),
      b = encryptMessage({ text: "Private sales note" }, "message:one");
    assert.notEqual(a, b);
    assert.ok(!a.includes("Private sales note"));
    assert.deepEqual(decryptMessage(a, "message:one"), {
      text: "Private sales note",
    });
    assert.throws(() => decryptMessage(a, "message:other"));
    const tampered = JSON.parse(a);
    tampered.tag = randomBytes(16).toString("base64");
    assert.throws(() =>
      decryptMessage(JSON.stringify(tampered), "message:one"),
    );
    process.env.CRM_INBOX_DATA_KEY = randomBytes(32).toString("base64");
    assert.throws(() => decryptMessage(a, "message:one"));
    process.env.CRM_INBOX_PREVIOUS_ENCRYPTION_KEYS = key;
    assert.deepEqual(decryptMessage(a, "message:one"), {
      text: "Private sales note",
    });
    delete process.env.CRM_INBOX_DATA_KEY;
    assert.equal(encryptionReady(), false);
    assert.throws(() => encryptMessage("x", "y"));
    process.env.CRM_INBOX_DATA_KEY = "invalid";
    assert.equal(encryptionReady(), false);
  } finally {
    if (old === undefined) delete process.env.CRM_INBOX_DATA_KEY;
    else process.env.CRM_INBOX_DATA_KEY = old;
    if (previous === undefined)
      delete process.env.CRM_INBOX_PREVIOUS_ENCRYPTION_KEYS;
    else process.env.CRM_INBOX_PREVIOUS_ENCRYPTION_KEYS = previous;
  }
});
