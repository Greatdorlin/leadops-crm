import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { POST } from "@/app/api/integrations/facebook/webhook/route";
import { verifyFacebookChallenge, verifyFacebookWebhookSignature } from "./verify";

test("verifyFacebookChallenge accepts the expected Meta challenge", () => {
  const previousToken = process.env.META_VERIFY_TOKEN;
  process.env.META_VERIFY_TOKEN = "meta-verify-token";

  try {
    const result = verifyFacebookChallenge(
      new URLSearchParams({
        "hub.mode": "subscribe",
        "hub.verify_token": "meta-verify-token",
        "hub.challenge": "challenge-code",
      }),
    );

    assert.equal(result, "challenge-code");
    assert.equal(
      verifyFacebookChallenge(
        new URLSearchParams({
          "hub.mode": "subscribe",
          "hub.verify_token": "wrong-token",
          "hub.challenge": "challenge-code",
        }),
      ),
      null,
    );
  } finally {
    process.env.META_VERIFY_TOKEN = previousToken;
  }
});

test("verifyFacebookWebhookSignature returns false instead of crashing on malformed signatures", () => {
  const previousSecret = process.env.META_APP_SECRET;
  process.env.META_APP_SECRET = "meta-secret";

  try {
    const rawBody = JSON.stringify({ entry: [] });
    const validSignature = `sha256=${crypto
      .createHmac("sha256", "meta-secret")
      .update(rawBody)
      .digest("hex")}`;

    assert.equal(verifyFacebookWebhookSignature(rawBody, validSignature), true);
    assert.equal(verifyFacebookWebhookSignature(rawBody, "sha256=short"), false);
    assert.equal(verifyFacebookWebhookSignature(rawBody, null), false);
  } finally {
    process.env.META_APP_SECRET = previousSecret;
  }
});

test("facebook webhook POST returns a safe 400 for invalid JSON after signature verification", async () => {
  const previousSecret = process.env.META_APP_SECRET;
  process.env.META_APP_SECRET = "meta-secret";

  try {
    const rawBody = "{invalid-json";
    const signature = `sha256=${crypto
      .createHmac("sha256", "meta-secret")
      .update(rawBody)
      .digest("hex")}`;

    const response = await POST(
      new Request("https://example.com/api/integrations/facebook/webhook", {
        method: "POST",
        body: rawBody,
        headers: {
          "content-type": "application/json",
          "x-hub-signature-256": signature,
        },
      }),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid JSON payload." });
  } finally {
    process.env.META_APP_SECRET = previousSecret;
  }
});
