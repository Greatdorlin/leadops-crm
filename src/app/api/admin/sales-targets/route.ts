import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageSalesTargets } from "@/lib/crm/authz";
import {
  createSalesTarget,
  listSalesTargets,
  normalizeAdminSalesTargetPayload,
  SalesTargetAdminError,
} from "@/lib/crm/sales-targets-admin";

export async function GET(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageSalesTargets({ accessLevel: context.accessLevel, role: context.role })) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const includeArchived = new URL(request.url).searchParams.get("includeArchived") === "true";
  const targets = await listSalesTargets({ includeArchived });
  return NextResponse.json({ targets });
}

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageSalesTargets({ accessLevel: context.accessLevel, role: context.role })) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = normalizeAdminSalesTargetPayload(payload ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid sales target payload." },
      { status: 400 },
    );
  }

  try {
    const target = await createSalesTarget(parsed.data);
    return NextResponse.json({ target }, { status: 201 });
  } catch (error) {
    if (error instanceof SalesTargetAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "We couldn't save this sales target right now." }, { status: 500 });
  }
}
