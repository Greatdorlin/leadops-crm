import { check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { leads } from './leads';

export const migrationArchives = pgTable(
  "migration_archives",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceSystem: text("source_system").notNull(),
    recordType: text("record_type").notNull(),
    sourceRecordId: text("source_record_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    migratedAt: timestamp("migrated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceRecordUnique: uniqueIndex("migration_archives_source_record_unique").on(
      table.sourceSystem,
      table.recordType,
      table.sourceRecordId,
    ),
    sourceSystemIdx: index("migration_archives_source_system_idx").on(table.sourceSystem),
    migratedAtIdx: index("migration_archives_migrated_at_idx").on(table.migratedAt),
  }),
);

export const dataImports = pgTable(
  "data_imports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceSystem: text("source_system").notNull(),
    sourceFileName: text("source_file_name"),
    sourceFileSha256: text("source_file_sha256"),
    status: text("status").notNull().default("staged"),
    mode: text("mode").notNull().default("validate"),
    fieldMapping: jsonb("field_mapping").$type<Record<string, unknown> | null>(),
    summary: jsonb("summary").$type<Record<string, unknown> | null>(),
    createdBy: text("created_by"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    rolledBackAt: timestamp("rolled_back_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusCreatedIdx: index("data_imports_status_created_idx").on(table.status, table.createdAt),
    sourceCreatedIdx: index("data_imports_source_created_idx").on(table.sourceSystem, table.createdAt),
    createdByIdx: index("data_imports_created_by_idx").on(table.createdBy),
    statusCheck: check(
      "data_imports_status_check",
      sql`${table.status} in ('staged', 'validating', 'validated', 'importing', 'completed', 'completed_with_errors', 'failed', 'rolled_back')`,
    ),
    modeCheck: check(
      "data_imports_mode_check",
      sql`${table.mode} in ('validate', 'commit')`,
    ),
  }),
);

export const dataImportRecords = pgTable(
  "data_import_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    importId: uuid("import_id")
      .notNull()
      .references(() => dataImports.id, { onDelete: "cascade" }),
    rowNumber: integer("row_number").notNull(),
    objectType: text("object_type").notNull().default("lead"),
    sourceRecordId: text("source_record_id"),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    status: text("status").notNull().default("pending"),
    checksum: text("checksum").notNull(),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
    normalizedPayload: jsonb("normalized_payload").$type<Record<string, unknown> | null>(),
    previousLeadSnapshot: jsonb("previous_lead_snapshot").$type<Record<string, unknown> | null>(),
    resultAction: text("result_action"),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    importStatusRowIdx: index("data_import_records_import_status_row_idx").on(
      table.importId,
      table.status,
      table.rowNumber,
    ),
    leadIdIdx: index("data_import_records_lead_id_idx").on(table.leadId),
    sourceRecordIdx: index("data_import_records_source_record_idx").on(
      table.objectType,
      table.sourceRecordId,
    ),
    importSourceRecordUnique: uniqueIndex("data_import_records_import_source_unique")
      .on(table.importId, table.objectType, table.sourceRecordId)
      .where(sql`${table.sourceRecordId} is not null`),
    rowNumberCheck: check("data_import_records_row_number_check", sql`${table.rowNumber} >= 1`),
    statusCheck: check(
      "data_import_records_status_check",
      sql`${table.status} in ('pending', 'valid', 'imported', 'updated', 'failed', 'skipped', 'rolled_back')`,
    ),
  }),
);

export type MigrationArchiveRow = typeof migrationArchives.$inferSelect;

export type DataImportRow = typeof dataImports.$inferSelect;

export type DataImportRecordRow = typeof dataImportRecords.$inferSelect;
