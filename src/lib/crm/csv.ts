import type { CustomFieldDefinitionWithOptions } from "@/lib/crm/custom-field-values";
import {
  CRM_STATUSES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
} from "@/lib/crm/constants";
import type {
  CrmStatus,
  LeadPriority,
  LeadSource,
} from "@/lib/crm/types";

const headerAliases = {
  firstName: ["firstname", "first", "first_name", "first name", "name"],
  lastName: ["lastname", "last", "last_name", "last name", "surname"],
  fullName: ["fullname", "full name", "contactname", "contact name"],
  email: ["email", "emailaddress", "email address", "mail"],
  whatsappNumber: ["whatsapp", "whatsappnumber", "whatsapp number", "phone", "mobile", "telephone"],
  state: ["state", "leadstate", "lead state", "locationstate", "location state"],
  category: ["category", "lead category", "lead type", "segment"],
  crmStatus: ["crmstatus", "crm status", "status", "stage", "leadstage", "lead stage"],
  priority: ["priority", "leadpriority", "lead priority"],
  assignedTo: ["assignedto", "assigned to", "owner", "leadowner", "lead owner", "assignee"],
  source: ["source", "leadsource", "lead source", "channel"],
  sourceDetail: ["sourcedetail", "source detail", "notes", "note", "details"],
  sourceRecordId: ["record id", "recordid", "contact id", "contactid", "lead id", "leadid", "id"],
  sourceUpdatedAt: ["last modified date", "lastmodifieddate", "modified time", "modifiedtime", "updated at", "updatedat"],
  companyName: ["company", "company name", "companyname", "account name", "accountname", "organization", "organisation"],
  country: ["country", "country region", "countryregion"],
  region: ["region", "state province", "stateprovince", "province"],
  city: ["city", "town"],
  address: ["address", "street", "street address", "streetaddress"],
  postalCode: ["postal code", "postalcode", "zip", "zipcode", "zip code"],
  estimatedValue: ["estimated value", "estimatedvalue", "potential value", "potentialvalue", "amount", "deal amount", "dealamount"],
} as const;

export interface ParsedLeadImportRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  email: string | null;
  whatsappNumber: string | null;
  state: string | null;
  category: string | null;
  stage: CrmStatus;
  priority: LeadPriority;
  assignedTo: string | null;
  source: LeadSource;
  sourceDetail: string | null;
  customFieldValues?: Record<string, unknown>;
  companyName?: string;
  country?: string;
  region?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  estimatedValue?: number;
}

export interface LeadImportAnalysisRow {
  rowNumber: number;
  sourceRecordId: string | null;
  sourceUpdatedAt: string | null;
  rawPayload: Record<string, unknown>;
  parsedRow: ParsedLeadImportRow | null;
  error: string | null;
}

export interface LeadImportAnalysis {
  headers: string[];
  rows: LeadImportAnalysisRow[];
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_\s-]+/g, " ").replace(/[^\w\s]/g, "");
}

function normalizeValue(value: string) {
  return value.trim();
}

function findColumnIndex(headers: string[], aliases: readonly string[]) {
  const normalizedAliases = new Set(aliases.map(normalizeHeader));
  return headers.findIndex((header) => normalizedAliases.has(normalizeHeader(header)));
}

function readColumn(headers: string[], row: string[], aliases: readonly string[]) {
  const index = findColumnIndex(headers, aliases);
  if (index < 0) {
    return "";
  }

  return normalizeValue(row[index] ?? "");
}

function parseEnumValue<const T extends readonly string[]>(rawValue: string, values: T): T[number] | null {
  if (!rawValue) {
    return null;
  }

  const normalized = rawValue.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return values.find((value) => value === normalized) ?? null;
}

function parseImportedStage(rawValue: string): CrmStatus {
  const exact = parseEnumValue(rawValue, CRM_STATUSES);
  if (exact) {
    return exact;
  }

  const normalized = normalizeHeader(rawValue);
  const aliases: Record<string, CrmStatus> = {
    lead: "new",
    subscriber: "new",
    open: "new",
    "attempted to contact": "contacted",
    "in progress": "contacted",
    "marketing qualified lead": "qualified",
    "sales qualified lead": "qualified",
    opportunity: "qualified",
    proposal: "application_started",
    customer: "converted",
    "closed won": "converted",
    won: "converted",
    "closed lost": "lost",
    disqualified: "unqualified",
  };
  return aliases[normalized] ?? "new";
}

function parseImportedNumber(rawValue: string) {
  if (!rawValue.trim()) {
    return null;
  }

  const normalized = rawValue.replace(/[^0-9.-]+/g, "");
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function splitFullName(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return { firstName: "", lastName: "" };
  }

  const [firstName, ...rest] = normalized.split(/\s+/);
  return {
    firstName: firstName ?? "",
    lastName: rest.join(" "),
  };
}

function inferFirstName(input: { firstName: string; email: string | null; whatsappNumber: string | null }) {
  if (input.firstName) {
    return input.firstName;
  }

  if (input.email) {
    const [localPart] = input.email.split("@");
    if (localPart) {
      return localPart.replace(/[._-]+/g, " ").trim() || "Lead";
    }
  }

  if (input.whatsappNumber) {
    return "Lead";
  }

  return "";
}

export function resolveCustomFieldHeaderMatch(
  header: string,
  customFieldDefinitions: CustomFieldDefinitionWithOptions[],
) {
  const normalizedHeader = normalizeHeader(header);

  return (
    customFieldDefinitions.find((field) => normalizeHeader(field.label) === normalizedHeader) ??
    customFieldDefinitions.find((field) => normalizeHeader(field.key) === normalizedHeader) ??
    null
  );
}

export function mapCsvRowToCustomFieldValues(
  headers: string[],
  row: string[],
  customFieldDefinitions: CustomFieldDefinitionWithOptions[],
) {
  const values: Record<string, unknown> = {};

  headers.forEach((header, index) => {
    const matchedField = resolveCustomFieldHeaderMatch(header, customFieldDefinitions);
    if (!matchedField) {
      return;
    }

    const value = normalizeValue(row[index] ?? "");
    if (!value) {
      return;
    }

    values[matchedField.id] = value;
  });

  return values;
}

export function parseCsvText(csvText: string) {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];
    const nextCharacter = csvText[index + 1];

    if (character === "\"") {
      if (inQuotes && nextCharacter === "\"") {
        currentCell += "\"";
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      if (currentRow.some((value) => value.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentCell = "";
      currentRow = [];
      continue;
    }

    currentCell += character;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    if (currentRow.some((value) => value.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

type LeadImportCsvOptions = {
  customFieldDefinitions?: CustomFieldDefinitionWithOptions[];
};

function parseLeadImportRow(
  headers: string[],
  row: string[],
  rowNumber: number,
  options: LeadImportCsvOptions,
) {
  const email = readColumn(headers, row, headerAliases.email) || null;
  const whatsappNumber = readColumn(headers, row, headerAliases.whatsappNumber) || null;
  const firstNameValue = readColumn(headers, row, headerAliases.firstName);
  const lastNameValue = readColumn(headers, row, headerAliases.lastName);
  const fullNameValue = readColumn(headers, row, headerAliases.fullName);
  const fullName = fullNameValue ? splitFullName(fullNameValue) : null;
  const firstName = inferFirstName({
    firstName: firstNameValue || fullName?.firstName || "",
    email,
    whatsappNumber,
  });
  const lastName = lastNameValue || fullName?.lastName || "";

  if (!email && !whatsappNumber) {
    throw new Error(`Row ${rowNumber} needs an email or WhatsApp number.`);
  }

  const priority = parseEnumValue(readColumn(headers, row, headerAliases.priority), LEAD_PRIORITIES) ?? "medium";
  const category = readColumn(headers, row, headerAliases.category) || null;
  const source = parseEnumValue(readColumn(headers, row, headerAliases.source), LEAD_SOURCES) ?? "manual_entry";
  const customFieldValues =
    options.customFieldDefinitions && options.customFieldDefinitions.length > 0
      ? mapCsvRowToCustomFieldValues(headers, row, options.customFieldDefinitions)
      : undefined;
  const optionalText = {
    companyName: readColumn(headers, row, headerAliases.companyName),
    country: readColumn(headers, row, headerAliases.country),
    region: readColumn(headers, row, headerAliases.region),
    city: readColumn(headers, row, headerAliases.city),
    address: readColumn(headers, row, headerAliases.address),
    postalCode: readColumn(headers, row, headerAliases.postalCode),
  };
  const estimatedValue = parseImportedNumber(readColumn(headers, row, headerAliases.estimatedValue));

  return {
    rowNumber,
    firstName: firstName || "Lead",
    lastName,
    email,
    whatsappNumber,
    state: readColumn(headers, row, headerAliases.state) || optionalText.region || null,
    category,
    stage: parseImportedStage(readColumn(headers, row, headerAliases.crmStatus)),
    priority,
    assignedTo: readColumn(headers, row, headerAliases.assignedTo) || null,
    source,
    sourceDetail: readColumn(headers, row, headerAliases.sourceDetail) || null,
    ...(customFieldValues && Object.keys(customFieldValues).length > 0
      ? { customFieldValues }
      : {}),
    ...Object.fromEntries(
      Object.entries(optionalText).filter(([, value]) => value.length > 0),
    ),
    ...(estimatedValue === null ? {} : { estimatedValue }),
  } as ParsedLeadImportRow;
}

export function analyzeLeadImportCsv(
  csvText: string,
  options: LeadImportCsvOptions = {},
): LeadImportAnalysis {
  const rows = parseCsvText(csvText);
  if (rows.length < 2) {
    throw new Error("Add a header row and at least one lead row before importing.");
  }

  const [headers, ...dataRows] = rows;
  return {
    headers,
    rows: dataRows.map((row, index) => {
    const rowNumber = index + 2;
      const sourceRecordId = readColumn(headers, row, headerAliases.sourceRecordId) || null;
      const sourceUpdatedRaw = readColumn(headers, row, headerAliases.sourceUpdatedAt);
      const sourceUpdatedDate = sourceUpdatedRaw ? new Date(sourceUpdatedRaw) : null;
      const sourceUpdatedAt = sourceUpdatedDate && Number.isFinite(sourceUpdatedDate.getTime())
        ? sourceUpdatedDate.toISOString()
        : null;
      const rawPayload = {
        headers: [...headers],
        values: [...row],
      };

      try {
        return {
          rowNumber,
          sourceRecordId,
          sourceUpdatedAt,
          rawPayload,
          parsedRow: parseLeadImportRow(headers, row, rowNumber, options),
          error: null,
        };
      } catch (error) {
        return {
          rowNumber,
          sourceRecordId,
          sourceUpdatedAt,
          rawPayload,
          parsedRow: null,
          error: error instanceof Error ? error.message : `Row ${rowNumber} could not be parsed.`,
        };
      }
    }),
  };
}

export function parseLeadImportCsv(
  csvText: string,
  options: LeadImportCsvOptions = {},
) {
  const analysis = analyzeLeadImportCsv(csvText, options);
  const firstError = analysis.rows.find((row) => row.error)?.error;
  if (firstError) {
    throw new Error(firstError);
  }

  return analysis.rows.flatMap((row) => (row.parsedRow ? [row.parsedRow] : []));
}
