import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
export const hashSecret = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const secret = () => randomBytes(32).toString("base64url");
export function validPkce(verifier: string, challenge: string) {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return false;
  const actual = createHash("sha256").update(verifier).digest("base64url");
  return (
    actual.length === challenge.length &&
    timingSafeEqual(Buffer.from(actual), Buffer.from(challenge))
  );
}
export function validRedirect(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password && !u.hash;
  } catch {
    return false;
  }
}
export const clientSchema = z
  .object({
    client_name: z.string().trim().min(1).max(80).default("AI connection"),
    redirect_uris: z
      .array(z.string().max(2048).refine(validRedirect))
      .min(1)
      .max(5),
    token_endpoint_auth_method: z
      .enum(["none", "client_secret_post", "client_secret_basic"])
      .default("none"),
    grant_types: z
      .array(z.enum(["authorization_code", "refresh_token"]))
      .optional(),
    response_types: z.array(z.literal("code")).optional(),
  })
  .strip();
export const changeSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("note"),
      leadId: z.string().uuid(),
      note: z.string().trim().min(2).max(2000),
    })
    .strict(),
  z
    .object({
      kind: z.literal("task"),
      leadId: z.string().uuid(),
      title: z.string().trim().min(2).max(200),
      dueAt: z.string().datetime({ offset: true }).nullable(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("priority"),
      leadId: z.string().uuid(),
      priority: z.enum(["low", "medium", "high", "urgent"]),
    })
    .strict(),
]);
export const proposalSchema = z
  .object({ requestId: z.string().uuid(), action: changeSchema })
  .strict();
export type AssistantChange = z.infer<typeof changeSchema>;
export const nameSchema = z.string().trim().min(1).max(40);
export function effectiveName(
  workspace: { name: string; nameLocked: boolean },
  personalName: string | null | undefined,
) {
  return workspace.nameLocked ? workspace.name : personalName || workspace.name;
}
export class AssistantError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
