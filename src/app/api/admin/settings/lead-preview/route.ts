import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageLeadPreviewSettings } from "@/lib/crm/authz";
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import {
  getCompanySettings,
  leadPreviewCustomizationSchema,
  resolveLeadPreviewConfig,
  type LeadPreviewCustomizationConfig,
  updateCompanySettings,
} from "@/lib/crm/workspace-settings";

export async function GET() {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [settings, customFields] = await Promise.all([getCompanySettings(), listCustomFields()]);
  const leadPreview = resolveLeadPreviewConfig(settings.leadPreview, customFields);
  return NextResponse.json({ leadPreview });
}

export async function PATCH(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageLeadPreviewSettings({ accessLevel: context.accessLevel, role: context.role })) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = leadPreviewCustomizationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Lead preview settings are invalid." },
      { status: 400 },
    );
  }

  const customFields = await listCustomFields();
  const settings = await updateCompanySettings({
    leadPreviewConfig: resolveLeadPreviewConfig(
      parsed.data as Partial<LeadPreviewCustomizationConfig>,
      customFields,
    ),
  });
  return NextResponse.json({ leadPreview: settings.leadPreview });
}
