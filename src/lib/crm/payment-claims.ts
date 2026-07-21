import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { leadEvents, leads, notificationEvents, paymentClaims } from "@/lib/db/schema";
import { isSupportedCurrency } from "@/lib/currency";

export const PAYMENT_CLAIM_STATUSES = ["pending", "approved", "rejected"] as const;
export type PaymentClaimStatus = (typeof PAYMENT_CLAIM_STATUSES)[number];
export type FinanceBatchAction = "approve" | "reject" | "confirm_commission";

export interface PaymentClaimRecord {
  id: string;
  leadId: string;
  leadLabel: string;
  amount: number;
  currency: string;
  status: PaymentClaimStatus;
  submittedByEmail: string | null;
  reviewedByEmail: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  commissionAmount: number | null;
  commissionRecipientUserId: string | null;
  commissionConfirmedAt: string | null;
  createdAt: string;
}

export const paymentClaimCreateSchema = z
  .object({
    leadId: z.string().uuid(),
    amount: z.coerce.number().positive("Payment amount must be greater than zero."),
    currency: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .refine(isSupportedCurrency, "Choose a supported currency."),
    commissionAmount: z.coerce.number().positive("Commission must be greater than zero.").optional().nullable(),
    commissionRecipientUserId: z.string().uuid().optional().nullable(),
  })
  .superRefine((value, context) => {
    if ((value.commissionAmount == null) !== (value.commissionRecipientUserId == null)) {
      context.addIssue({
        code: "custom",
        message: "Add both a commission amount and recipient, or leave both empty.",
        path: ["commissionAmount"],
      });
    }
  });

export const financeBatchActionSchema = z
  .object({
    claimIds: z.array(z.string().uuid()).min(1).max(250),
    action: z.enum(["approve", "reject", "confirm_commission"]),
    reason: z.string().trim().min(5, "Add a short reason for this mass change.").max(500),
    confirmation: z.literal("MAX CHANGE", "Type MAX CHANGE to confirm."),
    rejectionReason: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((value, context) => {
    if (value.action === "reject" && !value.rejectionReason) {
      context.addIssue({
        code: "custom",
        message: "Add a reason before rejecting a payment claim.",
        path: ["rejectionReason"],
      });
    }
  });

export function assertFinanceTransition(status: PaymentClaimStatus, action: FinanceBatchAction) {
  if ((action === "approve" || action === "reject") && status !== "pending") {
    throw new Error("Only pending payment claims can be approved or rejected.");
  }
  if (action === "confirm_commission" && status !== "approved") {
    throw new Error("Commission can only be confirmed after finance approves payment.");
  }
}

function leadLabel(firstName: string, lastName: string, email: string) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || email || "Unnamed lead";
}

export async function listPaymentClaims(options: {
  status?: PaymentClaimStatus;
  limit?: number;
} = {}): Promise<PaymentClaimRecord[]> {
  const conditions = [isNull(leads.deletedAt)];
  if (options.status) conditions.push(eq(paymentClaims.status, options.status));
  const rows = await getDb()
    .select({ claim: paymentClaims, firstName: leads.firstName, lastName: leads.lastName, email: leads.email })
    .from(paymentClaims)
    .innerJoin(leads, eq(paymentClaims.leadId, leads.id))
    .where(and(...conditions))
    .orderBy(desc(paymentClaims.createdAt))
    .limit(Math.min(Math.max(options.limit ?? 100, 1), 500));

  return rows.map(({ claim, firstName, lastName, email }) => ({
    id: claim.id,
    leadId: claim.leadId,
    leadLabel: leadLabel(firstName, lastName, email),
    amount: Number.parseFloat(claim.amount),
    currency: claim.currency,
    status: claim.status as PaymentClaimStatus,
    submittedByEmail: claim.submittedByEmail,
    reviewedByEmail: claim.reviewedByEmail,
    reviewedAt: claim.reviewedAt?.toISOString() ?? null,
    rejectionReason: claim.rejectionReason,
    commissionAmount: claim.commissionAmount === null ? null : Number.parseFloat(claim.commissionAmount),
    commissionRecipientUserId: claim.commissionRecipientUserId,
    commissionConfirmedAt: claim.commissionConfirmedAt?.toISOString() ?? null,
    createdAt: claim.createdAt.toISOString(),
  }));
}

export async function createPaymentClaim(input: {
  leadId: string;
  amount: number;
  currency: string;
  commissionAmount?: number | null;
  commissionRecipientUserId?: string | null;
  submittedByUserId?: string | null;
  submittedByEmail?: string | null;
}) {
  const parsed = paymentClaimCreateSchema.parse(input);
  const db = getDb();
  return db.transaction(async (tx) => {
    const [lead] = await tx
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.id, parsed.leadId), isNull(leads.deletedAt)))
      .limit(1);
    if (!lead) throw new Error("Lead not found.");

    const [created] = await tx
      .insert(paymentClaims)
      .values({
        leadId: parsed.leadId,
        amount: parsed.amount.toFixed(2),
        currency: parsed.currency,
        submittedByUserId: input.submittedByUserId ?? null,
        submittedByEmail: input.submittedByEmail?.trim().toLowerCase() || null,
        commissionAmount: parsed.commissionAmount?.toFixed(2) ?? null,
        commissionRecipientUserId: parsed.commissionRecipientUserId ?? null,
      })
      .returning();
    if (!created) throw new Error("Payment claim could not be created.");

    await tx.insert(leadEvents).values({
      leadId: parsed.leadId,
      eventType: "payment_claim_submitted",
      eventData: { claimId: created.id, amount: parsed.amount, currency: parsed.currency },
      createdBy: input.submittedByEmail?.trim().toLowerCase() || null,
    });
    return created.id;
  });
}

export async function applyFinanceBatchAction(input: {
  claimIds: string[];
  action: FinanceBatchAction;
  actorUserId?: string | null;
  actorEmail?: string | null;
  rejectionReason?: string | null;
}) {
  const parsed = financeBatchActionSchema.parse(input);
  const db = getDb();
  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(paymentClaims)
      .where(inArray(paymentClaims.id, parsed.claimIds));
    if (existing.length !== new Set(parsed.claimIds).size) {
      throw new Error("One or more payment claims no longer exist.");
    }
    for (const claim of existing) {
      assertFinanceTransition(claim.status as PaymentClaimStatus, parsed.action);
      if (parsed.action === "confirm_commission" && claim.commissionAmount === null) {
        throw new Error("Add a commission amount before confirming commission.");
      }
    }

    const now = new Date();
    const actorEmail = input.actorEmail?.trim().toLowerCase() || null;
    if (parsed.action === "confirm_commission") {
      await tx
        .update(paymentClaims)
        .set({
          commissionConfirmedAt: now,
          commissionConfirmedByUserId: input.actorUserId ?? null,
          updatedAt: now,
        })
        .where(inArray(paymentClaims.id, parsed.claimIds));
    } else {
      await tx
        .update(paymentClaims)
        .set({
          status: parsed.action === "approve" ? "approved" : "rejected",
          reviewedByUserId: input.actorUserId ?? null,
          reviewedByEmail: actorEmail,
          reviewedAt: now,
          rejectionReason: parsed.action === "reject" ? parsed.rejectionReason : null,
          updatedAt: now,
        })
        .where(inArray(paymentClaims.id, parsed.claimIds));
    }

    await tx.insert(leadEvents).values(
      existing.map((claim) => ({
        leadId: claim.leadId,
        eventType:
          parsed.action === "approve"
            ? "payment_claim_approved"
            : parsed.action === "reject"
              ? "payment_claim_rejected"
              : "commission_confirmed",
        eventData: {
          claimId: claim.id,
          amount: Number.parseFloat(claim.amount),
          currency: claim.currency,
          rejectionReason: parsed.action === "reject" ? parsed.rejectionReason : null,
          massChangeReason: parsed.reason,
        },
        createdBy: actorEmail,
      })),
    );

    await tx.insert(notificationEvents).values({
      type: "bulk_change_completed",
      channel: "in_app",
      recipientUserId: null,
      leadId: null,
      title: "Mass finance change completed",
      message: `${actorEmail || "Finance reviewer"} applied ${parsed.action.replaceAll("_", " ")} to ${existing.length} payment claim${existing.length === 1 ? "" : "s"}. Reason: ${parsed.reason}.`,
      status: "sent",
      createdAt: now,
    });

    return { updated: existing.length, action: parsed.action };
  });
}
