import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageIndustryPresets } from "@/lib/crm/authz";
import { getIndustryPreset } from "@/lib/crm/industry-presets";
import { getDb } from "@/lib/db/client";
import { leadStages, leadSources, customFields } from "@/lib/db/schema";

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageIndustryPresets(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const presetId = typeof payload?.presetId === "string" ? payload.presetId : "";
  const preset = getIndustryPreset(presetId);

  if (!preset) {
    return NextResponse.json({ error: "Invalid preset." }, { status: 400 });
  }

  try {
    const db = getDb();

    // Create stages
    for (let i = 0; i < preset.stages.length; i++) {
      const s = preset.stages[i];
      await db.insert(leadStages).values({
        name: s.label,
        key: s.value,
        color: s.color || null,
        sortOrder: i,
      }).onConflictDoNothing();
    }

    // Create sources
    for (let i = 0; i < preset.sources.length; i++) {
      const s = preset.sources[i];
      await db.insert(leadSources).values({
        name: s.label,
        key: s.value,
      }).onConflictDoNothing();
    }

    // Create custom fields
    for (let i = 0; i < preset.customFields.length; i++) {
      const f = preset.customFields[i];
      const key = f.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
      await db.insert(customFields).values({
        key,
        label: f.label,
        type: f.fieldType as "text" | "number" | "select" | "checkbox" | "date" | "textarea",
        placeholder: f.placeholder || null,
        description: f.helpText || null,
        required: f.isRequired,
        sortOrder: i,
      }).onConflictDoNothing();
    }

    return NextResponse.json({ success: true, presetId });
  } catch (error) {
    console.error("[industry-preset:apply]", error);
    return NextResponse.json({ error: "Failed to apply preset." }, { status: 500 });
  }
}
