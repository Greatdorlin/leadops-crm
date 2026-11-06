import { z } from "zod";
import { isSupportedCurrency } from "@/lib/currency";

const quoteSchema = z.object({
  base: z.string(), quote: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rate: z.number().finite().positive(),
});
export const MAX_RATE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Latest published daily reference rate. No CRM records or amounts leave the app. */
export async function fetchLiveExchangeRate(base: string, quote: string) {
  if (!isSupportedCurrency(base) || !isSupportedCurrency(quote)) {
    throw new Error("Choose a supported currency.");
  }
  const urls = [
    `https://api.frankfurter.dev/v2/rates?base=${base}&quotes=${quote}`,
    `https://api.frankfurter.dev/v2/rate/${base.toLowerCase()}/${quote.toLowerCase()}`,
  ];
  let payload: unknown;
  for (const [index,url] of urls.entries()) {
    try {
      const response=await fetch(url,{signal:AbortSignal.timeout(index === 0 ? 10000 : 5000),cache:"no-store",headers:{Accept:"application/json"}});
      if(!response.ok) throw new Error("The latest exchange rate is temporarily unavailable.");
      payload=await response.json();
      break;
    } catch(error) {if(index === urls.length-1) throw error;}
  }
  const data = quoteSchema.parse(Array.isArray(payload) ? payload[0] : payload);
  const asOf = new Date(`${data.date}T00:00:00.000Z`);
  const age = Date.now() - asOf.getTime();
  if (data.base.toUpperCase() !== base || data.quote.toUpperCase() !== quote ||
      !Number.isFinite(age) || age < -86400000 || age > MAX_RATE_AGE_MS) {
    throw new Error("The exchange-rate provider returned an invalid or outdated rate.");
  }
  return { rate: data.rate, asOf };
}
