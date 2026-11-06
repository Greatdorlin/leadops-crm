import test from "node:test";
import assert from "node:assert/strict";
import {
  isPublicMailAddress,
  parseEmail,
  mailboxConfigSchema,
} from "./mailbox-transport";
test("mail connections reject local, private and mapped network addresses", () => {
  for (const ip of [
    "127.0.0.1",
    "10.1.1.1",
    "172.16.2.3",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
    "64:ff9b::a00:1",
    "not-an-address",
  ])
    assert.equal(isPublicMailAddress(ip), false, ip);
  assert.equal(isPublicMailAddress("1.1.1.1"), true);
  assert.equal(isPublicMailAddress("2606:4700:4700::1111"), true);
  assert.equal(
    mailboxConfigSchema.safeParse({ smtpHost: "localhost", smtpPort: 25 })
      .success,
    false,
  );
});
test("email content is plain text, references preserved and oversized content labelled", async () => {
  const raw = Buffer.from(
    'From: Customer <customer@example.test>\r\nSubject: Customer reply\r\nMessage-ID: <reply@example.test>\r\nIn-Reply-To: <original@example.test>\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<p>Interested in the offer</p><img src="https://tracking.example.test/secret">',
  );
  const result = await parseEmail(raw, { uid: 3, size: 300000 });
  assert.equal(result.from, "customer@example.test");
  assert.equal(result.truncated, true);
  assert.ok(result.references.includes("<original@example.test>"));
  assert.ok(result.text.includes("Interested"));
  assert.ok(!result.text.includes("<img"));
});
