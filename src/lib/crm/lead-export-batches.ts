import { encodeLeadCursor } from "@/lib/crm/lead-pagination";
import type { LeadStorage, LeadListFilters } from "@/lib/storage/types";

export const MAX_SYNCHRONOUS_EXPORT_ROWS = 5_000;
const EXPORT_BATCH_SIZE = 200;

type LeadExportReader = Pick<LeadStorage, "countLeads" | "list">;

export class LeadExportLimitError extends Error {
  constructor(
    public readonly rowCount: number,
    public readonly maxRows: number,
  ) {
    super(`This view has ${rowCount.toLocaleString()} leads. Narrow the filters to ${maxRows.toLocaleString()} or fewer before exporting.`);
    this.name = "LeadExportLimitError";
  }
}

export async function listLeadsForSynchronousExport(
  reader: LeadExportReader,
  filters: LeadListFilters,
  maxRows = MAX_SYNCHRONOUS_EXPORT_ROWS,
) {
  const rowCount = await reader.countLeads(filters);
  if (rowCount > maxRows) {
    throw new LeadExportLimitError(rowCount, maxRows);
  }

  const result: Awaited<ReturnType<LeadExportReader["list"]>> = [];
  let cursor: string | undefined;

  while (result.length < rowCount) {
    const batch = await reader.list({
      ...filters,
      limit: EXPORT_BATCH_SIZE,
      offset: undefined,
      cursor,
      cursorDirection: "next",
    });

    if (batch.length === 0) {
      break;
    }

    result.push(...batch);
    const lastLead = batch.at(-1);
    if (!lastLead || batch.length < EXPORT_BATCH_SIZE) {
      break;
    }

    cursor = encodeLeadCursor({ id: lastLead.id, updatedAt: lastLead.updatedAt });
  }

  return result.slice(0, maxRows);
}
