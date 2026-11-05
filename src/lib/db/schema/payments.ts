import {
  check,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { leads } from "./leads";
import { crmUsers } from "./users";

export const paymentClaims = pgTable(
  "payment_claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull().default("pending"),
    submittedByUserId: uuid("submitted_by_user_id").references(
      () => crmUsers.id,
      {
        onDelete: "set null",
      },
    ),
    submittedByEmail: text("submitted_by_email"),
    reviewedByUserId: uuid("reviewed_by_user_id").references(
      () => crmUsers.id,
      {
        onDelete: "set null",
      },
    ),
    reviewedByEmail: text("reviewed_by_email"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    commissionAmount: numeric("commission_amount", { precision: 12, scale: 2 }),
    commissionRecipientUserId: uuid("commission_recipient_user_id").references(
      () => crmUsers.id,
      { onDelete: "set null" },
    ),
    commissionConfirmedAt: timestamp("commission_confirmed_at", {
      withTimezone: true,
    }),
    commissionConfirmedByUserId: uuid(
      "commission_confirmed_by_user_id",
    ).references(() => crmUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    leadIdIdx: index("payment_claims_lead_id_idx").on(table.leadId),
    statusCreatedAtIdx: index("payment_claims_status_created_at_idx").on(
      table.status,
      table.createdAt,
    ),
    commissionRecipientIdx: index("payment_claims_commission_recipient_idx").on(
      table.commissionRecipientUserId,
    ),
    amountCheck: check("payment_claims_amount_check", sql`${table.amount} > 0`),
    commissionAmountCheck: check(
      "payment_claims_commission_amount_check",
      sql`${table.commissionAmount} is null or ${table.commissionAmount} >= 0`,
    ),
    statusCheck: check(
      "payment_claims_status_check",
      sql`${table.status} in ('pending', 'approved', 'rejected')`,
    ),
    reviewStateCheck: check(
      "payment_claims_review_state_check",
      sql`(${table.status} = 'pending' and ${table.reviewedAt} is null) or (${table.status} <> 'pending' and ${table.reviewedAt} is not null)`,
    ),
    commissionStateCheck: check(
      "payment_claims_commission_state_check",
      sql`${table.commissionConfirmedAt} is null or ${table.status} = 'approved'`,
    ),
  }),
);

export type PaymentClaimRow = typeof paymentClaims.$inferSelect;
