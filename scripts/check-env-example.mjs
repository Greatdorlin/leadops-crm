import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : /\.(?:[cm]?[jt]sx?)$/.test(entry.name) ? [path] : [];
  });
}
const example = readFileSync(".env.example", "utf8");
const documented = new Set([...example.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map(match => match[1]));
const referenced = new Set([...files("src"), ...files("scripts"), "next.config.ts", "drizzle.config.ts"]
  .filter(path => !path.endsWith(".test.ts"))
  .flatMap(path => [...readFileSync(path, "utf8").matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)].map(match => match[1])));
// Next.js supplies this internal runtime flag; users never configure it themselves.
const framework = new Set(["NEXT_RUNTIME"]);
const missing = [...referenced].filter(key => !documented.has(key) && !framework.has(key));
if (missing.length) {
  console.error("Undocumented environment variables:", missing.join(", "));
  process.exitCode = 1;
} else console.log(`Environment example covers ${referenced.size - framework.size} referenced variables.`);
