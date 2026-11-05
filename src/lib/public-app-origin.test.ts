import assert from "node:assert/strict";
import test from "node:test";
import { resolvePublicAppOrigin } from "./public-app-origin";

test("public origins prefer runtime configuration and support custom hosts", () => {
  assert.equal(resolvePublicAppOrigin({
    CRM_PUBLIC_BASE_URL: " https://crm.client.example/ ",
    NEXT_PUBLIC_APP_URL: "https://old-preview.example",
  }), "https://crm.client.example");
  assert.equal(resolvePublicAppOrigin({ CRM_PUBLIC_BASE_URL: "javascript:void(0)", NEXTAUTH_URL: "https://crm.agency.example" }), "https://crm.agency.example");
  assert.equal(resolvePublicAppOrigin({}, "http://localhost:3000"), "http://localhost:3000");
  assert.equal(resolvePublicAppOrigin({ VERCEL_URL: "project.vercel.app" }), "");
});
