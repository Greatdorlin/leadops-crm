import { getCurrencyByCode, isSupportedCurrency, type CurrencyCode } from "@/lib/currency";

export interface WorkspaceLocaleSuggestion {
  country: string;
  region: string;
  city: string;
  timeZone: string;
  currency: CurrencyCode;
  locale: string;
}

const COUNTRY_LOCALE_SUGGESTIONS: Record<string, Omit<WorkspaceLocaleSuggestion, "country">> = {
  Cameroon: { region: "Littoral", city: "Douala", timeZone: "Africa/Douala", currency: "XAF", locale: "fr-CM" },
  "Côte d’Ivoire": { region: "Abidjan", city: "Abidjan", timeZone: "Africa/Abidjan", currency: "XOF", locale: "fr-CI" },
  Ghana: { region: "Greater Accra", city: "Accra", timeZone: "Africa/Accra", currency: "GHS", locale: "en-GH" },
  India: { region: "Delhi", city: "Delhi", timeZone: "Asia/Kolkata", currency: "INR", locale: "en-IN" },
  Kenya: { region: "Nairobi County", city: "Nairobi", timeZone: "Africa/Nairobi", currency: "KES", locale: "en-KE" },
  Nigeria: { region: "Lagos", city: "Lagos", timeZone: "Africa/Lagos", currency: "NGN", locale: "en-NG" },
  "Saudi Arabia": { region: "Riyadh", city: "Riyadh", timeZone: "Asia/Riyadh", currency: "SAR", locale: "ar-SA" },
  Singapore: { region: "Singapore", city: "Singapore", timeZone: "Asia/Singapore", currency: "SGD", locale: "en-SG" },
  "South Africa": { region: "Gauteng", city: "Johannesburg", timeZone: "Africa/Johannesburg", currency: "ZAR", locale: "en-ZA" },
  "United Arab Emirates": { region: "Dubai", city: "Dubai", timeZone: "Asia/Dubai", currency: "AED", locale: "en-AE" },
  "United Kingdom": { region: "England", city: "London", timeZone: "Europe/London", currency: "GBP", locale: "en-GB" },
  "United States": { region: "New York", city: "New York", timeZone: "America/New_York", currency: "USD", locale: "en-US" },
};

const FALLBACK_TIME_ZONES = [
  "UTC",
  "Africa/Abidjan",
  "Africa/Accra",
  "Africa/Cairo",
  "Africa/Douala",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Nairobi",
  "America/Chicago",
  "America/Los_Angeles",
  "America/New_York",
  "America/Sao_Paulo",
  "America/Toronto",
  "Asia/Dubai",
  "Asia/Hong_Kong",
  "Asia/Kolkata",
  "Asia/Riyadh",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Paris",
] as const;

export const DEFAULT_ONBOARDING_LOCALE: WorkspaceLocaleSuggestion = {
  country: "Nigeria",
  region: "Lagos",
  city: "Lagos",
  timeZone: "Africa/Lagos",
  currency: "NGN",
  locale: "en-NG",
};

export function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function getTimeZoneOptions() {
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: "timeZone") => string[];
  };
  const values = intl.supportedValuesOf?.("timeZone") ?? [...FALLBACK_TIME_ZONES];
  return Array.from(new Set(["UTC", ...values])).filter(isValidTimeZone);
}

export function getWorkspaceLocaleSuggestion(country: string): WorkspaceLocaleSuggestion {
  const normalizedCountry = country.trim();
  const suggestion = COUNTRY_LOCALE_SUGGESTIONS[normalizedCountry];

  return suggestion
    ? { country: normalizedCountry, ...suggestion }
    : {
        country: normalizedCountry,
        region: "",
        city: "",
        timeZone: "UTC",
        currency: "USD",
        locale: "en-US",
      };
}

export function getCurrencyLabel(code: string) {
  const currency = getCurrencyByCode(code);
  return currency ? `${currency.code} · ${currency.name}` : code;
}

export function normalizeWorkspaceCurrency(value: string, fallback: CurrencyCode = "USD") {
  const normalized = value.trim().toUpperCase();
  return isSupportedCurrency(normalized) ? normalized : fallback;
}
