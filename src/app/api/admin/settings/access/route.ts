import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageOwnerOnlySettings } from "@/lib/admin-permissions";
import { updateDomainRegistrationPolicy } from "@/lib/auth-registration";
import { normalizeApprovedRegistrationDomains } from "@/lib/auth-registration-policy";

const policySchema = z.object({
  enabled: z.boolean(),
  approvedDomains: z.array(z.string().trim().min(1).max(253)).max(50),
});

export async function PATCH(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!canManageOwnerOnlySettings(context.actualAccessLevel, context.accessLevel)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = policySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid registration policy." }, { status: 400 });
  }

  const approvedDomains = normalizeApprovedRegistrationDomains(parsed.data.approvedDomains);
  if (approvedDomains.length !== parsed.data.approvedDomains.length) {
    return NextResponse.json({ error: "Enter valid domains only, such as example.com." }, { status: 400 });
  }
  if (parsed.data.enabled && approvedDomains.length === 0) {
    return NextResponse.json({ error: "Add an approved domain before enabling registration." }, { status: 400 });
  }

  try {
    return NextResponse.json({
      policy: await updateDomainRegistrationPolicy({
        enabled: parsed.data.enabled,
        approvedDomains,
      }),
    });
  } catch (error) {
    console.error("[admin:settings:access]", error);
    return NextResponse.json({ error: "We couldn't save the registration policy." }, { status: 500 });
  }
}
