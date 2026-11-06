import { redirect } from "next/navigation";
import { getAdminAccessContext } from "@/lib/admin";
import { canManageAdminSettings } from "@/lib/crm/authz";
import { listProducts } from "@/lib/crm/products";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductCatalogManager } from "@/components/admin/ProductCatalogManager";
export const dynamic = "force-dynamic";
export default async function Page() {
  const c = await getAdminAccessContext("/settings/products");
  if (!canManageAdminSettings(c)) redirect("/assistant");
  const products = await listProducts();
  return (
    <AdminShell
      activeNav="settings"
      title="Products and offers"
      description="Reusable products, suggested values and qualification."
      accessLevel={c.accessLevel}
      permissions={c.permissions}
    >
      <ProductCatalogManager
        initial={products.map(
          ({ id, name, description, value, currency, probability }) => ({
            id,
            name,
            description,
            value,
            currency,
            probability,
          }),
        )}
      />
    </AdminShell>
  );
}
