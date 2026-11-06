import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import {
  auth,
  type OAuthClientProvider,
} from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformationMixed,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import * as schema from "@/lib/db/schema";
import { applyMigrations, type MigrationSession } from "@/lib/db/migrations";
import { authorize, bearerActor } from "./oauth";
import { GET as protectedMetadata } from "@/app/.well-known/oauth-protected-resource/api/mcp/route";
import { GET as authMetadata } from "@/app/.well-known/oauth-authorization-server/route";
import { POST as register } from "@/app/api/assistant/oauth/register/route";
import { POST as token } from "@/app/api/assistant/oauth/token/route";
import { POST as revoke } from "@/app/api/assistant/oauth/revoke/route";
const client = new PGlite();
const db = drizzle(client, { schema });
function session(connection: PGlite): MigrationSession {
  return {
    execute: (q, p = []) => connection.query(q, p),
    applied: async () =>
      (
        await connection.query<{ hash: string; created_at: string }>(
          "SELECT hash,created_at FROM drizzle.__drizzle_migrations ORDER BY created_at",
        )
      ).rows,
    transaction: (work) =>
      connection.transaction((t) => work(session(t as unknown as PGlite))),
  };
}
const oldOrigin = process.env.NEXTAUTH_URL,
  oldPublic = process.env.CRM_PUBLIC_BASE_URL;
before(async () => {
  process.env.NEXTAUTH_URL = "https://crm.example.test";
  delete process.env.CRM_PUBLIC_BASE_URL;
  await applyMigrations(session(client));
  Object.assign(globalThis, { __leadsDeskDb: db });
});
after(async () => {
  Reflect.deleteProperty(globalThis, "__leadsDeskDb");
  if (oldOrigin === undefined) delete process.env.NEXTAUTH_URL;
  else process.env.NEXTAUTH_URL = oldOrigin;
  if (oldPublic === undefined) delete process.env.CRM_PUBLIC_BASE_URL;
  else process.env.CRM_PUBLIC_BASE_URL = oldPublic;
  await client.close();
});
for (const method of [
  "none",
  "client_secret_post",
  "client_secret_basic",
] as const)
  test(`official SDK OAuth discovery, registration, consent, token and revocation: ${method}`, async () => {
    const [u] = await db
      .insert(schema.crmUsers)
      .values({
        email: `sdk-${method}@example.test`,
        isActive: true,
        role: "sales_agent",
        accessScope: "own",
      })
      .returning();
    await db
      .insert(schema.assistantMembers)
      .values({ userId: u.id, enabled: true, canWrite: true });
    let info: OAuthClientInformationMixed | undefined,
      tokens: OAuthTokens | undefined,
      verifier = "",
      redirect: URL | undefined;
    const provider: OAuthClientProvider = {
      redirectUrl: "https://ai.example.test/callback",
      clientMetadata: {
        client_name: `SDK ${method}`,
        redirect_uris: ["https://ai.example.test/callback"],
        token_endpoint_auth_method: method,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        scope: "crm:read crm:write offline_access",
      },
      clientInformation: () => info,
      saveClientInformation: (v) => {
        info = v;
      },
      tokens: () => tokens,
      saveTokens: (v) => {
        tokens = v;
      },
      codeVerifier: () => verifier,
      saveCodeVerifier: (v) => {
        verifier = v;
      },
      redirectToAuthorization: (v) => {
        redirect = v;
      },
    };
    const fetchFn: typeof fetch = async (input, init) => {
      const req = new Request(input, init);
      const path = new URL(req.url).pathname;
      if (path.startsWith("/.well-known/oauth-protected-resource"))
        return protectedMetadata();
      if (path === "/.well-known/oauth-authorization-server")
        return authMetadata();
      if (path === "/api/assistant/oauth/register") return register(req);
      if (path === "/api/assistant/oauth/token") return token(req);
      return new Response(null, { status: 404 });
    };
    const options = {
      serverUrl: new URL("https://crm.example.test/api/mcp"),
      resourceMetadataUrl: new URL(
        "https://crm.example.test/.well-known/oauth-protected-resource/api/mcp",
      ),
      fetchFn,
    };
    assert.equal(await auth(provider, options), "REDIRECT");
    assert.ok(redirect);
    const callback = new URL(
      await authorize(u.id, redirect.searchParams, true),
    );
    assert.equal(
      await auth(provider, {
        ...options,
        authorizationCode: callback.searchParams.get("code")!,
      }),
      "AUTHORIZED",
    );
    assert.ok(tokens?.access_token);
    const request = new Request("https://crm.example.test/api/mcp", {
      headers: { Authorization: `Bearer ${tokens!.access_token}` },
    });
    assert.equal((await bearerActor(request)).actor.user.id, u.id);
    const params = new URLSearchParams({
      token: tokens!.refresh_token!,
      client_id: info!.client_id,
    });
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    if (method === "client_secret_post")
      params.set("client_secret", info!.client_secret!);
    if (method === "client_secret_basic") {
      params.delete("client_id");
      headers.Authorization = `Basic ${Buffer.from(`${info!.client_id}:${info!.client_secret}`).toString("base64")}`;
    }
    assert.equal(
      (
        await revoke(
          new Request("https://crm.example.test/api/assistant/oauth/revoke", {
            method: "POST",
            headers,
            body: params,
          }),
        )
      ).status,
      200,
    );
    await assert.rejects(() => bearerActor(request));
  });
