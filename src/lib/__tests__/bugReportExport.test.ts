import { describe, expect, it } from 'vitest';
import { buildBugReportCsv, type ExportableReport } from '../bugReportExport';

const row: ExportableReport = {
  id: 'r1',
  created_at: '2026-09-03T10:00:00.000Z',
  reporter: 'marc',
  route: '/home',
  category: 'bug',
  severity: 'high',
  status: 'open',
  user_message: 'Search "pill" breaks,\nreally',
  admin_note: null,
  autofix_summary: 'Overlay intercepts clicks',
};

describe('buildBugReportCsv', () => {
  it('emits a header row plus one row per report', () => {
    const csv = buildBugReportCsv([row]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('"Reporter"');
  });

  it('escapes quotes and flattens newlines', () => {
    const csv = buildBugReportCsv([row]);
    expect(csv).toContain('""pill""');
    expect(csv.split('\n')).toHaveLength(2);
  });

  it('renders null fields as empty cells', () => {
    const csv = buildBugReportCsv([{ ...row, admin_note: null, route: null }]);
    expect(csv).toContain(',"",');
  });

  it('handles an empty list', () => {
    expect(buildBugReportCsv([]).split('\n')).toHaveLength(1);
  });
});
