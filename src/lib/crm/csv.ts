import {
  CRM_STATUSES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  PRIMARY_GOALS,
  type CrmStatus,
  type LeadPriority,
  type LeadSource,
  type PrimaryGoal,
} from "@/lib/pathway-engine/types";

const headerAliases = {
  firstName: ["firstname", "first", "first_name", "first name", "name"],
  lastName: ["lastname", "last", "last_name", "last name", "surname"],
  fullName: ["fullname", "full name", "contactname", "contact name"],
  email: ["email", "emailaddress", "email address", "mail"],
  whatsappNumber: ["whatsapp", "whatsappnumber", "whatsapp number", "phone", "mobile", "telephone"],
  state: ["state", "leadstate", "lead state", "locationstate", "location state"],
  primaryGoal: ["primarygoal", "primary goal", "goal"],
  crmStatus: ["crmstatus", "crm status", "status", "stage", "leadstage", "lead stage"],
  priority: ["priority", "leadpriority", "lead priority"],
  assignedTo: ["assignedto", "assigned to", "owner", "leadowner", "lead owner", "assignee"],
  source: ["source", "leadsource", "lead source", "channel"],
  sourceDetail: ["sourcedetail", "source detail", "notes", "note", "details"],
} as const;

export interface ParsedLeadImportRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  email: string | null;
  whatsappNumber: string | null;
  state: string | null;
  primaryGoal: PrimaryGoal | null;
  crmStatus: CrmStatus;
  priority: LeadPriority;
  assignedTo: string | null;
  source: LeadSource;
  sourceDetail: string | null;
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

export function parseLeadImportCsv(csvText: string) {
  const rows = parseCsvText(csvText);
  if (rows.length < 2) {
    throw new Error("Add a header row and at least one lead row before importing.");
  }

  const [headers, ...dataRows] = rows;
  const parsedRows: ParsedLeadImportRow[] = [];

  for (const [index, row] of dataRows.entries()) {
    const rowNumber = index + 2;
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

    const crmStatus = parseEnumValue(readColumn(headers, row, headerAliases.crmStatus), CRM_STATUSES) ?? "new";
    const priority = parseEnumValue(readColumn(headers, row, headerAliases.priority), LEAD_PRIORITIES) ?? "medium";
    const primaryGoal =
      parseEnumValue(readColumn(headers, row, headerAliases.primaryGoal), PRIMARY_GOALS) ?? null;
    const source = parseEnumValue(readColumn(headers, row, headerAliases.source), LEAD_SOURCES) ?? "manual_entry";

    parsedRows.push({
      rowNumber,
      firstName: firstName || "Lead",
      lastName,
      email,
      whatsappNumber,
      state: readColumn(headers, row, headerAliases.state) || null,
      primaryGoal,
      crmStatus,
      priority,
      assignedTo: readColumn(headers, row, headerAliases.assignedTo) || null,
      source,
      sourceDetail: readColumn(headers, row, headerAliases.sourceDetail) || null,
    });
  }

  return parsedRows;
}
