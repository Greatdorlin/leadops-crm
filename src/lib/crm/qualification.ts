import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { productCatalog } from "@/lib/db/schema";
import {
  normalizeLeadOpportunityPayload,
  replaceLeadOpportunities,
  LeadOpportunityInputError,
  type AdminLeadOpportunityInput,
} from "./lead-opportunities";
import type { LeadOpportunityRecord } from "./types";
export const qualificationSchema = z
  .object({
    scope: z.enum(["one", "all"]),
    opportunityId: z.string().uuid().optional(),
    productId: z.string().uuid().optional(),
    status: z.enum(["qualified", "unqualified"]),
    reason: z.string().trim().max(1000).default(""),
  })
  .strict()
  .superRefine((v, c) => {
    if (
      v.scope === "one" &&
      Number(Boolean(v.opportunityId)) + Number(Boolean(v.productId)) !== 1
    )
      c.addIssue({
        code: "custom",
        message: "Choose one product.",
        path: ["productId"],
      });
    if (v.scope === "all" && (v.opportunityId || v.productId))
      c.addIssue({
        code: "custom",
        message: "Choose all products or one product.",
        path: ["scope"],
      });
    if (v.status === "unqualified" && !v.reason)
      c.addIssue({
        code: "custom",
        message: "Add a short reason.",
        path: ["reason"],
      });
  });
export type QualificationInput = z.infer<typeof qualificationSchema>;
export function qualificationPlan(
  rows: LeadOpportunityRecord[],
  input: QualificationInput,
  product?: {
    name: string;
    value: string | null;
    currency: string;
    probability: number;
  },
): AdminLeadOpportunityInput[] {
  const live = rows.filter((r) => !r.archivedAt);
  let found = false;
  const result: unknown[] = live.map((row) => {
    const chosen =
      input.scope === "all" ||
      row.id === input.opportunityId ||
      (product && row.offerLabel.toLowerCase() === product.name.toLowerCase());
    if (chosen && row.status !== "won" && row.status !== "lost") {
      found = true;
      return { ...row, status: input.status, reason: input.reason };
    }
    return row;
  });
  if (!found && input.scope === "one" && product) {
    if (
      live.some(
        (r) => r.offerLabel.toLowerCase() === product.name.toLowerCase(),
      )
    )
      throw new LeadOpportunityInputError(
        "This product already has a closed outcome. Review it in offer tracking.",
      );
    result.push({
      offerLabel: product.name,
      status: input.status,
      estimatedValue: product.value === null ? null : Number(product.value),
      currency: product.currency,
      closeProbability: product.probability,
      reason: input.reason,
      isPrimary: live.length === 0,
    });
    found = true;
  }
  if (!found)
    throw new LeadOpportunityInputError(
      input.scope === "all"
        ? "There are no open products to update. Add a product first."
        : "Choose an open product on this lead.",
    );
  const parsed = normalizeLeadOpportunityPayload({ opportunities: result });
  if (!parsed.success)
    throw new LeadOpportunityInputError(parsed.error.issues[0].message);
  return parsed.data.opportunities;
}
export async function qualifyLeadProducts(
  leadId: string,
  payload: unknown,
  options: { createdBy: string; globalCurrency: string },
) {
  const input = qualificationSchema.parse(payload);
  let product: typeof productCatalog.$inferSelect | undefined;
  if (input.productId) {
    [product] = await getDb()
      .select()
      .from(productCatalog)
      .where(eq(productCatalog.id, input.productId));
    if (!product || product.archived)
      throw new LeadOpportunityInputError("Choose an active product.");
  }
  return replaceLeadOpportunities(
    leadId,
    (rows) => qualificationPlan(rows, input, product),
    options,
  );
}
export { isUnqualifiedStage } from "./qualification-stage";
