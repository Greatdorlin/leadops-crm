import crypto from "node:crypto";

export function verifyFacebookWebhookSignature(rawBody: string, signatureHeader?: string | null) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret || !signatureHeader) {
    return false;
  }

  const expected = `sha256=${crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex")}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

export function verifyFacebookChallenge(params: URLSearchParams) {
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode !== "subscribe" || token !== process.env.META_VERIFY_TOKEN || !challenge) {
    return null;
  }

  return challenge;
}
