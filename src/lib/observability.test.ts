import assert from "node:assert/strict";
import test from "node:test";
import { Writable } from "node:stream";
import { createLogger, classifyError } from "./logger";
import { sanitizeErrorEvent } from "./observability";

test("structured logging redacts credentials and errors expose no raw database values", () => {
  let output = "";
  const stream = new Writable({ write(chunk, _encoding, callback) { output += chunk; callback(); } });
  createLogger(stream).info({ password: "credential", token: "bearer", request: { headers: { cookie: "session" }, body: { email: "private@example.invalid" } } }, "test");
  const event = JSON.parse(output);
  assert.equal(event.msg, "test");
  assert.equal(event.name, "leads-desk");
  assert.equal(event.password, "[REDACTED]");
  assert.equal(output.includes("private@example.invalid"), false);
  assert.deepEqual(classifyError(new Error("SQL params secret")), { type: "Error" });
  assert.deepEqual(classifyError("untrusted value"), { type: "UnknownError" });
});

test("error tracking strips customer context and exception values before export", () => {
  const event = sanitizeErrorEvent({
    request: { data: "secret" }, user: { email: "private@example.invalid" }, extra: { token: "secret" },
    contexts: { customer: "secret" }, breadcrumbs: ["secret"], message: "SQL secret",
    exception: { values: [{ value: "SQL secret", type: "Error", stacktrace: { frames: [{ filename: "source.ts", vars: { token: "secret" } }] } }] },
  });
  const output = JSON.stringify(event);
  assert.equal(output.includes("secret"), false);
  assert.equal(output.includes("private@example.invalid"), false);
  assert.equal(output.includes("source.ts"), true);
});
