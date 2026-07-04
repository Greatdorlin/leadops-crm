import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageAdminSettings } from "@/lib/crm/authz";
import { listRolePermissions, setRolePermission, resetRolePermissionsToDefaults } from "@/lib/crm/role-permissions";
import type { PermissionKey } from "@/lib/crm/role-permissions";
import type { CrmUserRole } from "@/lib/crm/types";

export async function GET() {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageAdminSettings(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const permissions = await listRolePermissions();
    return NextResponse.json({ permissions });
  } catch (error) {
    console.error("[api:role-permissions] GET error:", error);
    return NextResponse.json({ error: "Failed to load permissions." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageAdminSettings(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const action = body.action;

  if (action === "reset") {
    try {
      await resetRolePermissionsToDefaults();
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("[api:role-permissions] reset error:", error);
      return NextResponse.json({ error: "Failed to reset permissions." }, { status: 500 });
    }
  }

  const role = body.role as CrmUserRole | undefined;
  const permission = body.permission as PermissionKey | undefined;
  const enabled = body.enabled as boolean | undefined;

  if (!role || !permission || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Missing role, permission, or enabled." }, { status: 400 });
  }

  try {
    await setRolePermission(role, permission, enabled);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api:role-permissions] POST error:", error);
    return NextResponse.json({ error: "Failed to update permission." }, { status: 500 });
  }
}
