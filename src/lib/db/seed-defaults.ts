import { getDb } from "@/lib/db/client";
import {
  customFields,
  leadSources,
  leadStages,
  type CustomFieldRow,
  type LeadSourceRow,
  type LeadStageRow,
} from "@/lib/db/schema";
import {
  DEFAULT_LEADS_DESK_SOURCE_ROWS,
  DEFAULT_LEADS_DESK_STAGE_ROWS,
  RECOMMENDED_GENERAL_CUSTOM_FIELDS,
} from "@/lib/db/defaults";

export interface LeadsDeskSeedOptions {
  includeStages?: boolean;
  includeSources?: boolean;
  includeRecommendedCustomFields?: boolean;
}

export interface LeadsDeskSeedPayload {
  stages: Array<typeof leadStages.$inferInsert>;
  sources: Array<typeof leadSources.$inferInsert>;
  customFields: Array<typeof customFields.$inferInsert>;
}

export interface SeedRunSummary {
  insertedCount: number;
  insertedKeys: string[];
}

export interface LeadsDeskSeedResult {
  stages: SeedRunSummary;
  sources: SeedRunSummary;
  customFields: SeedRunSummary;
}

function buildStageSeedRows(): LeadsDeskSeedPayload["stages"] {
  return DEFAULT_LEADS_DESK_STAGE_ROWS.map((stage) => ({
    key: stage.key,
    name: stage.name,
    color: stage.color,
    sortOrder: stage.sortOrder,
    isWon: stage.isWon,
    isLost: stage.isLost,
    archived: false,
  }));
}

function buildSourceSeedRows(): LeadsDeskSeedPayload["sources"] {
  return DEFAULT_LEADS_DESK_SOURCE_ROWS.map((source) => ({
    key: source.key,
    name: source.name,
    type: source.type,
    color: source.color,
    archived: false,
  }));
}

function buildRecommendedCustomFieldRows(): LeadsDeskSeedPayload["customFields"] {
  return RECOMMENDED_GENERAL_CUSTOM_FIELDS.map((field, index) => ({
    key: field.key,
    label: field.label,
    type: field.type,
    required: false,
    archived: false,
    showInTable: false,
    showInForm: true,
    showInDetails: true,
    searchable: false,
    filterable: field.key === "urgency" || field.key === "location",
    sortOrder: index,
  }));
}

export function buildLeadsDeskDefaultSeedPayload(): LeadsDeskSeedPayload {
  return {
    stages: buildStageSeedRows(),
    sources: buildSourceSeedRows(),
    customFields: buildRecommendedCustomFieldRows(),
  };
}

export async function seedLeadsDeskDefaults(
  options: LeadsDeskSeedOptions = {},
  db = getDb(),
): Promise<LeadsDeskSeedResult> {
  const {
    includeStages = true,
    includeSources = true,
    includeRecommendedCustomFields = false,
  } = options;

  const result: LeadsDeskSeedResult = {
    stages: { insertedCount: 0, insertedKeys: [] },
    sources: { insertedCount: 0, insertedKeys: [] },
    customFields: { insertedCount: 0, insertedKeys: [] },
  };

  if (includeStages) {
    const inserted = await db
      .insert(leadStages)
      .values(buildStageSeedRows())
      .onConflictDoNothing({ target: leadStages.key })
      .returning({ key: leadStages.key });

    result.stages = {
      insertedCount: inserted.length,
      insertedKeys: inserted.map((row) => row.key),
    };
  }

  if (includeSources) {
    const inserted = await db
      .insert(leadSources)
      .values(buildSourceSeedRows())
      .onConflictDoNothing({ target: leadSources.key })
      .returning({ key: leadSources.key });

    result.sources = {
      insertedCount: inserted.length,
      insertedKeys: inserted.map((row) => row.key),
    };
  }

  if (includeRecommendedCustomFields) {
    const inserted = await db
      .insert(customFields)
      .values(buildRecommendedCustomFieldRows())
      .onConflictDoNothing({ target: customFields.key })
      .returning({ key: customFields.key });

    result.customFields = {
      insertedCount: inserted.length,
      insertedKeys: inserted.map((row) => row.key),
    };
  }

  return result;
}

export type SeededLeadStage = LeadStageRow;
export type SeededLeadSource = LeadSourceRow;
export type SeededCustomField = CustomFieldRow;
