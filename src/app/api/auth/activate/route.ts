import { NextResponse } from "next/server";
import { z } from "zod";
import {
  activateInvitation,
  GENERIC_ACTIVATION_ERROR,
  validateNewPassword,
} from "@/lib/auth-credentials";

const activationSchema = z.object({
  token: z.string().trim().min(1).max(256),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = activationSchema.safeParse(payload);
  if (!parsed.success || !validateNewPassword(parsed.data.password)) {
    return NextResponse.json({ error: GENERIC_ACTIVATION_ERROR }, { status: 400 });
  }

  try {
    const activated = await activateInvitation(parsed.data.token, parsed.data.password);
    if (!activated) {
      return NextResponse.json({ error: GENERIC_ACTIVATION_ERROR }, { status: 400 });
    }

    return NextResponse.json({ activated: true });
  } catch (error) {
    console.error("[auth:activate]", error);
    return NextResponse.json({ error: GENERIC_ACTIVATION_ERROR }, { status: 400 });
  }
}
