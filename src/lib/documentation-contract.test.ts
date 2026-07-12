import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function listMarkdownFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") return [];
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return listMarkdownFiles(target);
    return entry.isFile() && entry.name.endsWith(".md") ? [target] : [];
  });
}

test("local Markdown links resolve to files in the buyer package", () => {
  const root = process.cwd();
  for (const file of listMarkdownFiles(root)) {
    const content = readFileSync(file, "utf8");
    for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const rawTarget = match[1]?.trim();
      if (!rawTarget || /^(?:https?:|mailto:|#)/i.test(rawTarget)) continue;
      const targetWithoutAnchor = decodeURIComponent(rawTarget.split("#")[0] ?? "");
      if (!targetWithoutAnchor) continue;
      const resolved = path.resolve(path.dirname(file), targetWithoutAnchor);
      assert.equal(existsSync(resolved), true, `${path.relative(root, file)} links to missing ${rawTarget}`);
    }
  }
});
