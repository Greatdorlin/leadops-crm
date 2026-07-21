import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { isSupportedCurrency } from "@/lib/currency";
import { getDb } from "@/lib/db/client";
import {
  companySettings,
  currencyExchangeRates,
  leadOpportunities,
  leads,
} from "@/lib/db/schema";

export type ExchangeRateSource = "manual" | "automatic";

export interface CurrencyExchangeRateRecord {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  source: ExchangeRateSource;
  updatedBy: string | null;
  fetchedAt: string | null;
  updatedAt: string;
}

const supportedCurrencySchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine(isSupportedCurrency, "Choose a supported currency.");

export const exchangeRateOverrideSchema = z
  .object({
    baseCurrency: supportedCurrencySchema,
    quoteCurrency: supportedCurrencySchema,
    rate: z.coerce.number().positive("Exchange rate must be greater than zero."),
  })
  .refine((value) => value.baseCurrency !== value.quoteCurrency, {
    message: "Choose two different currencies.",
    path: ["quoteCurrency"],
  });

export const workspaceCurrencyChangeSchema = z.object({
  globalCurrency: supportedCurrencySchema,
  exchangeRate: z.coerce.number().positive("Add a positive exchange rate.").optional(),
});

export function convertCurrencyAmount(amount: number, rate: number) {
  if (!Number.isFinite(amount)) {
    throw new Error("Amount must be a finite number.");
  }
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Exchange rate must be greater than zero.");
  }
  return Math.round((amount * rate + Number.EPSILON) * 100) / 100;
}

function mapRate(row: typeof currencyExchangeRates.$inferSelect): CurrencyExchangeRateRecord {
  return {
    id: row.id,
    baseCurrency: row.baseCurrency,
    quoteCurrency: row.quoteCurrency,
    rate: Number.parseFloat(row.rate),
    source: row.source as ExchangeRateSource,
    updatedBy: row.updatedBy,
    fetchedAt: row.fetchedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listCurrencyExchangeRates() {
  const rows = await getDb()
    .select()
    .from(currencyExchangeRates)
    .orderBy(asc(currencyExchangeRates.baseCurrency), asc(currencyExchangeRates.quoteCurrency));
  return rows.map(mapRate);
}

export async function upsertCurrencyExchangeRate(input: {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  source?: ExchangeRateSource;
  updatedBy?: string | null;
  fetchedAt?: Date | null;
}) {
  const parsed = exchangeRateOverrideSchema.parse(input);
  const db = getDb();
  const now = new Date();
  const [row] = await db
    .insert(currencyExchangeRates)
    .values({
      baseCurrency: parsed.baseCurrency,
      quoteCurrency: parsed.quoteCurrency,
      rate: parsed.rate.toFixed(8),
      source: input.source ?? "manual",
      updatedBy: input.updatedBy?.trim() || null,
      fetchedAt: input.fetchedAt ?? null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [currencyExchangeRates.baseCurrency, currencyExchangeRates.quoteCurrency],
      set: {
        rate: parsed.rate.toFixed(8),
        source: input.source ?? "manual",
        updatedBy: input.updatedBy?.trim() || null,
        fetchedAt: input.fetchedAt ?? null,
        updatedAt: now,
      },
    })
    .returning();
  return row ? mapRate(row) : null;
}

export async function changeWorkspaceCurrency(input: {
  nextCurrency: string;
  exchangeRate?: number;
  actorEmail?: string | null;
}) {
  const parsed = workspaceCurrencyChangeSchema.parse({
    globalCurrency: input.nextCurrency,
    exchangeRate: input.exchangeRate,
  });
  const db = getDb();

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('leads_desk_currency_change'))`);
    let [settings] = await tx
      .select()
      .from(companySettings)
      .orderBy(asc(companySettings.createdAt))
      .for("update")
      .limit(1);
    if (!settings) {
      [settings] = await tx.insert(companySettings).values({}).returning();
    }

    const previousCurrency = settings?.globalCurrency.trim().toUpperCase() || "USD";
    const nextCurrency = parsed.globalCurrency;
    if (previousCurrency === nextCurrency) {
      return { previousCurrency, globalCurrency: nextCurrency, converted: false };
    }

    if (!parsed.exchangeRate) {
      throw new Error(
        `Add the ${previousCurrency} to ${nextCurrency} rate before changing currency. Existing values will be converted, not relabelled.`,
      );
    }

    const rate = parsed.exchangeRate;
    const rateSql = sql`${rate}::numeric`;

    await tx
      .update(leads)
      .set({
        estimatedValue: sql`case when ${leads.estimatedValue} is null then null else round(${leads.estimatedValue} * ${rateSql}, 2) end`,
        expectedValue: sql`case when ${leads.expectedValue} is null then null else round(${leads.expectedValue} * ${rateSql}, 2) end`,
        wonValue: sql`case when ${leads.wonValue} is null then null else round(${leads.wonValue} * ${rateSql}, 2) end`,
        updatedAt: new Date(),
      });

    // Legacy opportunities without a currency were denominated in the old workspace currency.
    await tx
      .update(leadOpportunities)
      .set({
        estimatedValue: sql`case when ${leadOpportunities.currency} is null and ${leadOpportunities.estimatedValue} is not null then round(${leadOpportunities.estimatedValue} * ${rateSql}, 2) else ${leadOpportunities.estimatedValue} end`,
        expectedValue: sql`case when ${leadOpportunities.currency} is null and ${leadOpportunities.expectedValue} is not null then round(${leadOpportunities.expectedValue} * ${rateSql}, 2) else ${leadOpportunities.expectedValue} end`,
        currency: sql`case when ${leadOpportunities.currency} is null then ${nextCurrency} else ${leadOpportunities.currency} end`,
        exchangeRateToGlobal: sql`case
          when ${leadOpportunities.currency} is null or ${leadOpportunities.currency} = ${nextCurrency} then null
          when ${leadOpportunities.currency} = ${previousCurrency} then ${rateSql}
          when ${leadOpportunities.exchangeRateToGlobal} is null then null
          else ${leadOpportunities.exchangeRateToGlobal} * ${rateSql}
        end`,
        updatedAt: new Date(),
      });

    const now = new Date();
    await tx
      .insert(currencyExchangeRates)
      .values({
        baseCurrency: previousCurrency,
        quoteCurrency: nextCurrency,
        rate: rate.toFixed(8),
        source: "manual",
        updatedBy: input.actorEmail?.trim() || null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [currencyExchangeRates.baseCurrency, currencyExchangeRates.quoteCurrency],
        set: {
          rate: rate.toFixed(8),
          source: "manual",
          updatedBy: input.actorEmail?.trim() || null,
          fetchedAt: null,
          updatedAt: now,
        },
      });

    await tx
      .update(companySettings)
      .set({ globalCurrency: nextCurrency, updatedAt: now })
      .where(eq(companySettings.id, settings.id));

    return { previousCurrency, globalCurrency: nextCurrency, converted: true, exchangeRate: rate };
  });
}

export async function resolveExchangeRate(baseCurrency: string, quoteCurrency: string) {
  const base = baseCurrency.trim().toUpperCase();
  const quote = quoteCurrency.trim().toUpperCase();
  if (base === quote) return 1;

  const db = getDb();
  const [direct] = await db
    .select({ rate: currencyExchangeRates.rate })
    .from(currencyExchangeRates)
    .where(
      and(
        eq(currencyExchangeRates.baseCurrency, base),
        eq(currencyExchangeRates.quoteCurrency, quote),
      ),
    )
    .limit(1);
  if (direct) return Number.parseFloat(direct.rate);

  const [inverse] = await db
    .select({ rate: currencyExchangeRates.rate })
    .from(currencyExchangeRates)
    .where(
      and(
        eq(currencyExchangeRates.baseCurrency, quote),
        eq(currencyExchangeRates.quoteCurrency, base),
      ),
    )
    .limit(1);
  return inverse ? 1 / Number.parseFloat(inverse.rate) : null;
}
