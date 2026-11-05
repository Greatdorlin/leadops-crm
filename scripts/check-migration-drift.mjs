import { spawnSync } from "node:child_process";

const generate = spawnSync(process.execPath, ["node_modules/drizzle-kit/bin.cjs", "generate"], { stdio: "inherit" });
if (generate.status !== 0) process.exit(generate.status || 1);
const status = spawnSync("git", ["status", "--porcelain", "--", "drizzle"], { encoding: "utf8" });
if (status.status !== 0) process.exit(status.status || 1);
if (status.stdout.trim()) {
  console.error("Migration files differ from the committed release:\n" + status.stdout);
  process.exitCode = 1;
} else console.log("Migration journal matches the committed schema.");
