import { createHmac, timingSafeEqual } from "node:crypto";
import { getLinkedInClientSecret } from "./client";

function toHexDigest(value: string) {
  const secret = getLinkedInClientSecret();
  if (!secret) {
    return "";
  }

  return createHmac("sha256", secret).update(value).digest("hex");
}

export function buildLinkedInChallengeResponse(challengeCode: string) {
  return {
    challengeCode,
    challengeResponse: toHexDigest(challengeCode),
  };
}

export function verifyLinkedInSignature(rawBody: string, signatureHeader?: string | null) {
  const secret = getLinkedInClientSecret();
  if (!secret || !signatureHeader) {
    return false;
  }

  const provided = signatureHeader.trim();
  if (!/^[a-f0-9]{64}$/.test(provided)) return false;

  const digest = createHmac("sha256", secret).update(`hmacsha256=${rawBody}`).digest("hex");
  return timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(provided, "hex"));
}
