import assert from "node:assert/strict";
import {isProtectedLoginRedirect} from "./deployment-boundary.mjs";
import { setTimeout } from "node:timers/promises";

const origin = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
let ready = false;
for (let attempt = 0; attempt < 30; attempt++) {
  try {
    const response = await fetch(new URL("/api/health", origin), { signal: AbortSignal.timeout(7000) });
    if (response.ok) { ready = true; break; }
  } catch { /* server may still be starting */ }
  await setTimeout(1000);
}
assert.ok(ready, "Server health never became ready");
const login = await fetch(new URL("/login", origin));
assert.equal(login.status, 200, "Login must render");
assert.match(await login.text(), /<form/);
const privatePage = await fetch(new URL("/dashboard", origin), { redirect: "manual" });
const privateHtml = await privatePage.text();
assert.ok(isProtectedLoginRedirect(privatePage.status,privatePage.headers.get("location"),privateHtml,origin), "Anonymous dashboard must have an HTTP or explicit framework login redirect");
const privateApi = await fetch(new URL("/api/admin/forms", origin), { redirect: "manual" });
assert.equal(privateApi.status, 401, "Anonymous forms API must reject access");
console.log("Deployment smoke passed: healthy database, login render, private page and API access.");
