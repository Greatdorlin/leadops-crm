import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

test("Docker deployments keep Google login optional", () => {
  for (const file of ["docker-compose.yml", "docker-compose.external.yml"]) {
    const compose = read(file);

    assert.match(compose, /ENABLE_GOOGLE_LOGIN: \$\{ENABLE_GOOGLE_LOGIN:-false\}/);
    assert.match(compose, /AUTH_GOOGLE_ID: \$\{AUTH_GOOGLE_ID:-\}/);
    assert.match(compose, /AUTH_GOOGLE_SECRET: \$\{AUTH_GOOGLE_SECRET:-\}/);
    assert.doesNotMatch(compose, /AUTH_GOOGLE_(?:ID|SECRET): \$\{[^}]+:\?/);
  }
});

test("Docker deployments expose bounded database pool controls", () => {
  for (const file of ["docker-compose.yml", "docker-compose.external.yml"]) {
    const compose = read(file);

    assert.match(compose, /DATABASE_POOL_MAX: \$\{DATABASE_POOL_MAX:-5\}/);
    assert.match(
      compose,
      /DATABASE_CONNECT_TIMEOUT_SECONDS: \$\{DATABASE_CONNECT_TIMEOUT_SECONDS:-30\}/,
    );
    assert.match(
      compose,
      /DATABASE_IDLE_TIMEOUT_SECONDS: \$\{DATABASE_IDLE_TIMEOUT_SECONDS:-20\}/,
    );
  }
});

test("external database deployment completes migrations before app startup", () => {
  const compose = read("docker-compose.external.yml");

  assert.match(
    compose,
    /app:[\s\S]*?depends_on:\s*\n\s*migrate:\s*\n\s*condition: service_completed_successfully/,
  );
});

test("container and package runtimes stay on the same Node major", () => {
  const dockerfile = read("Dockerfile");
  const packageJson = JSON.parse(read("package.json")) as {
    engines?: { node?: string };
  };

  assert.equal(packageJson.engines?.node, "20.x");
  assert.match(dockerfile, /^FROM node:20-alpine AS deps/m);
  assert.match(dockerfile, /^FROM node:20-alpine AS builder/m);
  assert.match(dockerfile, /^FROM node:20-alpine AS runner/m);
});
