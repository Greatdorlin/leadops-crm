import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageCurrencySettings } from "@/lib/crm/authz";
import {
  changeWorkspaceCurrency,
  getExchangeRateQuote,
  exchangeRateOverrideSchema,
  listCurrencyExchangeRates,
  upsertCurrencyExchangeRate,
  workspaceCurrencyChangeSchema,
} from "@/lib/crm/currency-exchange";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";

export async function GET(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const query = new URL(request.url).searchParams;
  if (query.has("base") || query.has("quote")) {
    const parsed = exchangeRateOverrideSchema.safeParse({baseCurrency: query.get("base"), quoteCurrency: query.get("quote"), rate: 1});
    if (!parsed.success) return NextResponse.json({error: "Choose two different supported currencies."}, {status: 400});
    const quote = await getExchangeRateQuote(parsed.data.baseCurrency, parsed.data.quoteCurrency);
    return NextResponse.json(quote ? {quote} : {error: "The latest rate is unavailable. Try again or use your own rate."}, {status: quote ? 200 : 503, headers: {"Cache-Control": "no-store"}});
  }
  const [settings, exchangeRates] = await Promise.all([
    getCompanySettings(),
    listCurrencyExchangeRates(),
  ]);
  return NextResponse.json({
    settings: { globalCurrency: settings.globalCurrency },
    exchangeRates,
  });
}

export async function PATCH(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageCurrencySettings(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = workspaceCurrencyChangeSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Currency settings are invalid." },
      { status: 400 },
    );
  }

  try {
    const result = await changeWorkspaceCurrency({
      nextCurrency: parsed.data.globalCurrency,
      exchangeRate: parsed.data.exchangeRate,
      actorEmail: context.session.user?.email ?? null,
    });
    revalidatePath("/", "layout");
    return NextResponse.json({ settings: { globalCurrency: result.globalCurrency }, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Currency settings could not be updated." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canManageCurrencySettings(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  if (payload?.mode === "automatic") {
    const pair = exchangeRateOverrideSchema.safeParse({...payload, rate: 1});
    if (!pair.success) return NextResponse.json({error: "Choose two different supported currencies."}, {status: 400});
    const quote = await getExchangeRateQuote(pair.data.baseCurrency, pair.data.quoteCurrency, undefined, true);
    if (!quote) return NextResponse.json({error: "The latest rate is unavailable. Your saved rate is unchanged."}, {status: 503});
    revalidatePath("/", "layout");
    return NextResponse.json({quote, exchangeRates: await listCurrencyExchangeRates()});
  }
  const parsed = exchangeRateOverrideSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Exchange rate is invalid." },
      { status: 400 },
    );
  }

  const exchangeRate = await upsertCurrencyExchangeRate({
    ...parsed.data,
    source: "manual",
    updatedBy: context.session.user?.email ?? null,
  });
  revalidatePath("/", "layout");
  return NextResponse.json({ exchangeRate });
}
