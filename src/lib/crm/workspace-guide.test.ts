import test from "node:test";
import assert from "node:assert/strict";
import { workspaceGuide } from "./workspace-guide";
import { LEADS_DESK_ROLES } from "./roles";
test("every role receives a useful guide, privileged destinations respect capabilities", () => {
  for (const role of LEADS_DESK_ROLES) {
    const steps = workspaceGuide(role, []);
    assert.ok(steps.length >= 3);
    assert.equal(steps[0].href, "/dashboard");
    assert.ok(!steps.some((s) => s.href === "/reports"));
    assert.ok(!steps.some((s) => s.href === "/tasks"));
  }
  assert.ok(
    workspaceGuide("sales_rep", ["canViewLeads", "canEditLeads"]).some(
      (s) => s.href === "/tasks",
    ),
  );
  assert.ok(
    !workspaceGuide("sales_rep", ["canViewLeads"]).some(
      (s) => s.href === "/settings",
    ),
  );
  assert.ok(
    workspaceGuide("owner", ["canViewReports"]).some(
      (s) => s.href === "/reports",
    ),
  );
});
