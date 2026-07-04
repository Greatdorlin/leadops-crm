// Re-export from canonical currency module
export {
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
  getCurrencyByCode,
  isSupportedCurrency,
  getCurrencySymbol,
  getCurrencyLocale,
  formatCurrencyValue,
  formatCurrencyValueRaw,
  DEFAULT_GLOBAL_CURRENCY,
} from "@/lib/currency";

// Legacy alias for backward compatibility
export { DEFAULT_GLOBAL_CURRENCY as DEFAULT_CURRENCY } from "@/lib/currency";
