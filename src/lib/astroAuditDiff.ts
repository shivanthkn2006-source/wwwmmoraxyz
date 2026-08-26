/**
 * Audit run history helpers.
 *
 * The dashboard stores one row per "Audit slots" execution (manual or the
 * nightly cron). These helpers flatten a stored run into per-member rows and
 * diff two runs so an operator can see exactly which members/dates changed
 * (computed slot, selected row id, or missing status) between them.
 */

export interface AuditMember {
  user_id: string;
  timezone: string;
  local_time: string;
  target_date: string;
  current_slot: string | null;
  expected_slots: string[];
  present_slots: string[];
  missing_slots: string[];
  missing_morning: boolean;
  rows?: Array<{ id: string; slot: string; status: string }>;
}

export interface AuditRunRow {
  id: string;
  audit_run_id: string;
  correlation_id: string;
  source: string;
  members_count: number;
  missing_morning: number;
  members_with_gaps: number;
  summary: Record<string, unknown> | null;
  members: AuditMember[] | null;
  notifications: Record<string, unknown> | null;
  created_at: string;
}

export interface FlatAuditRow {
  key: string;
  correlation_id: string;
  audit_run_id: string;
  user_id: string;
  timezone: string;
  local_time: string;
  local_date: string;
  computed_slot: string;
  selected_row_id: string;
  selected_row_status: string;
  expected_slots: string;
  present_slots: string;
  missing_slots: string;
  missing_morning: boolean;
}

/** The row the member is actually being served for their computed slot. */
export const selectedRow = (m: AuditMember) =>
  m.rows?.find((r) => r.slot === m.current_slot) ?? m.rows?.[0] ?? null;

/** One flat row per member per selected card — the shape exports and diffs use. */
export function flattenAudit(
  members: AuditMember[],
  meta: { correlation_id: string; audit_run_id: string },
): FlatAuditRow[] {
  return members.map((m) => {
    const sel = selectedRow(m);
    return {
      key: `${m.user_id}__${m.target_date}`,
      correlation_id: meta.correlation_id,
      audit_run_id: meta.audit_run_id,
      user_id: m.user_id,
      timezone: m.timezone,
      local_time: m.local_time,
      local_date: m.target_date,
      computed_slot: m.current_slot ?? '',
      selected_row_id: sel?.id ?? '',
      selected_row_status: sel?.status ?? '',
      expected_slots: m.expected_slots.join('|'),
      present_slots: m.present_slots.join('|'),
      missing_slots: m.missing_slots.join('|'),
      missing_morning: m.missing_morning,
    };
  });
}

export type DiffKind = 'added' | 'removed' | 'changed';

export interface AuditDiffEntry {
  key: string;
  kind: DiffKind;
  user_id: string;
  local_date: string;
  /** field -> [previous, current]; empty for added/removed. */
  changes: Record<string, [string, string]>;
  current?: FlatAuditRow;
  previous?: FlatAuditRow;
}

const TRACKED: Array<keyof FlatAuditRow> = [
  'computed_slot',
  'selected_row_id',
  'selected_row_status',
  'missing_slots',
  'missing_morning',
];

/**
 * Diff two flattened runs, keyed by member + local date. Reports members that
 * appeared, disappeared, or whose computed slot / selected row / missing
 * status changed between the previous and the current run.
 */
export function diffAuditRuns(current: FlatAuditRow[], previous: FlatAuditRow[]): AuditDiffEntry[] {
  const prevMap = new Map(previous.map((r) => [r.key, r]));
  const currMap = new Map(current.map((r) => [r.key, r]));
  const out: AuditDiffEntry[] = [];

  for (const row of current) {
    const before = prevMap.get(row.key);
    if (!before) {
      out.push({ key: row.key, kind: 'added', user_id: row.user_id, local_date: row.local_date, changes: {}, current: row });
      continue;
    }
    const changes: Record<string, [string, string]> = {};
    for (const field of TRACKED) {
      const a = String(before[field] ?? '');
      const b = String(row[field] ?? '');
      if (a !== b) changes[field as string] = [a, b];
    }
    if (Object.keys(changes).length) {
      out.push({ key: row.key, kind: 'changed', user_id: row.user_id, local_date: row.local_date, changes, current: row, previous: before });
    }
  }

  for (const row of previous) {
    if (!currMap.has(row.key)) {
      out.push({ key: row.key, kind: 'removed', user_id: row.user_id, local_date: row.local_date, changes: {}, previous: row });
    }
  }

  return out.sort((a, b) => a.user_id.localeCompare(b.user_id) || a.local_date.localeCompare(b.local_date));
}
