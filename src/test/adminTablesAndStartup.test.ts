import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('admin record tables', () => {
  const source = read('src/components/admin/AdminDataTables.tsx');

  it('covers users, sessions, events, planner events and reminders', () => {
    for (const table of ['profiles', 'user_sessions', 'user_activity_log', 'important_dates', 'reminders']) {
      expect(source).toContain(table);
    }
  });

  it('supports text filtering and column sorting', () => {
    expect(source).toContain('toggleSort');
    expect(source).toContain('localeCompare');
    expect(source).toContain('Filter ${spec.label');
  });

  it('is mounted on the admin overview screen', () => {
    expect(read('src/pages/AdminOverviewPage.tsx')).toContain('<AdminDataTables />');
  });
});

describe('startup timing', () => {
  it('records the real phases from the time origin', () => {
    const source = read('src/lib/startupTiming.ts');
    expect(source).toContain('performance.now()');
    expect(source).toContain('getInteractiveDelayMs');
  });

  it('marks session restore, first paint and deferred background systems', () => {
    expect(read('src/lib/auth.tsx')).toContain("markStartupPhase('auth-session-resolved')");
    expect(read('src/App.tsx')).toContain("markStartupPhase('first-route-painted')");
    expect(read('src/components/AdaptiveProviderShell.tsx')).toContain("markStartupPhase('providers-ready')");
  });

  it('shows the measured delay to the administrator', () => {
    expect(read('src/pages/AdminOverviewPage.tsx')).toContain('<StartupTimingPanel />');
  });
});

describe('two-way planning sync', () => {
  it('refreshes reminders from shared planning changes', () => {
    const source = read('src/components/RemindersManager.tsx');
    expect(source).toContain('PLANNING_SYNC_EVENT');
    expect(source).toContain('important_dates');
  });

  it('refreshes the planner from reminder changes', () => {
    const source = read('src/components/DayPlannerDiary.tsx');
    expect(source).toContain("table: 'reminders'");
  });

  it('keeps the calendar on the same shared table', () => {
    expect(read('src/components/CalendarView.tsx')).toContain('important_dates');
  });
});
