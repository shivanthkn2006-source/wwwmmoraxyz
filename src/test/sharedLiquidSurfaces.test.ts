import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const css = read('src/index.css');

describe('shared warm liquid surfaces', () => {
  it('scopes the treatment to Home and each planning tool', () => {
    expect(read('src/pages/HomePage.tsx')).toContain('data-home-liquid-page');
    expect(read('src/components/DayPlannerDiary.tsx')).toContain('data-planning-surface="diary"');
    expect(read('src/components/RemindersManager.tsx')).toContain('data-planning-surface="reminders"');
    expect(read('src/components/CalendarView.tsx')).toContain('data-planning-surface="calendar"');
    expect(css).toContain('.home-liquid-page');
    expect(css).toContain('.planning-liquid-section');
  });

  it('scopes one shared treatment to every admin route and the floating panel', () => {
    const app = read('src/App.tsx');
    expect(app).toContain("pathname.startsWith('/admin')");
    expect(app).toContain("pathname === '/analytics-dashboard'");
    expect(app).toContain('data-admin-liquid-page');
    expect(read('src/components/security/AdminToolbar.tsx')).toContain('admin-liquid-panel');
    expect(css).toContain('.admin-liquid-page');
    expect(css).toContain('.admin-liquid-panel');
  });

  it('preserves media while making chrome white and transparent', () => {
    expect(css).toContain(':not(img):not(video):not(canvas)');
    expect(css).toContain(".home-liquid-page :is(.bg-card, [class*='bg-card/'], [class*='bg-muted'], [class*='bg-background'])");
    expect(css).toContain('backdrop-filter: blur(28px) saturate(120%)');
    expect(css).toContain('color: hsl(var(--liquid-white))');
  });
});