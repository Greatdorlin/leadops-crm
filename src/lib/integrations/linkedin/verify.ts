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

  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  const candidates = [`hmacsha256=${digest}`, digest];
  const provided = signatureHeader.trim();

  for (const expected of candidates) {
    try {
      if (timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) {
        return true;
      }
    } catch {
      // Keep checking the next supported signature shape.
    }
  }

  return false;
}
