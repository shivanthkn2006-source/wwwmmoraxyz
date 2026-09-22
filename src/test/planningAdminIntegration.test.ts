import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('live admin and shared planning data', () => {
  it('shows operational admin metrics instead of content placeholders', () => {
    const page = read('src/pages/AdminOverviewPage.tsx');
    for (const table of ['profiles', 'online_sessions', 'user_sessions', 'user_activity_log', 'important_dates', 'reminders']) {
      expect(page).toContain(`'${table}'`);
    }
    expect(page).not.toContain("key: 'dhf_essay_schedules'");
  });

  it('uses important_dates as the shared Planner and Calendar source', () => {
    expect(read('src/components/DayPlannerDiary.tsx')).toContain("from('important_dates')");
    expect(read('src/components/CalendarView.tsx')).toContain("from('important_dates')");
  });

  it('broadcasts reminder and planner edits to Calendar immediately', () => {
    expect(read('src/components/RemindersManager.tsx')).toContain("notifyPlanningChanged('reminders')");
    expect(read('src/components/DayPlannerDiary.tsx')).toContain("notifyPlanningChanged('planner')");
    expect(read('src/components/CalendarView.tsx')).toContain('PLANNING_SYNC_EVENT');
  });
});