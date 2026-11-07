import test from "node:test";
import assert from "node:assert/strict";
import { requireTeamChannel } from "./team-policy";
import { InboxError } from "./contracts";
test("the runtime only accepts private team messaging, including for historical threads", () => {
  assert.doesNotThrow(() => requireTeamChannel("team"));
  for (const channel of ["email", "mail", undefined, null, "public"])
    assert.throws(
      () => requireTeamChannel(channel),
      (e) => e instanceof InboxError && e.status === 410,
    );
});
