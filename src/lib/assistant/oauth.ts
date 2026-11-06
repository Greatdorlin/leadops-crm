import { timingSafeEqual } from "node:crypto";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  assistantClients,
  assistantCodes,
  assistantTokens,
  workspaceAuditLogs,
} from "@/lib/db/schema";
import { actorForUser } from "./access";
import {
  AssistantError,
  clientSchema,
  hashSecret,
  secret,
  validPkce,
} from "./contracts";
import { origin } from "./http";
export const resourceUrl = () => `${origin()}/api/mcp`;
export async function registerClient(payload: unknown, ip: string) {
  const parsed = clientSchema.safeParse(payload);
  if (!parsed.success)
    throw new AssistantError(
      "Use valid OAuth metadata with exact HTTPS callback URLs.",
    );
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(74201931)`);
    const rows = await tx
      .select({
        total: sql<number>`count(*)`,
        ip: sql<number>`count(*) filter(where ${assistantClients.ipHash}=${hashSecret(ip)})`,
      })
      .from(assistantClients)
      .where(gt(assistantClients.createdAt, new Date(Date.now() - 3600000)));
    if (Number(rows[0]?.ip) >= 20 || Number(rows[0]?.total) >= 1000)
      throw new AssistantError("Try registering the connection later.", 429);
    const clientSecret =
      parsed.data.token_endpoint_auth_method === "none" ? null : secret();
    const [client] = await tx
      .insert(assistantClients)
      .values({
        id: crypto.randomUUID(),
        name: parsed.data.client_name,
        authMethod: parsed.data.token_endpoint_auth_method,
        secretHash: clientSecret ? hashSecret(clientSecret) : null,
        redirectUris: parsed.data.redirect_uris,
        ipHash: hashSecret(ip),
      })
      .returning();
    return {
      client_id: client.id,
      client_name: client.name,
      redirect_uris: client.redirectUris,
      token_endpoint_auth_method: client.authMethod,
      ...(clientSecret
        ? { client_secret: clientSecret, client_secret_expires_at: 0 }
        : {}),
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    };
  });
}
export async function authorizationRequest(params: URLSearchParams) {
  const clientId = params.get("client_id") ?? "";
  const [client] = await getDb()
    .select()
    .from(assistantClients)
    .where(eq(assistantClients.id, clientId));
  const redirectUri = params.get("redirect_uri") ?? "";
  const challenge = params.get("code_challenge") ?? "";
  const scope = params.get("scope") || "crm:read";
  const scopes = [...new Set(scope.split(" ").filter(Boolean))];
  if (
    !client ||
    !client.redirectUris.includes(redirectUri) ||
    params.get("response_type") !== "code" ||
    params.get("resource") !== resourceUrl() ||
    params.get("code_challenge_method") !== "S256" ||
    !/^[A-Za-z0-9_-]{43}$/.test(challenge) ||
    scopes.some(
      (s) => !["crm:read", "crm:write", "offline_access"].includes(s),
    ) ||
    !scopes.includes("crm:read") ||
    (params.get("state")?.length ?? 0) > 2048
  )
    throw new AssistantError(
      "The authorization request is invalid. Return to your AI tool and reconnect.",
    );
  return {
    client,
    redirectUri,
    challenge,
    scope: scopes.join(" "),
    state: params.get("state") ?? "",
    resource: resourceUrl(),
  };
}
export async function authorize(
  userId: string,
  params: URLSearchParams,
  allowWrite: boolean,
) {
  const request = await authorizationRequest(params);
  const actor = await actorForUser(userId);
  if (!actor.enabled)
    throw new AssistantError(
      "The owner has not granted assistant access.",
      403,
    );
  const scopes = request.scope
    .split(" ")
    .filter(
      (s) =>
        s !== "crm:write" ||
        (actor.canWrite &&
          allowWrite &&
          actor.permissions.includes("canEditLeads")),
    );
  const code = secret();
  await getDb()
    .insert(assistantCodes)
    .values({
      hash: hashSecret(code),
      clientId: request.client.id,
      userId,
      redirectUri: request.redirectUri,
      challenge: request.challenge,
      resource: request.resource,
      scope: scopes.join(" "),
      generation: actor.generation,
      expiresAt: new Date(Date.now() + 120000),
    });
  const target = new URL(request.redirectUri);
  target.searchParams.set("code", code);
  if (request.state) target.searchParams.set("state", request.state);
  return target.href;
}
export async function authenticateClient(
  params: URLSearchParams,
  method: string,
) {
  const [client] = await getDb()
    .select()
    .from(assistantClients)
    .where(eq(assistantClients.id, params.get("client_id") ?? ""));
  const actual = hashSecret(params.get("client_secret") ?? "");
  if (
    !client ||
    client.authMethod !== method ||
    (method !== "none" &&
      (!client.secretHash ||
        !/^[0-9a-f]{64}$/.test(client.secretHash) ||
        !timingSafeEqual(
          Buffer.from(actual, "hex"),
          Buffer.from(client.secretHash, "hex"),
        )))
  )
    throw new AssistantError("invalid_client", 401);
  return client;
}
export async function exchangeToken(
  params: URLSearchParams,
  method = params.has("client_secret") ? "client_secret_post" : "none",
) {
  const db = getDb();
  const now = new Date();
  const clientId = params.get("client_id") ?? "";
  if (params.get("resource") !== resourceUrl())
    throw new AssistantError("invalid_grant", 400);
  await authenticateClient(params, method);
  // Return errors from the transaction so replay revocation is committed, not rolled back.
  const result = await db.transaction(async (tx) => {
    await tx.delete(assistantCodes).where(lt(assistantCodes.expiresAt, now));
    await tx
      .delete(assistantTokens)
      .where(
        lt(assistantTokens.refreshExpiresAt, new Date(Date.now() - 86400000)),
      );
    let grant:
      | {
          userId: string;
          clientId: string;
          resource: string;
          scope: string;
          generation: number;
          familyId?: string;
          refreshExpiresAt?: Date;
        }
      | undefined;
    if (params.get("grant_type") === "authorization_code") {
      const [row] = await tx
        .select()
        .from(assistantCodes)
        .where(eq(assistantCodes.hash, hashSecret(params.get("code") ?? "")))
        .for("update");
      if (
        !row ||
        row.clientId !== clientId ||
        row.redirectUri !== params.get("redirect_uri") ||
        row.resource !== resourceUrl() ||
        row.expiresAt <= now ||
        !validPkce(params.get("code_verifier") ?? "", row.challenge)
      )
        return null;
      await tx.delete(assistantCodes).where(eq(assistantCodes.hash, row.hash));
      grant = row;
    } else if (params.get("grant_type") === "refresh_token") {
      const [row] = await tx
        .select()
        .from(assistantTokens)
        .where(
          eq(
            assistantTokens.refreshHash,
            hashSecret(params.get("refresh_token") ?? ""),
          ),
        )
        .for("update");
      if (
        !row ||
        row.clientId !== clientId ||
        row.resource !== resourceUrl() ||
        row.refreshExpiresAt <= now
      )
        return null;
      if (row.revokedAt) {
        await tx
          .update(assistantTokens)
          .set({ revokedAt: now })
          .where(eq(assistantTokens.familyId, row.familyId));
        return null;
      }
      await tx
        .update(assistantTokens)
        .set({ revokedAt: now })
        .where(eq(assistantTokens.accessHash, row.accessHash));
      grant = row;
    }
    if (!grant) return null;
    const actor = await actorForUser(grant.userId, tx);
    if (!actor.enabled || actor.generation !== grant.generation) return null;
    const access = secret(),
      refresh = secret();
    await tx.insert(assistantTokens).values({
      accessHash: hashSecret(access),
      refreshHash: hashSecret(refresh),
      familyId: grant.familyId ?? crypto.randomUUID(),
      userId: grant.userId,
      clientId,
      resource: resourceUrl(),
      scope: grant.scope,
      generation: grant.generation,
      expiresAt: new Date(Date.now() + 15 * 60000),
      refreshExpiresAt:
        grant.refreshExpiresAt ?? new Date(Date.now() + 30 * 86400000),
    });
    await tx.insert(workspaceAuditLogs).values({
      eventType: "assistant.oauth.token_issued",
      actorUserId: actor.user.id,
      actorEmail: actor.user.email,
      targetType: "assistant_client",
      targetId: clientId,
      details: { scope: grant.scope },
    });
    return {
      access_token: access,
      token_type: "Bearer",
      expires_in: 900,
      scope: grant.scope,
      ...(grant.scope.split(" ").includes("offline_access")
        ? { refresh_token: refresh }
        : {}),
    };
  });
  if (!result) throw new AssistantError("invalid_grant", 400);
  return result;
}
export async function bearerActor(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (!/^Bearer [A-Za-z0-9_-]{43}$/.test(header))
    throw new AssistantError("A personal OAuth connection is required.", 401);
  const [token] = await getDb()
    .select()
    .from(assistantTokens)
    .where(
      and(
        eq(assistantTokens.accessHash, hashSecret(header.slice(7))),
        gt(assistantTokens.expiresAt, new Date()),
      ),
    );
  if (!token || token.revokedAt || token.resource !== resourceUrl())
    throw new AssistantError(
      "This connection has expired or was revoked.",
      401,
    );
  const actor = await actorForUser(token.userId);
  if (!actor.enabled || actor.generation !== token.generation)
    throw new AssistantError("This connection was revoked.", 401);
  const originHeader = request.headers.get("origin");
  if (originHeader) {
    const [client] = await getDb()
      .select()
      .from(assistantClients)
      .where(eq(assistantClients.id, token.clientId));
    const allowed = [
      origin(),
      "https://chatgpt.com",
      "https://claude.ai",
      ...(client?.redirectUris ?? []).map((u) => new URL(u).origin),
    ];
    if (!allowed.includes(originHeader))
      throw new AssistantError("Origin is not allowed.", 403);
  }
  return {
    actor,
    token,
    canWrite: actor.canWrite && token.scope.split(" ").includes("crm:write"),
  };
}
