import assert from "node:assert/strict";
import test from "node:test";
import { buildFormCopySlug } from "@/components/admin/FormListGrid";

test("form copies use short readable slugs and increment collisions", () => {
  assert.equal(buildFormCopySlug("admin", []), "admin-copy");
  assert.equal(buildFormCopySlug("admin", ["admin-copy"]), "admin-copy-2");
  assert.equal(
    buildFormCopySlug("admin-copy-2", ["admin-copy", "admin-copy-2"]),
    "admin-copy-3",
  );
});
