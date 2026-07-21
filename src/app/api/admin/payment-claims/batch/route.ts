import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canVerifyPaymentClaims } from "@/lib/crm/authz";
import { applyFinanceBatchAction, financeBatchActionSchema } from "@/lib/crm/payment-claims";

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canVerifyPaymentClaims(context)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const parsed = financeBatchActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Finance action is invalid." }, { status: 400 });
  }
  try {
    const result = await applyFinanceBatchAction({
      ...parsed.data,
      actorUserId: context.crmUser?.id ?? null,
      actorEmail: context.session.user?.email ?? null,
    });
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Finance action could not be completed." }, { status: 409 });
  }
}
