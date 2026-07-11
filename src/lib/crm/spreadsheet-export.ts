const SPREADSHEET_FORMULA_PREFIX = /^[\u0000-\u0020]*[=+\-@]/;

export function neutralizeSpreadsheetCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return SPREADSHEET_FORMULA_PREFIX.test(text) ? `'${text}` : text;
}

export function sanitizeSpreadsheetValues(values: unknown[][]) {
  return values.map((row) => row.map(neutralizeSpreadsheetCell));
}

function escapeCsvCell(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function buildCsvDocument(values: unknown[][]) {
  const rows = sanitizeSpreadsheetValues(values).map((row) => row.map(escapeCsvCell).join(","));
  return `\uFEFF${rows.join("\r\n")}\r\n`;
}
