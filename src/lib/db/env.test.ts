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

test("getDatabaseUrl prefers DATABASE_URL over compatibility envs", () => {
  withEnv(
    {
      DATABASE_URL: "postgresql://primary.example.com:5432/leads_desk",
      POSTGRES_URL: "postgresql://legacy.example.com:5432/legacy",
      PATHWAYFINDER_DATABASE_URL: "postgresql://pathway.example.com:5432/pathway",
    },
    () => {
      assert.equal(getDatabaseUrl(), "postgresql://primary.example.com:5432/leads_desk");
    },
  );
});

test("getDatabaseUrl falls back to compatibility envs only when DATABASE_URL is missing", () => {
  withEnv(
    {
      DATABASE_URL: undefined,
      POSTGRES_URL: undefined,
      POSTGRES_PRISMA_URL: undefined,
      POSTGRES_URL_NON_POOLING: undefined,
      PATHWAYFINDER_DATABASE_URL: "postgresql://pathway.example.com:5432/pathway",
      PATHWAYFINDER_POSTGRES_URL: undefined,
      PATHWAYFINDER_POSTGRES_PRISMA_URL: undefined,
      PATHWAYFINDER_POSTGRES_URL_NON_POOLING: undefined,
    },
    () => {
      assert.equal(getDatabaseUrl(), "postgresql://pathway.example.com:5432/pathway");
    },
  );
});
