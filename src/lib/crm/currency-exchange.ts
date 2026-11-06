import { fetchLiveExchangeRate, MAX_RATE_AGE_MS } from "./live-exchange-rate";
import { and, asc, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { isSupportedCurrency } from "@/lib/currency";
import { getDb, type DatabaseExecutor } from "@/lib/db/client";
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

    const rate = parsed.exchangeRate ?? await resolveExchangeRate(previousCurrency, nextCurrency, tx);
    if (!rate) {
      const [valuedLead] = await tx.select({ id: leads.id }).from(leads).where(or(
        isNotNull(leads.estimatedValue), isNotNull(leads.expectedValue), isNotNull(leads.wonValue),
      )).limit(1);
      const [valuedOffer] = await tx.select({ id: leadOpportunities.id }).from(leadOpportunities).where(or(
        and(isNull(leadOpportunities.currency), or(isNotNull(leadOpportunities.estimatedValue), isNotNull(leadOpportunities.expectedValue))),
        isNotNull(leadOpportunities.exchangeRateToGlobal),
      )).limit(1);
      if (valuedLead || valuedOffer) {
        throw new Error(`We could not load the latest ${previousCurrency} to ${nextCurrency} rate. Try again or add your own rate. Your current currency and values are unchanged.`);
      }
      await tx.update(companySettings).set({ globalCurrency: nextCurrency, updatedAt: new Date() })
        .where(eq(companySettings.id, settings.id));
      return { previousCurrency, globalCurrency: nextCurrency, converted: false };
    }

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
    if (parsed.exchangeRate !== undefined) {
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
    }

    await tx
      .update(companySettings)
      .set({ globalCurrency: nextCurrency, updatedAt: now })
      .where(eq(companySettings.id, settings.id));

    return { previousCurrency, globalCurrency: nextCurrency, converted: true, exchangeRate: rate };
  });
}

export interface ExchangeRateQuote {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  source: "manual" | "automatic";
  asOf: string;
  cached: boolean;
}

export async function getExchangeRateQuote(
  baseCurrency: string, quoteCurrency: string,
  db: DatabaseExecutor = getDb(), forceAutomatic = false,
): Promise<ExchangeRateQuote | null> {
  const base = supportedCurrencySchema.parse(baseCurrency);
  const quote = supportedCurrencySchema.parse(quoteCurrency);
  if (base === quote) return { baseCurrency: base, quoteCurrency: quote, rate: 1, source: "automatic", asOf: new Date().toISOString(), cached: false };
  const rows = await db.select().from(currencyExchangeRates).where(or(
    and(eq(currencyExchangeRates.baseCurrency, base), eq(currencyExchangeRates.quoteCurrency, quote)),
    and(eq(currencyExchangeRates.baseCurrency, quote), eq(currencyExchangeRates.quoteCurrency, base)),
  ));
  const saved = rows.find(r => r.baseCurrency === base) ?? rows[0];
  const savedQuote = saved ? {
    baseCurrency: base, quoteCurrency: quote,
    rate: saved.baseCurrency === base ? Number(saved.rate) : 1 / Number(saved.rate),
    source: saved.source as "manual" | "automatic",
    asOf: (saved.fetchedAt ?? saved.updatedAt).toISOString(), cached: true,
  } : null;
  if (!forceAutomatic && savedQuote?.source === "manual") return savedQuote;
  const validCache = savedQuote?.source === "automatic" && Date.now() - new Date(savedQuote.asOf).getTime() <= MAX_RATE_AGE_MS;
  if (!forceAutomatic && validCache && Date.now() - saved!.updatedAt.getTime() < 6 * 60 * 60 * 1000) return savedQuote;
  try {
    const live = await fetchLiveExchangeRate(base, quote);
    const now = new Date();
    const values = { baseCurrency: base, quoteCurrency: quote, rate: live.rate.toFixed(8), source: "automatic", fetchedAt: live.asOf, updatedBy: null, updatedAt: now };
    await db.insert(currencyExchangeRates).values(values).onConflictDoUpdate({
      target: [currencyExchangeRates.baseCurrency, currencyExchangeRates.quoteCurrency],
      set: values,
      ...(forceAutomatic ? {} : { setWhere: sql`${currencyExchangeRates.source} != 'manual'` }),
    });
    return { baseCurrency: base, quoteCurrency: quote, rate: live.rate, source: "automatic", asOf: live.asOf.toISOString(), cached: false };
  } catch {
    if (!forceAutomatic && validCache) return savedQuote;
    return null;
  }
}

export async function resolveExchangeRate(baseCurrency: string, quoteCurrency: string, db: DatabaseExecutor = getDb()) {
  return (await getExchangeRateQuote(baseCurrency, quoteCurrency, db))?.rate ?? null;
}
