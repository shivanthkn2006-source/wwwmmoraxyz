import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { humorTrendingScore } from '@/lib/humor';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe("Zoe's LOL integration", () => {
  it('routes every joke picture through the shared ordered cascade', () => {
    const scheduled = read('supabase/functions/generate-humor-drops/index.ts');
    const member = read('supabase/functions/generate-humor-image/index.ts');
    const cascade = read('supabase/functions/_shared/image-cascade.ts');
    for (const src of [scheduled, member]) {
      expect(src).toContain('fetchImageCascade');
      expect(src).not.toContain('image.pollinations.ai');
      expect(src).not.toContain('ai.gateway.lovable.dev');
    }
    expect(cascade).toContain("['pollinations', 'placeholdr', 'horde', 'cloudflare', 'deepai', 'pixazo', 'kaleido', 'justapi', 'imagenow']");
    expect(cascade).toContain('relevance ?? 0) >= 3');
  });

  it('never regenerates a stored joke picture', () => {
    const scheduled = read('supabase/functions/generate-humor-drops/index.ts');
    expect(scheduled).toContain(".is('image_url', null)");
    expect(scheduled).toContain("onConflict");
  });

  it('places Zoe LOL in Global and accepted-friend member jokes in Friends', () => {
    const home = read('src/pages/HomePage.tsx');
    expect(home).toContain("drop.origin === 'member'");
    expect(home).toContain('friendIds.has(drop.author_id)');
    expect(home).toContain('...growthItems, ...humorItems');
    expect(home).toContain('timestamp: drop.scheduled_for');
    expect(home).toContain('humorDrops.length === 0');
    expect(home).toContain('compassSlotTimestamp(post.post_date, post.slot_time, zone)');
  });

  it('refreshes after auth, realtime changes, focus, and member publishing', () => {
    const hook = read('src/hooks/useHumorDrops.ts');
    expect(hook).toContain("table: 'humor_drops'");
    expect(hook).toContain('subscribeRealtime(');
    expect(hook).not.toContain('supabase.channel(');
    expect(hook).toContain("window.addEventListener('focus'");
    expect(hook).toContain("window.addEventListener('mmora:humor-refresh'");
    expect(hook).toContain(".lte('scheduled_for'");
  });

  it('owns automatic speech in one global Deepgram host', () => {
    const app = read('src/App.tsx');
    const host = read('src/components/humor/HumorAnnouncementHost.tsx');
    expect(app).toContain('<HumorAnnouncementHost />');
    expect(host).toContain("claimVoice('narration', { ambient: true })");
    expect(host).toContain('speakWithDeepgram');
    expect(host).toContain('if (ok) remember(drop.id)');
  });

  it('ranks engaged recent jokes above stale unengaged jokes', () => {
    const recent = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const stale = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    expect(humorTrendingScore(5, 0, 3, recent)).toBeGreaterThan(humorTrendingScore(0, 0, 0, stale));
  });

  it('connects category filters, calendar markers, and submissions', () => {
    expect(read('src/pages/ZoeLolPage.tsx')).toContain("mode === 'trending'");
    expect(read('src/pages/DhfCalendarPage.tsx')).toContain('data-calendar-humor');
    expect(read('src/pages/SubmitJokePage.tsx')).toContain("origin: 'member'");
    expect(read('src/App.tsx')).toContain('path="/zoe-lol/submit"');
  });

  it('keeps every card control inside one transparent card with views and follow', () => {
    const card = read('src/components/humor/HumorDropCard.tsx');
    expect(card).toContain('overflow-hidden');
    expect(card).toContain("from('humor_views'");
    expect(card).toContain("from('humor_follows'");
    expect(card).toContain('<time');
    const page = read('src/pages/ZoeLolPage.tsx');
    expect(page).toContain("mode === 'top'");
    expect(page).toContain("mode === 'viewed'");
    expect(page).toContain("mode === 'commented'");
    expect(page).toContain("mode === 'mine'");
    expect(page).toContain('type="date"');
    expect(read('src/components/humor/HumorTrendingSection.tsx')).toContain('Trending jokes');
  });

  it('uses one shared generation for Home and the Zoe LOL page', () => {
    expect(read('src/pages/ZoeLolPage.tsx')).toContain('useHumorDrops');
    expect(read('src/pages/HomePage.tsx')).toContain('useHumorDrops');
    expect(read('src/hooks/useHumorDrops.ts')).not.toContain('functions.invoke');
  });
});
