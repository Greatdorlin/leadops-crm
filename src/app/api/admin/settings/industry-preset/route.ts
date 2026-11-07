import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageIndustryPresets } from "@/lib/crm/authz";
import { buildIndustryPresetFieldKey, getIndustryPreset } from "@/lib/crm/industry-presets";
import { getDb } from "@/lib/db/client";
import { customFieldOptions, customFields, leadSources, leadStages, workspaceAuditLogs } from "@/lib/db/schema";
import { recordWorkspaceAuditEvent } from "@/lib/crm/workspace-audit";

export async function GET() {
  const context = await getAdminRequestContext();
  if (!context || !canManageIndustryPresets(context)) return NextResponse.json({error:"Access denied."},{status:403});
  const db=getDb();
  const fields=await db.select({key:customFields.key,type:customFields.type,archived:customFields.archived}).from(customFields);
  const events=await db.select({targetId:workspaceAuditLogs.targetId,eventType:workspaceAuditLogs.eventType}).from(workspaceAuditLogs).where(eq(workspaceAuditLogs.eventType,"workspace.industry_preset_applied")).orderBy(desc(workspaceAuditLogs.createdAt)).limit(1);
  return NextResponse.json({fields,presetId:events.find(e=>e.eventType==="workspace.industry_preset_applied")?.targetId??null},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageIndustryPresets(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({error:"Open this action from your workspace."},{status:403});
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const presetId = typeof payload?.presetId === "string" ? payload.presetId : "";
  const preset = getIndustryPreset(presetId);

  if (!preset) {
    return NextResponse.json({ error: "Invalid preset." }, { status: 400 });
  }

  const selection = z.array(z.string().max(100)).max(100).optional().safeParse(payload?.fieldKeys);
  if (!selection.success || selection.data?.some(key=>!preset.customFields.some(f=>buildIndustryPresetFieldKey(f)===key))) return NextResponse.json({error:"Choose fields from this industry."},{status:400});
  const selectedFields = preset.customFields.filter(f=>!selection.data || selection.data.includes(buildIndustryPresetFieldKey(f)));
  try {
    const db = getDb();
    const created = { stages: 0, sources: 0, customFields: 0, options: 0 };

    await db.transaction(async (transaction) => {
      for (let i = 0; i < preset.stages.length; i++) {
        const stage = preset.stages[i];
        const rows = await transaction.insert(leadStages).values({
          name: stage.label,
          key: stage.value,
          color: stage.color || null,
          sortOrder: i,
          isWon: stage.value === "won",
          isLost: stage.value === "lost",
        }).onConflictDoNothing().returning({ id: leadStages.id });
        created.stages += rows.length;
      }

      for (let i = 0; i < preset.sources.length; i++) {
        const source = preset.sources[i];
        const rows = await transaction.insert(leadSources).values({
          name: source.label,
          key: source.value,
        }).onConflictDoNothing().returning({ id: leadSources.id });
        created.sources += rows.length;
      }

      for (let i = 0; i < selectedFields.length; i++) {
        const field = selectedFields[i];
        const key = buildIndustryPresetFieldKey(field);
        const [createdField] = await transaction.insert(customFields).values({
          key,
          label: field.label,
          type: field.fieldType,
          placeholder: field.placeholder || null,
          description: field.helpText || null,
          required: false,
          searchable: field.searchable ?? false,
          filterable: field.filterable ?? false,
          showInTable: field.showInTable ?? false,
          sortOrder: i,
        }).onConflictDoNothing().returning({ id: customFields.id });

        if (!createdField) continue;
        created.customFields += 1;
        if (field.options?.length) {
          await transaction.insert(customFieldOptions).values(
            field.options.map((option, optionIndex) => ({
              customFieldId: createdField.id,
              label: option.label,
              value: option.value,
              sortOrder: optionIndex,
            })),
          );
          created.options += field.options.length;
        }
      }

      await recordWorkspaceAuditEvent({
        eventType: "workspace.industry_preset_applied",
        actorEmail: context.session.user?.email ?? "unknown",
        actorUserId: context.crmUser?.id,
        targetType: "industry_preset",
        targetId: preset.id,
        details: { presetName: preset.name, created },
      }, transaction);
    });

    return NextResponse.json({ success: true, presetId, created });
  } catch (error) {
    console.error("[industry-preset:apply]", error);
    return NextResponse.json({ error: "Failed to apply preset." }, { status: 500 });
  }
}
