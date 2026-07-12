export const SUPPORTED_CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$", locale: "en-US" },
  { code: "EUR", name: "Euro", symbol: "€", locale: "en-DE" },
  { code: "GBP", name: "British Pound", symbol: "£", locale: "en-GB" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", locale: "en-NG" },
  { code: "ZAR", name: "South African Rand", symbol: "R", locale: "en-ZA" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", locale: "en-AU" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", locale: "en-CA" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", locale: "ja-JP" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", locale: "zh-CN" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", locale: "en-IN" },
  { code: "AED", name: "UAE Dirham", symbol: "AED", locale: "en-AE" },
  { code: "SAR", name: "Saudi Riyal", symbol: "SR", locale: "en-SA" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", locale: "en-SG" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", locale: "de-CH" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "GH₵", locale: "en-GH" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", locale: "en-KE" },
  { code: "XOF", name: "West African CFA Franc", symbol: "CFA", locale: "fr-SN" },
  { code: "XAF", name: "Central African CFA Franc", symbol: "FCFA", locale: "fr-CM" },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

const CURRENCY_MAP = new Map<string, (typeof SUPPORTED_CURRENCIES)[number]>();
for (const currency of SUPPORTED_CURRENCIES) {
  CURRENCY_MAP.set(currency.code, currency);
}

export function getCurrencyByCode(code: string) {
  return CURRENCY_MAP.get(code.toUpperCase()) ?? null;
}

export function isSupportedCurrency(code: string): code is CurrencyCode {
  return CURRENCY_MAP.has(code.toUpperCase());
}

export function getCurrencySymbol(code: string) {
  return getCurrencyByCode(code)?.symbol ?? code;
}

export function getCurrencyLocale(code: string) {
  return getCurrencyByCode(code)?.locale ?? "en-US";
}

export function formatCurrencyValue(
  value: number | string | undefined | null,
  currencyCode: string,
  options?: { compact?: boolean; decimals?: number },
): string {
  const num = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  if (!Number.isFinite(num)) {
    return `${getCurrencySymbol(currencyCode)} 0`;
  }

  const locale = getCurrencyLocale(currencyCode);
  const compact = options?.compact ?? false;
  const decimals = options?.decimals ?? 0;

  if (compact && Math.abs(num) >= 1_000_000) {
    return `${getCurrencySymbol(currencyCode)} ${(num / 1_000_000).toFixed(1)}M`;
  }
  if (compact && Math.abs(num) >= 1_000) {
    return `${getCurrencySymbol(currencyCode)} ${(num / 1_000).toFixed(1)}k`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode.toUpperCase(),
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  } catch {
    return `${getCurrencySymbol(currencyCode)} ${num.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  }
}

export function formatCurrencyValueRaw(
  value: number | string | undefined | null,
  currencyCode: string,
  options?: { compact?: boolean; decimals?: number },
): string {
  const num = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  if (!Number.isFinite(num)) {
    return "0";
  }

  const locale = getCurrencyLocale(currencyCode);
  const compact = options?.compact ?? false;
  const decimals = options?.decimals ?? 0;

  if (compact && Math.abs(num) >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (compact && Math.abs(num) >= 1_000) {
    return `${(num / 1_000).toFixed(1)}k`;
  }

  return num.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export const DEFAULT_GLOBAL_CURRENCY: CurrencyCode = "USD";
