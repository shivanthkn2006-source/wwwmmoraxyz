import { describe, it, expect } from 'vitest';
import { flattenAudit, diffAuditRuns, type AuditMember } from '@/lib/astroAuditDiff';

const member = (over: Partial<AuditMember> = {}): AuditMember => ({
  user_id: 'u1',
  timezone: 'Asia/Kolkata',
  local_time: '07:10',
  target_date: '2026-08-26',
  current_slot: 'morning',
  expected_slots: ['morning'],
  present_slots: ['morning'],
  missing_slots: [],
  missing_morning: false,
  rows: [{ id: 'row-a', slot: 'morning', status: 'published' }],
  ...over,
});

const flat = (members: AuditMember[], id: string) =>
  flattenAudit(members, { correlation_id: `c_${id}`, audit_run_id: id });

describe('audit diff', () => {
  it('reports nothing when both runs match', () => {
    expect(diffAuditRuns(flat([member()], 'b'), flat([member()], 'a'))).toEqual([]);
  });

  it('detects a changed computed slot and selected row id', () => {
    const prev = flat([member()], 'a');
    const curr = flat([member({ current_slot: 'noon', expected_slots: ['morning', 'noon'], present_slots: ['morning', 'noon'], rows: [{ id: 'row-b', slot: 'noon', status: 'published' }] })], 'b');
    const [d] = diffAuditRuns(curr, prev);
    expect(d.kind).toBe('changed');
    expect(d.changes.computed_slot).toEqual(['morning', 'noon']);
    expect(d.changes.selected_row_id).toEqual(['row-a', 'row-b']);
  });

  it('detects a member falling into missing-morning', () => {
    const prev = flat([member()], 'a');
    const curr = flat([member({ present_slots: [], missing_slots: ['morning'], missing_morning: true, rows: [] })], 'b');
    const [d] = diffAuditRuns(curr, prev);
    expect(d.changes.missing_morning).toEqual(['false', 'true']);
    expect(d.changes.missing_slots).toEqual(['', 'morning']);
  });

  it('flags added and removed members', () => {
    const prev = flat([member({ user_id: 'u-old' })], 'a');
    const curr = flat([member({ user_id: 'u-new' })], 'b');
    const kinds = diffAuditRuns(curr, prev).map((d) => d.kind).sort();
    expect(kinds).toEqual(['added', 'removed']);
  });

  it('keys rows by member and local date so a date rollover is a new entry', () => {
    const prev = flat([member()], 'a');
    const curr = flat([member({ target_date: '2026-08-27' })], 'b');
    expect(diffAuditRuns(curr, prev).map((d) => d.kind).sort()).toEqual(['added', 'removed']);
  });
});
