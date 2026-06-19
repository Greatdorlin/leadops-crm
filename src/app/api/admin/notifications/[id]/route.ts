import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { markNotificationRead } from "@/lib/crm/notification-events";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context?.crmUser?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = typeof payload?.action === "string" ? payload.action : "read";

  if (action !== "read") {
    return NextResponse.json({ error: "Unsupported notification action." }, { status: 400 });
  }

  const notification = await markNotificationRead(id, context.crmUser.id);
  if (!notification) {
    return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  }

  return NextResponse.json({ notification });
}
