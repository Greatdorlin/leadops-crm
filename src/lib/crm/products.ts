import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { productCatalog } from "@/lib/db/schema";
import { isSupportedCurrency } from "@/lib/currency";
export const productSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500).default(""),
    value: z.number().finite().nonnegative().max(999999999999.99).nullable(),
    currency: z.string().toUpperCase().refine(isSupportedCurrency),
    probability: z.number().int().min(0).max(100),
    archived: z.boolean().optional(),
  })
  .strict();
export async function listProducts() {
  return getDb()
    .select()
    .from(productCatalog)
    .where(eq(productCatalog.archived, false))
    .orderBy(asc(productCatalog.name))
    .limit(200);
}
export const EXAMPLE_PRODUCTS = [
  {
    name: "Consultation",
    description: "Example product — edit the price for your business.",
    value: 250,
    probability: 50,
  },
  {
    name: "Implementation package",
    description: "Example product — edit the price for your business.",
    value: 2500,
    probability: 50,
  },
  {
    name: "Ongoing support",
    description: "Example monthly service — edit before use.",
    value: 1000,
    probability: 50,
  },
];
