import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const policy = JSON.parse(readFileSync("coverage-policy.json", "utf8"));
const summary = JSON.parse(readFileSync("coverage/coverage-summary.json", "utf8"));
let failed = false;
function check(name, actual, minimum) {
  for (const [metric, floor] of Object.entries(minimum)) {
    const result = actual[metric];
    console.log(`${name} ${metric}: ${result.toFixed(2)}% (minimum ${floor}%)`);
    if (!Number.isFinite(result) || result < floor) failed = true;
  }
}
check("Repository", Object.fromEntries(Object.entries(summary.total).map(([metric, value]) => [metric, value.pct])), policy.repository);
const totals = {};
for (const file of policy.businessContracts.files) {
  const result = summary[resolve(file)];
  if (!result) throw new Error(`Missing business contract coverage: ${file}`);
  for (const metric of Object.keys(policy.businessContracts.minimum)) {
    totals[metric] ??= { covered: 0, total: 0 };
    totals[metric].covered += result[metric].covered;
    totals[metric].total += result[metric].total;
  }
}
check("Business contracts (aggregate)", Object.fromEntries(Object.entries(totals).map(([metric, result]) => [metric, result.total ? result.covered * 100 / result.total : 100])), policy.businessContracts.minimum);
if (failed) {
  console.error("Coverage fell below a committed floor. Add behavioral tests; do not hide uncovered source.");
  process.exitCode = 1;
}
