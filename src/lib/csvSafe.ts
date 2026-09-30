/**
 * Safe spreadsheet cells. Every CSV the app produces goes through here so a
 * member-controlled value (username, report text, audit details) can never be
 * run as a formula when an admin opens the file in Excel / Sheets / Numbers.
 *
 * - RFC 4180 quoting (quotes doubled, value wrapped).
 * - Values starting with = + - @ tab or CR — including after leading spaces —
 *   are prefixed with an apostrophe so spreadsheets treat them as text.
 * - Newlines are flattened so a cell cannot forge extra rows.
 */
const FORMULA_START = /^[\s]*[=+\-@\t\r]/;

export function safeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let text =
    typeof value === 'object' ? JSON.stringify(value) : Array.isArray(value) ? (value as unknown[]).join('; ') : String(value);
  text = text.replace(/\r?\n/g, ' ');
  if (FORMULA_START.test(text) && !/^-?\d+(\.\d+)?$/.test(text.trim())) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function safeCsvRow(values: unknown[]): string {
  return values.map(safeCsvCell).join(',');
}

export function safeCsv(header: string[], rows: unknown[][]): string {
  return [safeCsvRow(header), ...rows.map(safeCsvRow)].join('\n');
}

/** Escapes text for interpolation into HTML documents. */
export function escapeHtmlText(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Only http(s)/blob/data-image URLs may be placed in exported HTML attributes. */
export function safeHtmlUrl(url: unknown): string {
  const s = String(url ?? '').trim();
  if (/^(https?:|blob:|data:image\/)/i.test(s)) return escapeHtmlText(s);
  return '#';
}
