/**
 * BUG REPORT EXPORTS
 *
 * Pure helpers that turn admin inbox rows into shareable artefacts:
 * a CSV file for spreadsheets and a paginated PDF for offline records.
 */

export interface ExportableReport {
  id: string;
  created_at: string;
  reporter: string;
  route: string | null;
  category: string | null;
  severity: string | null;
  status: string | null;
  user_message: string | null;
  admin_note: string | null;
  autofix_summary?: string | null;
}

const COLUMNS: Array<[keyof ExportableReport, string]> = [
  ['id', 'ID'],
  ['created_at', 'Filed at'],
  ['reporter', 'Reporter'],
  ['route', 'Page'],
  ['category', 'Category'],
  ['severity', 'Severity'],
  ['status', 'Status'],
  ['user_message', 'Report'],
  ['admin_note', 'Admin note'],
  ['autofix_summary', 'Auto-triage summary'],
];

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
}

/** RFC4180-ish CSV, header row first. */
export function buildBugReportCsv(rows: ExportableReport[]): string {
  const header = COLUMNS.map(([, label]) => csvCell(label)).join(',');
  const body = rows.map((row) => COLUMNS.map(([key]) => csvCell(row[key])).join(','));
  return [header, ...body].join('\n');
}

export function downloadBlob(content: BlobPart, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportBugReportsCsv(rows: ExportableReport[], filename = 'bug-reports.csv'): void {
  downloadBlob(buildBugReportCsv(rows), filename, 'text/csv;charset=utf-8;');
}

/** jsPDF is loaded lazily so the admin bundle stays small. */
export async function exportBugReportsPdf(
  rows: ExportableReport[],
  filename = 'bug-reports.pdf',
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  const bottom = doc.internal.pageSize.getHeight() - margin;
  let y = margin;

  const line = (text: string, size = 10, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    for (const chunk of doc.splitTextToSize(text, width) as string[]) {
      if (y > bottom) {
        doc.addPage();
        y = margin;
      }
      doc.text(chunk, margin, y);
      y += size + 4;
    }
  };

  line('M\u2019Mora — Bug report export', 16, true);
  line(`Generated ${new Date().toLocaleString()} · ${rows.length} report(s)`, 9);
  y += 8;

  rows.forEach((row, index) => {
    y += 6;
    line(
      `${index + 1}. [${(row.status ?? 'open').replace('_', ' ')}] ${row.category ?? 'bug'} · ${row.severity ?? 'normal'}`,
      11,
      true,
    );
    line(`Filed ${new Date(row.created_at).toLocaleString()} by ${row.reporter} · ${row.route ?? 'unknown page'}`, 9);
    line(row.user_message || '(no description)', 10);
    if (row.admin_note) line(`Admin note: ${row.admin_note}`, 9);
    if (row.autofix_summary) line(`Auto-triage: ${row.autofix_summary}`, 9);
  });

  doc.save(filename);
}
