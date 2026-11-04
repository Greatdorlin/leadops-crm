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
    Response.json([{ results: [{ customer: { id: "1234567890" } }] }]),
  ];
  const result = await verifyIntegrationConnection(
    "google_ads",
    {
      GOOGLE_ADS_DEVELOPER_TOKEN: "developer-token",
      GOOGLE_ADS_CLIENT_ID: "client-id",
      GOOGLE_ADS_CLIENT_SECRET: "client-secret",
      GOOGLE_ADS_REFRESH_TOKEN: "refresh-token",
      GOOGLE_ADS_CUSTOMER_ID: "123-456-7890",
      GOOGLE_ADS_LOGIN_CUSTOMER_ID: "555-555-5555",
    },
    (async (input, init) => {
      if (responses.length === 1) {
        assert.match(String(input), /v25\/customers\/1234567890\/googleAds:searchStream$/);
        assert.equal(new Headers(init?.headers).get("login-customer-id"), "5555555555");
        assert.match(String(init?.body), /SELECT customer.id FROM customer/);
      }
      return responses.shift() ?? new Response(null, { status: 500 });
    }) as typeof fetch,
  );

  assert.equal(result.configured, true);
  assert.equal(result.verified, true);
  assert.equal(result.accountName, "1234567890");
  assert.doesNotMatch(
    JSON.stringify(result),
    /developer-token|client-secret|refresh-token|short-lived-access-token/,
  );
});


test("Google Ads lead delivery can be configured without reporting credentials", async () => {
  const result = await verifyIntegrationConnection("google_ads", { GOOGLE_ADS_WEBHOOK_KEY: "test-key" });
  assert.equal(result.configured, true);
  assert.equal(result.verified, false);
  assert.match(result.message, /Send test data/);
  assert.doesNotMatch(result.message, /test-key/);
});

test("LinkedIn checks the configured owner's Lead Sync API instead of OpenID", async () => {
  const result = await verifyIntegrationConnection(
    "linkedin",
    {
      LINKEDIN_CLIENT_SECRET: "client-secret",
      LINKEDIN_ACCESS_TOKEN: "access-token",
      LINKEDIN_LEAD_SYNC_OWNER_URN: "urn:li:sponsoredAccount:12345",
    },
    async (input, init) => {
      assert.match(String(input), /linkedin.com\/rest\/leadForms\?owner=\(sponsoredAccount:urn%3Ali%3AsponsoredAccount%3A12345\)/);
      assert.equal(new Headers(init?.headers).get("X-Restli-Protocol-Version"), "2.0.0");
      return Response.json({ elements: [] });
    },
  );
  assert.equal(result.verified, true);
  assert.doesNotMatch(JSON.stringify(result), /access-token|client-secret/);
});
