import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminRequestContext } from "@/lib/admin";
import { ADMIN_ACCESS_LEVELS } from "@/lib/admin-permissions";
import { ADMIN_ACCESS_VIEW_COOKIE } from "@/lib/admin-view";

const accessViewSchema = z.object({
  accessLevel: z.enum(ADMIN_ACCESS_LEVELS),
});

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!context.canSwitchAccessViews) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = accessViewSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid access view." }, { status: 400 });
  }

  const response = NextResponse.json({
    accessLevel: parsed.data.accessLevel,
  });

  response.cookies.set(ADMIN_ACCESS_VIEW_COOKIE, parsed.data.accessLevel, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
