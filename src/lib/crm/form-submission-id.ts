import { createHash } from "node:crypto";

export function deriveFormSubmissionId(formId: string, retryKey: string, answers: Record<string, unknown>) {
  const digest = createHash("sha256")
    .update(JSON.stringify([formId.toLowerCase(), retryKey.toLowerCase(), answers]))
    .digest("hex");
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-8${digest.slice(13, 16)}-8${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}
