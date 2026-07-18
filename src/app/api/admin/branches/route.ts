import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageBranches } from "@/lib/crm/authz";
import { getDb } from "@/lib/db/client";
import { branches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const createBranchSchema = z.object({
  name: z.string().trim().min(2).max(120),
  location: z.string().trim().max(240).optional().nullable(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
});

export async function GET() {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageBranches(context)) {
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

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canManageBranches(context)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const parsed = createBranchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Add a valid branch name and currency." }, { status: 400 });

  const db = getDb();
  const [branch] = await db.insert(branches).values({
    name: parsed.data.name,
    location: parsed.data.location || null,
    currency: parsed.data.currency,
  }).returning();

  return NextResponse.json({ branch }, { status: 201 });
}
