import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { POST as mcpPost, GET as mcpGet } from "@/app/api/mcp/route";
import { approveChange } from "./tools";
import { actorForUser } from "./access";
import { leadStore } from "@/lib/storage";
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
      if (path === "/api/mcp") return req.method === "POST" ? mcpPost(req) : mcpGet(req);
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
    const ownLead = await leadStore.createExternalLead({firstName:"SDK owned",source:"manual_entry",email:`owned-${method}@example.test`,assignedTo:u.email});
    const outsideLead = await leadStore.createExternalLead({firstName:"SDK outside",source:"manual_entry",email:`outside-${method}@example.test`,assignedTo:"other@example.test"});
    const mcp = new Client({name:"Leads Desk acceptance client",version:"1.0.0"});
    await mcp.connect(new StreamableHTTPClientTransport(new URL("https://crm.example.test/api/mcp"),{authProvider:provider,fetch:fetchFn}));
    const available=await mcp.listTools();
    assert.ok(available.tools.some(t=>t.name === "search_leads"));
    assert.ok(!available.tools.some(t=>t.name === "staff_performance"));
    const found=await mcp.callTool({name:"search_leads",arguments:{query:`owned-${method}@example.test`}});
    assert.equal(found.isError,false);assert.ok(JSON.stringify(found).includes(ownLead.id));
    const denied=await mcp.callTool({name:"get_lead",arguments:{leadId:outsideLead.id}});
    assert.equal(denied.isError,true);assert.ok(!JSON.stringify(denied).includes(outsideLead.email!));
    const requestId=crypto.randomUUID();
    const proposed=await mcp.callTool({name:"propose_lead_change",arguments:{requestId,action:{kind:"note",leadId:ownLead.id,note:"SDK verified the follow-up request."}}});
    assert.equal(proposed.isError,false);
    assert.equal((await leadStore.listLeadNotes(ownLead.id)).length,0);
    const proposal=JSON.parse((proposed.content as {type:string;text:string}[])[0].text);
    await approveChange(await actorForUser(u.id),proposal.id,true);
    assert.equal((await leadStore.listLeadNotes(ownLead.id)).length,1);
    const status=await mcp.callTool({name:"get_change_status",arguments:{id:proposal.id}});
    assert.ok(JSON.stringify(status).includes("applied"));
    await mcp.close();
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
    assert.equal((await mcpPost(new Request("https://crm.example.test/api/mcp",{method:"POST",headers:{Authorization:`Bearer ${tokens!.access_token}`,"Content-Type":"application/json",Accept:"application/json, text/event-stream"},body:JSON.stringify({jsonrpc:"2.0",id:99,method:"tools/list"})}))).status,401);
  });
