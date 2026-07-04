import assert from "node:assert/strict";
import test from "node:test";
import { getDatabaseUrl } from "@/lib/db/env";

function withEnv(
  values: Partial<Record<keyof NodeJS.ProcessEnv, string | undefined>>,
  callback: () => void,
) {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);

    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    callback();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("getDatabaseUrl prefers DATABASE_URL over platform envs", () => {
  withEnv(
    {
      DATABASE_URL: "postgresql://primary.example.com:5432/leads_desk",
      POSTGRES_URL: "postgresql://secondary.example.com:5432/leads_desk",
    },
    () => {
      assert.equal(getDatabaseUrl(), "postgresql://primary.example.com:5432/leads_desk");
    },
  );
});

test("getDatabaseUrl falls back to standard Postgres envs when DATABASE_URL is missing", () => {
  withEnv(
    {
      DATABASE_URL: undefined,
      POSTGRES_URL: "postgresql://secondary.example.com:5432/leads_desk",
      POSTGRES_PRISMA_URL: undefined,
      POSTGRES_URL_NON_POOLING: undefined,
    },
    () => {
      assert.equal(getDatabaseUrl(), "postgresql://secondary.example.com:5432/leads_desk");
    },
  );
});
