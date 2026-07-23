#!/usr/bin/env node

import { performance } from "node:perf_hooks";

const DEFAULTS = Object.freeze({
  baseUrl: "http://127.0.0.1:3000",
  concurrency: 10,
  durationSeconds: 30,
  maxErrorRate: 0.01,
  maxP95Ms: 1000,
  maxRequests: 100_000,
  minRequestsPerSecond: 0,
  paths: ["/api/health"],
  thinkMs: 1000,
  timeoutMs: 5000,
});

const HELP = `
Leads Desk read-only load smoke harness

Usage:
  npm run load:smoke -- --dry-run [options]
  npm run load:smoke -- --confirm [options]

Options:
  --base-url <url>       Target origin (default: ${DEFAULTS.baseUrl})
  --path <path>          Relative GET path; repeat for a round-robin mix
  --concurrency <n>      Concurrent virtual users, 1-500 (default: ${DEFAULTS.concurrency})
  --duration <seconds>   Test duration, 1-3600 (default: ${DEFAULTS.durationSeconds})
  --think-ms <ms>        Delay per user between requests, 0-60000 (default: ${DEFAULTS.thinkMs})
  --timeout-ms <ms>      Per-request timeout, 100-120000 (default: ${DEFAULTS.timeoutMs})
  --max-p95-ms <ms>      Maximum accepted p95 latency (default: ${DEFAULTS.maxP95Ms})
  --max-error-rate <n>   Maximum failed-request ratio, 0-1 (default: ${DEFAULTS.maxErrorRate})
  --min-rps <n>          Minimum accepted requests/second (default: disabled)
  --max-requests <n>     Safety ceiling, 1-1000000 (default: ${DEFAULTS.maxRequests})
  --header <name:value>  Additional request header; repeat as needed
  --dry-run              Print the resolved plan without sending requests
  --confirm              Required before any network requests are sent
  --json                  Print the final result as JSON
  --help                  Show this help

Authentication:
  Set LOAD_COOKIE or LOAD_AUTHORIZATION in the environment. Secret values are
  never printed. Only use a dedicated, least-privilege staging account.

Safety:
  The harness sends GET requests only, does not follow redirects, and requires
  --confirm for a live run. Use it against staging unless production testing is
  explicitly approved and monitored.
`;

function fail(message) {
  console.error(`Error: ${message}`);
  process.exitCode = 2;
}

function readNumber(value, name, { integer = false, min, max }) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || (integer && !Number.isInteger(parsed))) {
    throw new Error(`${name} must be ${integer ? "an integer" : "a number"}.`);
  }
  if (parsed < min || parsed > max) {
    throw new Error(`${name} must be between ${min} and ${max}.`);
  }
  return parsed;
}

function parseHeader(value) {
  const separator = value.indexOf(":");
  if (separator < 1) {
    throw new Error("--header must use the form name:value.");
  }
  const name = value.slice(0, separator).trim();
  const headerValue = value.slice(separator + 1).trim();
  if (!name || !headerValue || /[\r\n]/.test(name + headerValue)) {
    throw new Error("--header contains an invalid name or value.");
  }
  return [name, headerValue];
}

function parseArgs(argv) {
  const config = {
    ...DEFAULTS,
    confirm: false,
    dryRun: false,
    headers: new Map(),
    json: false,
    paths: [],
  };

  const takeValue = (index, flag) => {
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${flag} requires a value.`);
    }
    return value;
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    switch (argument) {
      case "--help":
        config.help = true;
        break;
      case "--confirm":
        config.confirm = true;
        break;
      case "--dry-run":
        config.dryRun = true;
        break;
      case "--json":
        config.json = true;
        break;
      case "--base-url":
        config.baseUrl = takeValue(index, argument);
        index += 1;
        break;
      case "--path":
        config.paths.push(takeValue(index, argument));
        index += 1;
        break;
      case "--concurrency":
        config.concurrency = readNumber(takeValue(index, argument), argument, {
          integer: true,
          min: 1,
          max: 500,
        });
        index += 1;
        break;
      case "--duration":
        config.durationSeconds = readNumber(takeValue(index, argument), argument, {
          integer: true,
          min: 1,
          max: 3600,
        });
        index += 1;
        break;
      case "--think-ms":
        config.thinkMs = readNumber(takeValue(index, argument), argument, {
          integer: true,
          min: 0,
          max: 60_000,
        });
        index += 1;
        break;
      case "--timeout-ms":
        config.timeoutMs = readNumber(takeValue(index, argument), argument, {
          integer: true,
          min: 100,
          max: 120_000,
        });
        index += 1;
        break;
      case "--max-p95-ms":
        config.maxP95Ms = readNumber(takeValue(index, argument), argument, {
          min: 1,
          max: 120_000,
        });
        index += 1;
        break;
      case "--max-error-rate":
        config.maxErrorRate = readNumber(takeValue(index, argument), argument, {
          min: 0,
          max: 1,
        });
        index += 1;
        break;
      case "--min-rps":
        config.minRequestsPerSecond = readNumber(takeValue(index, argument), argument, {
          min: 0,
          max: 100_000,
        });
        index += 1;
        break;
      case "--max-requests":
        config.maxRequests = readNumber(takeValue(index, argument), argument, {
          integer: true,
          min: 1,
          max: 1_000_000,
        });
        index += 1;
        break;
      case "--header": {
        const [name, value] = parseHeader(takeValue(index, argument));
        config.headers.set(name, value);
        index += 1;
        break;
      }
      default:
        throw new Error(`Unknown option: ${argument}`);
    }
  }

  config.paths = config.paths.length > 0 ? config.paths : [...DEFAULTS.paths];
  config.paths = config.paths.map((path) => {
    if (!path.startsWith("/") || path.startsWith("//")) {
      throw new Error(`Path must be a same-origin relative path: ${path}`);
    }
    return path;
  });

  const baseUrl = new URL(config.baseUrl);
  if (!new Set(["http:", "https:"]).has(baseUrl.protocol)) {
    throw new Error("--base-url must use http or https.");
  }
  baseUrl.pathname = "/";
  baseUrl.search = "";
  baseUrl.hash = "";
  config.baseUrl = baseUrl.toString().replace(/\/$/, "");

  if (process.env.LOAD_COOKIE) {
    config.headers.set("Cookie", process.env.LOAD_COOKIE);
  }
  if (process.env.LOAD_AUTHORIZATION) {
    config.headers.set("Authorization", process.env.LOAD_AUTHORIZATION);
  }

  return config;
}

function percentile(sortedValues, percentileValue) {
  if (sortedValues.length === 0) {
    return 0;
  }
  const index = Math.min(
    sortedValues.length - 1,
    Math.ceil((percentileValue / 100) * sortedValues.length) - 1,
  );
  return sortedValues[Math.max(0, index)];
}

function summarizeSamples(samples, elapsedSeconds) {
  const durations = samples.map((sample) => sample.durationMs).sort((a, b) => a - b);
  const failures = samples.filter((sample) => !sample.ok);
  const statusCounts = {};
  for (const sample of samples) {
    const key = sample.status ? String(sample.status) : "network_error";
    statusCounts[key] = (statusCounts[key] ?? 0) + 1;
  }

  return {
    requests: samples.length,
    failures: failures.length,
    errorRate: samples.length > 0 ? failures.length / samples.length : 1,
    requestsPerSecond: elapsedSeconds > 0 ? samples.length / elapsedSeconds : 0,
    latencyMs: {
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      p99: percentile(durations, 99),
      max: durations.at(-1) ?? 0,
    },
    statusCounts,
  };
}

function publicPlan(config) {
  return {
    baseUrl: config.baseUrl,
    paths: config.paths,
    concurrency: config.concurrency,
    durationSeconds: config.durationSeconds,
    thinkMs: config.thinkMs,
    timeoutMs: config.timeoutMs,
    maxRequests: config.maxRequests,
    thresholds: {
      maxP95Ms: config.maxP95Ms,
      maxErrorRate: config.maxErrorRate,
      minRequestsPerSecond: config.minRequestsPerSecond,
    },
    headerNames: [...config.headers.keys()],
  };
}

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function run(config) {
  const samples = [];
  const startedAt = performance.now();
  const deadline = startedAt + config.durationSeconds * 1000;
  let requestCount = 0;

  async function virtualUser(workerIndex) {
    let pathIndex = workerIndex % config.paths.length;
    while (performance.now() < deadline && requestCount < config.maxRequests) {
      requestCount += 1;
      const path = config.paths[pathIndex];
      pathIndex = (pathIndex + 1) % config.paths.length;
      const requestStartedAt = performance.now();
      let status = 0;
      let ok = false;

      try {
        const response = await fetch(new URL(path, config.baseUrl), {
          headers: Object.fromEntries(config.headers),
          method: "GET",
          redirect: "manual",
          signal: AbortSignal.timeout(config.timeoutMs),
        });
        status = response.status;
        await response.arrayBuffer();
        ok = status >= 200 && status < 300;
      } catch {
        ok = false;
      }

      samples.push({
        durationMs: Math.round((performance.now() - requestStartedAt) * 100) / 100,
        ok,
        path,
        status,
      });

      if (config.thinkMs > 0 && performance.now() < deadline) {
        await sleep(
          Math.min(config.thinkMs, Math.max(0, deadline - performance.now())),
        );
      }
    }
  }

  await Promise.all(
    Array.from({ length: config.concurrency }, (_, index) => virtualUser(index)),
  );

  const elapsedSeconds = (performance.now() - startedAt) / 1000;
  const overall = summarizeSamples(samples, elapsedSeconds);
  const byPath = Object.fromEntries(
    config.paths.map((path) => [
      path,
      summarizeSamples(
        samples.filter((sample) => sample.path === path),
        elapsedSeconds,
      ),
    ]),
  );
  const pathSummaries = Object.values(byPath);
  const checks = {
    errorRate: overall.errorRate <= config.maxErrorRate,
    pathErrorRates: pathSummaries.every(
      (summary) => summary.errorRate <= config.maxErrorRate,
    ),
    p95Latency: overall.latencyMs.p95 <= config.maxP95Ms,
    pathP95Latencies: pathSummaries.every(
      (summary) => summary.latencyMs.p95 <= config.maxP95Ms,
    ),
    requestRate:
      config.minRequestsPerSecond === 0 ||
      overall.requestsPerSecond >= config.minRequestsPerSecond,
  };

  return {
    passed: Object.values(checks).every(Boolean),
    elapsedSeconds: Math.round(elapsedSeconds * 100) / 100,
    plan: publicPlan(config),
    checks,
    overall,
    byPath,
  };
}

function printResult(result) {
  console.log(`Result: ${result.passed ? "PASS" : "FAIL"}`);
  console.log(
    `Requests: ${result.overall.requests} (${result.overall.requestsPerSecond.toFixed(2)} req/s)`,
  );
  console.log(
    `Failures: ${result.overall.failures} (${(result.overall.errorRate * 100).toFixed(2)}%)`,
  );
  console.log(
    `Latency: p50 ${result.overall.latencyMs.p50.toFixed(2)} ms, p95 ${result.overall.latencyMs.p95.toFixed(2)} ms, p99 ${result.overall.latencyMs.p99.toFixed(2)} ms`,
  );
  console.log(`Statuses: ${JSON.stringify(result.overall.statusCounts)}`);
  for (const [path, summary] of Object.entries(result.byPath)) {
    console.log(
      `${path}: ${summary.requests} requests, ${(summary.errorRate * 100).toFixed(2)}% failed, p95 ${summary.latencyMs.p95.toFixed(2)} ms`,
    );
  }
}

async function main() {
  let config;
  try {
    config = parseArgs(process.argv.slice(2));
  } catch (error) {
    fail(error instanceof Error ? error.message : "Invalid arguments.");
    return;
  }

  if (config.help) {
    console.log(HELP.trim());
    return;
  }

  if (config.dryRun) {
    console.log("Dry run: no network requests were sent.");
    console.log(JSON.stringify(publicPlan(config), null, 2));
    return;
  }

  if (!config.confirm) {
    fail("Refusing to send requests without --confirm. Use --dry-run to inspect the plan.");
    return;
  }

  console.log("Starting read-only load smoke test.");
  console.log(JSON.stringify(publicPlan(config), null, 2));
  const result = await run(config);
  if (config.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printResult(result);
  }
  if (!result.passed) {
    process.exitCode = 1;
  }
}

await main();
