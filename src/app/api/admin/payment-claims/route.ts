import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageLeadRecord } from "@/lib/admin-permissions";
import { canVerifyPaymentClaims } from "@/lib/crm/authz";
import { createPaymentClaim, listPaymentClaims, paymentClaimCreateSchema } from "@/lib/crm/payment-claims";
import { leadStore } from "@/lib/storage";

export async function GET(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canVerifyPaymentClaims(context)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const statusValue = new URL(request.url).searchParams.get("status");
  const status = statusValue === "pending" || statusValue === "approved" || statusValue === "rejected" ? statusValue : undefined;
  return NextResponse.json({ claims: await listPaymentClaims({ status, limit: 250 }) });
}

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const parsed = paymentClaimCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Payment claim is invalid." }, { status: 400 });
  }
  try {
    const lead = await leadStore.getById(parsed.data.leadId);
    if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    if (lead.deletedAt) {
      return NextResponse.json({ error: "Restore this lead before submitting payment." }, { status: 409 });
    }
    if (!canManageLeadRecord(
      context.accessLevel,
      lead,
      context.session.user?.email,
      context.permissions,
      context.crmUser,
    )) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    const id = await createPaymentClaim({
      ...parsed.data,
      submittedByUserId: context.crmUser?.id ?? null,
      submittedByEmail: context.session.user?.email ?? null,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Payment claim could not be created." }, { status: 400 });
  }
}
