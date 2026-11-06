import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageAdminSettings } from "@/lib/crm/authz";
import { getDb } from "@/lib/db/client";
import { productCatalog, workspaceAuditLogs } from "@/lib/db/schema";
import {
  listProducts,
  productSchema,
  EXAMPLE_PRODUCTS,
} from "@/lib/crm/products";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";
import { body, sameOrigin } from "@/lib/assistant/http";
export async function GET() {
  const c = await getAdminRequestContext();
  if (!c?.permissions.includes("canViewLeads"))
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return NextResponse.json({ products: await listProducts() });
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const c = await getAdminRequestContext();
    if (!c || !canManageAdminSettings(c))
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    const raw = await body(request);
    const db = getDb();
    const settings = await getCompanySettings();
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(74201932)`);
      if (raw.preset === true) {
        const rows = await tx
          .select({ id: productCatalog.id })
          .from(productCatalog)
          .limit(1);
        if (rows.length)
          throw new Error(
            "Example products can only be added to an empty catalog.",
          );
        await tx
          .insert(productCatalog)
          .values(
            EXAMPLE_PRODUCTS.map((p) => ({
              ...p,
              value: String(p.value),
              currency: settings.globalCurrency,
            })),
          );
      } else {
        const { id, ...values } = raw;
        const parsed = productSchema.parse(values);
        const data = {
          ...parsed,
          value: parsed.value === null ? null : String(parsed.value),
        };
        if (id) {
          await tx
            .update(productCatalog)
            .set(data)
            .where(eq(productCatalog.id, z.string().uuid().parse(id)));
        } else await tx.insert(productCatalog).values(data);
      }
      await tx
        .insert(workspaceAuditLogs)
        .values({
          eventType: "products.updated",
          actorUserId: c.crmUser?.id,
          actorEmail: c.session.user?.email ?? "",
          targetType: "product_catalog",
        });
    });
    return NextResponse.json({ products: await listProducts() });
  } catch {
    return NextResponse.json(
      { error: "Check the product details and try again." },
      { status: 400 },
    );
  }
}
