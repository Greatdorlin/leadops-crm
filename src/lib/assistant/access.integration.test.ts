import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as schema from "@/lib/db/schema";
import { applyMigrations, type MigrationSession } from "@/lib/db/migrations";
import { actorForUser, accessibleLead } from "./access";
import {
  authorizationRequest,
  authorize,
  exchangeToken,
  bearerActor,
  registerClient,
} from "./oauth";
import {
  proposeChange,
  approveChange,
  searchLeads,
  performance,
  callTool,
  pendingChanges,
} from "./tools";
import { qualifyLeadProducts } from "@/lib/crm/qualification";
import { leadStore } from "@/lib/storage";
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
const previousOrigin = process.env.NEXTAUTH_URL,
  previousPublic = process.env.CRM_PUBLIC_BASE_URL,
  previousOwner = process.env.INITIAL_ADMIN_EMAIL;
before(async () => {
  process.env.NEXTAUTH_URL = "https://crm.example.test";
  delete process.env.CRM_PUBLIC_BASE_URL;
  process.env.INITIAL_ADMIN_EMAIL = "assistant-owner@example.test";
  await applyMigrations(session(client));
  Object.assign(globalThis, { __leadsDeskDb: db });
});
after(async () => {
  Reflect.deleteProperty(globalThis, "__leadsDeskDb");
  for (const [key, value] of Object.entries({
    NEXTAUTH_URL: previousOrigin,
    CRM_PUBLIC_BASE_URL: previousPublic,
    INITIAL_ADMIN_EMAIL: previousOwner,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await client.close();
});
async function user(
  email: string,
  role: "sales_agent" | "admin" = "sales_agent",
) {
  return (
    await db
      .insert(schema.crmUsers)
      .values({
        email,
        fullName: email,
        role,
        isActive: true,
        accessScope: role === "admin" ? "all" : "own",
      })
      .returning()
  )[0];
}
async function grant(id: string, canWrite = true) {
  await db
    .insert(schema.assistantMembers)
    .values({ userId: id, enabled: true, canWrite, generation: 1 });
}
test("assistant access is opt-in and independent of CRM permissions and stored scope", async () => {
  const rep = await user("rep@example.test");
  const outside = await leadStore.createExternalLead({
    firstName: "Outside",
    lastName: "Scope",
    source: "manual_entry",
    assignedTo: "other@example.test",
    email: "outside@example.test",
  });
  let actor = await actorForUser(rep.id);
  assert.equal(actor.enabled, false);
  await assert.rejects(() => accessibleLead(actor, outside.id));
  await grant(rep.id);
  actor = await actorForUser(rep.id);
  assert.equal(actor.enabled, true);
  assert.equal((await searchLeads(actor, "Outside")).length, 0);
  await assert.rejects(() => accessibleLead(actor, outside.id, true));
  await assert.rejects(() => performance(actor));
});
test("reviewed notes are atomic, idempotent and never mark promised payments as received", async () => {
  const rep = await user("notes@example.test");
  await grant(rep.id);
  const l = await leadStore.createExternalLead({
    firstName: "Mathew",
    source: "manual_entry",
    assignedTo: rep.email,
    email: "mathew@example.test",
  });
  const actor = await actorForUser(rep.id);
  const payload = {
    requestId: crypto.randomUUID(),
    action: {
      kind: "note",
      leadId: l.id,
      note: "I contacted Mathew. He said he will make his payment next week.",
    },
  };
  const change = await proposeChange(actor, payload);
  assert.equal((await leadStore.listLeadNotes(l.id)).length, 0);
  assert.equal((await proposeChange(actor, payload)).id, change.id);
  await Promise.all([
    approveChange(actor, change.id, true),
    approveChange(actor, change.id, true),
  ]);
  assert.equal((await leadStore.listLeadNotes(l.id)).length, 1);
  assert.equal((await db.select().from(schema.paymentClaims)).length, 0);
  const audit = await db
    .select()
    .from(schema.workspaceAuditLogs)
    .where(eq(schema.workspaceAuditLogs.targetId, l.id));
  assert.equal(audit.length, 1);
  await assert.rejects(() =>
    proposeChange(actor, {
      ...payload,
      action: { ...payload.action, note: "Changed" },
    }),
  );
});
test("revocation and reassignment block pending writes and read-only grants cannot propose changes", async () => {
  const a = await user("readonly@example.test");
  await grant(a.id, false);
  const l = await leadStore.createExternalLead({
    source: "manual_entry",
    assignedTo: a.email,
    email: "readonly-lead@example.test",
  });
  const actor = await actorForUser(a.id);
  await assert.rejects(() =>
    proposeChange(actor, {
      requestId: crypto.randomUUID(),
      action: { kind: "note", leadId: l.id, note: "No" },
    }),
  );
  await db
    .update(schema.assistantMembers)
    .set({ canWrite: true })
    .where(eq(schema.assistantMembers.userId, a.id));
  const writable = await actorForUser(a.id);
  const p = await proposeChange(writable, {
    requestId: crypto.randomUUID(),
    action: { kind: "note", leadId: l.id, note: "Pending" },
  });
  await db
    .update(schema.leads)
    .set({ assignedTo: "other@example.test" })
    .where(eq(schema.leads.id, l.id));
  await assert.rejects(() => approveChange(writable, p.id, true));
  assert.equal((await leadStore.listLeadNotes(l.id)).length, 0);
  await db
    .update(schema.assistantMembers)
    .set({ enabled: false })
    .where(eq(schema.assistantMembers.userId, a.id));
  await assert.rejects(() => approveChange(writable, p.id, true));
});
test("OAuth binds resource, exact redirect, PKCE, individual grants, rotation and replay", async () => {
  const u = await user("oauth@example.test");
  await grant(u.id);
  const c = await registerClient(
    {
      client_name: "Test AI",
      redirect_uris: ["https://ai.example.test/callback"],
      token_endpoint_auth_method: "none",
    },
    "127.0.0.1",
  );
  const verifier = "v".repeat(43);
  const p = new URLSearchParams({
    client_id: c.client_id,
    redirect_uri: c.redirect_uris[0],
    response_type: "code",
    resource: "https://crm.example.test/api/mcp",
    scope: "crm:read crm:write offline_access",
    code_challenge_method: "S256",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    state: "my-state",
  });
  await assert.rejects(() =>
    authorizationRequest(
      new URLSearchParams({
        ...Object.fromEntries(p),
        redirect_uri: "https://ai.example.test/evil",
      }),
    ),
  );
  await assert.rejects(() =>
    authorizationRequest(
      new URLSearchParams({
        ...Object.fromEntries(p),
        resource: "https://evil.example/mcp",
      }),
    ),
  );
  const redirect = new URL(await authorize(u.id, p, true));
  assert.equal(redirect.searchParams.get("state"), "my-state");
  const exchange = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: c.client_id,
    redirect_uri: c.redirect_uris[0],
    resource: p.get("resource")!,
    code: redirect.searchParams.get("code")!,
    code_verifier: verifier,
  });
  await assert.rejects(() =>
    exchangeToken(
      new URLSearchParams({
        ...Object.fromEntries(exchange),
        code_verifier: "x".repeat(43),
      }),
    ),
  );
  const token = await exchangeToken(exchange);
  await assert.rejects(() => exchangeToken(exchange));
  const request = (t: string) =>
    new Request("https://crm.example.test/api/mcp", {
      headers: { Authorization: `Bearer ${t}` },
    });
  assert.equal(
    (await bearerActor(request(token.access_token))).actor.user.id,
    u.id,
  );
  const refresh = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: c.client_id,
    resource: p.get("resource")!,
    refresh_token: token.refresh_token!,
  });
  const rotated = await exchangeToken(refresh);
  await assert.rejects(() => bearerActor(request(token.access_token)));
  await assert.rejects(() => exchangeToken(refresh));
  await assert.rejects(() => bearerActor(request(rotated.access_token)));
  const redirect2 = new URL(await authorize(u.id, p, false));
  const token2 = await exchangeToken(
    new URLSearchParams({
      ...Object.fromEntries(exchange),
      code: redirect2.searchParams.get("code")!,
    }),
  );
  assert.equal(
    (await bearerActor(request(token2.access_token))).canWrite,
    false,
  );
  await assert.rejects(async () =>
    callTool(
      await actorForUser(u.id),
      "propose_lead_change",
      {},
      c.client_id,
      false,
    ),
  );
  await db
    .update(schema.assistantMembers)
    .set({ generation: 2 })
    .where(eq(schema.assistantMembers.userId, u.id));
  await assert.rejects(() => bearerActor(request(token2.access_token)));
});
test("product-specific quick qualification changes only the chosen offer and preserves total arithmetic", async () => {
  const l = await leadStore.createExternalLead({
    source: "manual_entry",
    email: "products@example.test",
  });
  const [p, q] = await db
    .insert(schema.productCatalog)
    .values([
      { name: "Consultation", value: "500", currency: "USD", probability: 50 },
      {
        name: "Implementation",
        value: "2500",
        currency: "USD",
        probability: 40,
      },
    ])
    .returning();
  const options = { createdBy: "owner@example.test", globalCurrency: "USD" };
  await qualifyLeadProducts(
    l.id,
    { scope: "one", productId: p.id, status: "qualified" },
    options,
  );
  await qualifyLeadProducts(
    l.id,
    { scope: "one", productId: q.id, status: "qualified" },
    options,
  );
  assert.equal((await leadStore.getById(l.id))?.expectedValue, 1250);
  await qualifyLeadProducts(
    l.id,
    { scope: "one", productId: p.id, status: "unqualified", reason: "Budget" },
    options,
  );
  assert.equal((await leadStore.getById(l.id))?.expectedValue, 1000);
  await qualifyLeadProducts(
    l.id,
    { scope: "all", status: "unqualified", reason: "Timing" },
    options,
  );
  assert.equal((await leadStore.getById(l.id))?.expectedValue, 0);
});
test("assistant schema preparation is idempotent after normal journalled migrations", async () => {
  const journal = JSON.parse(
    readFileSync("drizzle/meta/_journal.json", "utf8"),
  );
  const ddl = readFileSync(
    `drizzle/${journal.entries.find((e: { idx: number }) => e.idx === 28).tag}.sql`,
    "utf8",
  );
  await client.exec(ddl);
  await client.exec(ddl);
  assert.ok((await db.select().from(schema.assistantMembers)).length > 0);
});

test("official MCP SDK discovers tools, reads scoped data and prepares changes without applying them", async () => {
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { StreamableHTTPClientTransport } = await import(
    "@modelcontextprotocol/sdk/client/streamableHttp.js"
  );
  const route = await import("@/app/api/mcp/route");
  const { hashSecret, secret } = await import("./contracts");
  const u = await user("mcp-sdk@example.test");
  await grant(u.id);
  const l = await leadStore.createExternalLead({
    source: "manual_entry",
    firstName: "SDK",
    lastName: "Prospect",
    email: "sdk-prospect@example.test",
    assignedTo: u.email,
  });
  const [c] = await db
    .insert(schema.assistantClients)
    .values({
      id: crypto.randomUUID(),
      name: "Official SDK",
      redirectUris: ["https://ai.example.test/callback"],
      ipHash: "test",
    })
    .returning();
  const access = secret();
  await db.insert(schema.assistantTokens).values({
    accessHash: hashSecret(access),
    refreshHash: hashSecret(secret()),
    familyId: crypto.randomUUID(),
    clientId: c.id,
    userId: u.id,
    resource: "https://crm.example.test/api/mcp",
    scope: "crm:read crm:write",
    generation: 1,
    expiresAt: new Date(Date.now() + 60000),
    refreshExpiresAt: new Date(Date.now() + 60000),
  });
  const sdk = new Client(
    { name: "Leads Desk acceptance", version: "1.0.0" },
    { capabilities: {} },
  );
  const transport = new StreamableHTTPClientTransport(
    new URL("https://crm.example.test/api/mcp"),
    {
      requestInit: { headers: { Authorization: `Bearer ${access}` } },
      fetch: async (input, init) => {
        const request = new Request(input, init);
        return request.method === "GET"
          ? route.GET(request)
          : route.POST(request);
      },
    },
  );
  try {
    await sdk.connect(transport);
    const tools = await sdk.listTools();
    assert.ok(tools.tools.some((t) => t.name === "search_leads"));
    assert.equal(
      tools.tools.some((t) => t.name === "staff_performance"),
      false,
    );
    const result = await sdk.callTool({
      name: "search_leads",
      arguments: { query: "SDK Prospect" },
    });
    assert.equal(result.isError, false);
    assert.match(JSON.stringify(result), /SDK Prospect/);
    const proposal = await sdk.callTool({
      name: "propose_lead_change",
      arguments: {
        requestId: crypto.randomUUID(),
        action: {
          kind: "note",
          leadId: l.id,
          note: "Contacted. Promised payment next week.",
        },
      },
    });
    assert.equal(proposal.isError, false);
    assert.equal((await leadStore.listLeadNotes(l.id)).length, 0);
    const forbidden = await sdk.callTool({
      name: "staff_performance",
      arguments: {},
    });
    assert.equal(forbidden.isError, true);
    const noToken = await route.POST(
      new Request("https://crm.example.test/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
    );
    assert.equal(noToken.status, 401);
    assert.match(
      noToken.headers.get("www-authenticate") ?? "",
      /oauth-protected-resource/,
    );
  } finally {
    await sdk.close();
  }
});

test("performance answers name the metric and currency and obey an own-scope report grant", async () => {
  const u = await user("performance-own@example.test");
  await grant(u.id);
  await db
    .insert(schema.userPermissionOverrides)
    .values({ userId: u.id, permission: "canViewReports", enabled: true });
  const own = await leadStore.createExternalLead({
    source: "manual_entry",
    firstName: "Own report",
    email: "own-report@example.test",
    assignedTo: u.email,
    estimatedValue: 2000,
  });
  await leadStore.updateLeadWorkflow(own.id, {
    wonAt: new Date().toISOString(),
  });
  const outside = await leadStore.createExternalLead({
    source: "manual_entry",
    email: "outside-report@example.test",
    assignedTo: "different@example.test",
    estimatedValue: 50000,
  });
  await leadStore.updateLeadWorkflow(outside.id, {
    wonAt: new Date().toISOString(),
  });
  const actor = await actorForUser(u.id);
  const result = await performance(actor);
  assert.equal(result.metric, "won_value");
  assert.equal(result.period, "all_time");
  assert.equal(result.currency, "USD");
  assert.equal(result.wonValue, 2000);
  assert.equal(result.staff.length, 1);
  const p = await proposeChange(actor, {
    requestId: crypto.randomUUID(),
    action: {
      kind: "task",
      leadId: own.id,
      title: "Call to confirm payment date",
      dueAt: null,
    },
  });
  assert.equal((await pendingChanges(actor))[0].targetName, "Own report");
  await Promise.all([
    approveChange(actor, p.id, true),
    approveChange(actor, p.id, true),
  ]);
  assert.equal((await leadStore.listLeadTasks({ leadId: own.id })).length, 1);
  const priority = await proposeChange(actor, {
    requestId: crypto.randomUUID(),
    action: { kind: "priority", leadId: own.id, priority: "high" },
  });
  await approveChange(actor, priority.id, true);
  assert.equal((await leadStore.getById(own.id))?.priority, "high");
  const rejected = await proposeChange(actor, {
    requestId: crypto.randomUUID(),
    action: { kind: "note", leadId: own.id, note: "Do not apply" },
  });
  await approveChange(actor, rejected.id, false);
  assert.equal((await leadStore.listLeadNotes(own.id)).length, 0);
});
