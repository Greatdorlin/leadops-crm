import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageAdminSettings } from "@/lib/crm/authz";
import { listRolePermissions, setRolePermission, resetRolePermissionsToDefaults } from "@/lib/crm/role-permissions";
import {
  isPermissionKey,
  isPermissionRole,
} from "@/lib/crm/role-permissions-contract";

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
      return NextResponse.json({ success: true, permissions: await listRolePermissions() });
    } catch (error) {
      console.error("[api:role-permissions] reset error:", error);
      return NextResponse.json({ error: "Failed to reset permissions." }, { status: 500 });
    }
  }

  const role = body.role;
  const permission = body.permission;
  const enabled = body.enabled;

  if (!isPermissionRole(role) || !isPermissionKey(permission) || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Missing role, permission, or enabled." }, { status: 400 });
  }

  if (role === "admin" && !enabled) {
    return NextResponse.json(
      { error: "Owner permissions cannot be disabled." },
      { status: 400 },
    );
  }

  try {
    await setRolePermission(role, permission, enabled);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api:role-permissions] POST error:", error);
    return NextResponse.json({ error: "Failed to update permission." }, { status: 500 });
  }
}
