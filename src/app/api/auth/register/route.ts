import { NextResponse } from "next/server";
import { z } from "zod";
import { getActivationBaseUrl } from "@/lib/auth-credentials";
import { registerApprovedDomainUser } from "@/lib/auth-registration";

const registrationSchema = z.object({
  email: z.string().trim().email().max(320),
  fullName: z.string().trim().min(2).max(120),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = registrationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid name and work email." }, { status: 400 });
  }

  try {
    const requestOrigin = process.env.NODE_ENV === "production" ? null : new URL(request.url).origin;
    const result = await registerApprovedDomainUser({
      ...parsed.data,
      baseUrl: getActivationBaseUrl() ?? requestOrigin,
    });
    if (!result.accepted) {
      return NextResponse.json(
        { error: "Registration is not available for this email address." },
        { status: 403 },
      );
    }

    return NextResponse.json({ accepted: true });
  } catch (error) {
    console.error("[auth:approved-domain-registration]", error);
    return NextResponse.json(
      { error: "Registration is unavailable right now. Please contact the workspace owner." },
      { status: 500 },
    );
  }
}
