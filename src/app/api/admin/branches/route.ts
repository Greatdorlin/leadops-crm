import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageBranches } from "@/lib/crm/authz";
import { getDb } from "@/lib/db/client";
import { branches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageBranches({ accessLevel: context.accessLevel, role: context.role })) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(branches)
    .where(eq(branches.archived, false))
    .orderBy(branches.name);

  return NextResponse.json({ branches: rows });
}
