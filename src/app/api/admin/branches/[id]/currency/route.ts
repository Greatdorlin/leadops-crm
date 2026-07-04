import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageBranches } from "@/lib/crm/authz";
import { getDb } from "@/lib/db/client";
import { branches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isSupportedCurrency } from "@/lib/currency";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageBranches({ accessLevel: context.accessLevel, role: context.role })) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Branch ID is required." }, { status: 400 });
  }

  const payload = await request.json().catch(() => null) as { currency?: string } | null;
  const currencyCode = payload?.currency?.trim()?.toUpperCase();

  if (!currencyCode || !isSupportedCurrency(currencyCode)) {
    return NextResponse.json({ error: "A valid 3-letter currency code is required." }, { status: 400 });
  }

  const db = getDb();
  const [updated] = await db
    .update(branches)
    .set({ currency: currencyCode, updatedAt: new Date() })
    .where(eq(branches.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Branch not found." }, { status: 404 });
  }

  return NextResponse.json({ branch: updated });
}
