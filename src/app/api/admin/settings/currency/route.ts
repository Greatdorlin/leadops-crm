import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageCurrencySettings } from "@/lib/crm/authz";
import {
  changeWorkspaceCurrency,
  exchangeRateOverrideSchema,
  listCurrencyExchangeRates,
  upsertCurrencyExchangeRate,
  workspaceCurrencyChangeSchema,
} from "@/lib/crm/currency-exchange";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";

export async function GET() {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
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
  return NextResponse.json({ exchangeRate });
}
