import assert from "node:assert/strict";
import test from "node:test";
import {
  assertFinanceTransition,
  financeBatchActionSchema,
  paymentClaimCreateSchema,
} from "@/lib/crm/payment-claims";

test("finance can only approve or reject pending claims", () => {
  assert.doesNotThrow(() => assertFinanceTransition("pending", "approve"));
  assert.throws(() => assertFinanceTransition("approved", "reject"), /Only pending/);
});

test("commission confirmation requires approved payment", () => {
  assert.doesNotThrow(() => assertFinanceTransition("approved", "confirm_commission"));
  assert.throws(() => assertFinanceTransition("pending", "confirm_commission"), /only be confirmed/);
  assert.throws(() => assertFinanceTransition("rejected", "confirm_commission"), /only be confirmed/);
});

test("finance batch actions are bounded and rejection requires a reason", () => {
  assert.equal(financeBatchActionSchema.safeParse({ claimIds: [], action: "approve", reason: "Verified by finance.", confirmation: "MAX CHANGE" }).success, false);
  assert.equal(financeBatchActionSchema.safeParse({ claimIds: ["2511d6ef-cdfa-4b9f-8660-f5a73a7a22d5"], action: "reject", reason: "Rejected by finance.", confirmation: "MAX CHANGE" }).success, false);
  assert.equal(financeBatchActionSchema.safeParse({ claimIds: ["2511d6ef-cdfa-4b9f-8660-f5a73a7a22d5"], action: "approve", reason: "Verified by finance.", confirmation: "max change" }).success, false);
});

test("commissions require both an amount and recipient", () => {
  const base = {
    leadId: "2511d6ef-cdfa-4b9f-8660-f5a73a7a22d5",
    amount: 500,
    currency: "usd",
  };
  assert.equal(paymentClaimCreateSchema.safeParse(base).success, true);
  assert.equal(paymentClaimCreateSchema.safeParse({ ...base, commissionAmount: 50 }).success, false);
  assert.equal(
    paymentClaimCreateSchema.safeParse({
      ...base,
      commissionAmount: 50,
      commissionRecipientUserId: "886ffacb-cba3-4758-be73-bb013a5da8ca",
    }).success,
    true,
  );
  assert.equal(paymentClaimCreateSchema.safeParse({ ...base, currency: "XYZ" }).success, false);
});
