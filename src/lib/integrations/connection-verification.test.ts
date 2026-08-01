import assert from "node:assert/strict";
import test from "node:test";
import { verifyIntegrationConnection } from "./connection-verification";

test("Meta verification stays unverified until all server-side credentials exist", async () => {
  let requests = 0;
  const result = await verifyIntegrationConnection(
    "facebook",
    { META_PAGE_ACCESS_TOKEN: "page-token" },
    (async () => {
      requests += 1;
      return new Response();
    }) as typeof fetch,
  );

  assert.equal(requests, 0);
  assert.deepEqual(result, {
    configured: false,
    verified: false,
    message: "Add the Meta app secret, page token, and verify token in the deployment first.",
  });
});

test("Meta verification reports provider-confirmed account access without returning secrets", async () => {
  const result = await verifyIntegrationConnection(
    "facebook",
    {
      META_APP_SECRET: "app-secret",
      META_PAGE_ACCESS_TOKEN: "page-token",
      META_VERIFY_TOKEN: "verify-token",
      META_GRAPH_API_VERSION: "v22.0",
    },
    (async (input: string | URL | Request, init?: RequestInit) => {
      assert.match(String(input), /graph\.facebook\.com/);
      assert.doesNotMatch(String(input), /page-token/);
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer page-token",
      );
      return Response.json({ id: "page-1", name: "Example Page" });
    }) as typeof fetch,
  );

  assert.equal(result.configured, true);
  assert.equal(result.verified, true);
  assert.equal(result.accountName, "Example Page");
  assert.doesNotMatch(JSON.stringify(result), /page-token|app-secret|verify-token/);
});

test("provider errors are reduced to admin-safe guidance", async () => {
  const result = await verifyIntegrationConnection(
    "facebook",
    {
      META_APP_SECRET: "app-secret",
      META_PAGE_ACCESS_TOKEN: "page-token",
      META_VERIFY_TOKEN: "verify-token",
    },
    (async () =>
      Response.json(
        { error: { message: "Invalid token page-token for app-secret" } },
        { status: 401 },
      )) as typeof fetch,
  );

  assert.equal(result.verified, false);
  assert.match(result.message, /Meta rejected the verification request \(401\)/);
  assert.doesNotMatch(JSON.stringify(result), /page-token|app-secret|verify-token/);
});

test("TikTok secret presence is never presented as an end-to-end verified connection", async () => {
  const result = await verifyIntegrationConnection("tiktok", {
    TIKTOK_WEBHOOK_SECRET: "delivery-secret",
  });

  assert.equal(result.configured, true);
  assert.equal(result.verified, false);
  assert.match(result.message, /test lead/i);
  assert.doesNotMatch(JSON.stringify(result), /delivery-secret/);
});

test("Google Ads verifies the configured customer only when provider access includes it", async () => {
  const responses = [
    Response.json({ access_token: "short-lived-access-token" }),
    Response.json({ resourceNames: ["customers/1234567890"] }),
  ];
  const result = await verifyIntegrationConnection(
    "google_ads",
    {
      GOOGLE_ADS_DEVELOPER_TOKEN: "developer-token",
      GOOGLE_ADS_CLIENT_ID: "client-id",
      GOOGLE_ADS_CLIENT_SECRET: "client-secret",
      GOOGLE_ADS_REFRESH_TOKEN: "refresh-token",
      GOOGLE_ADS_CUSTOMER_ID: "123-456-7890",
    },
    (async () => responses.shift() ?? new Response(null, { status: 500 })) as typeof fetch,
  );

  assert.equal(result.configured, true);
  assert.equal(result.verified, true);
  assert.equal(result.accountName, "123-456-7890");
  assert.doesNotMatch(
    JSON.stringify(result),
    /developer-token|client-secret|refresh-token|short-lived-access-token/,
  );
});
