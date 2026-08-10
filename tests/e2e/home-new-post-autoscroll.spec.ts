import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

type Feed = 'global' | 'personal';

interface TestSession {
  access_token: string;
  user: { id: string };
}

const getTestSession = (): { session: TestSession; apiUrl: string } | null => {
  const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
  const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  if (!storageKey || !sessionJson) return null;

  const projectRef = storageKey.match(/^sb-(.+)-auth-token$/)?.[1];
  if (!projectRef) return null;

  const session = JSON.parse(sessionJson) as TestSession;
  if (!session.access_token || !session.user?.id) return null;
  return { session, apiUrl: `https://${projectRef}.supabase.co/rest/v1/posts` };
};

const restoreSession = async (page: Page) => {
  const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
  const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  if (!storageKey || !sessionJson) return false;
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: storageKey, value: sessionJson });
  return true;
};

test.describe('rendered new-post badge and manual scroll controls', () => {
  test('shows and scrolls to realtime posts in global and friends feeds', async ({ page, request }) => {
    test.setTimeout(120_000);
    const credentials = getTestSession();
    test.skip(!credentials, 'An injected authenticated preview session is required');
    if (!credentials) return;

    await restoreSession(page);
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      Object.keys(localStorage)
        .filter((key) => key.startsWith('mmora.home.seenPosts.') || key.startsWith('mmora.home.unseenPosts.'))
        .forEach((key) => localStorage.removeItem(key));
      (window as Window & { __newPostScrollTarget?: string }).__newPostScrollTarget = '';
      HTMLElement.prototype.scrollIntoView = function scrollIntoView() {
        (window as Window & { __newPostScrollTarget?: string }).__newPostScrollTarget = this.dataset.postId ?? '';
      };
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-feed-tab="global"]')).toBeVisible({ timeout: 30_000 });

    // Realtime is deliberately deferred on the homepage; wait until its subscription is ready.
    await page.waitForTimeout(3_500);

    const createdIds: string[] = [];
    try {
      for (const feed of ['global', 'personal'] as const) {
        const id = randomUUID();
        createdIds.push(id);
        const response = await request.post(credentials.apiUrl, {
          headers: {
            apikey: credentials.session.access_token,
            Authorization: `Bearer ${credentials.session.access_token}`,
            Prefer: 'return=minimal',
          },
          data: {
            id,
            user_id: credentials.session.user.id,
            visibility: feed,
            content: `New badge E2E ${feed} ${id}`,
          },
        });
        expect(response.ok(), `Could not create ${feed} test post`).toBeTruthy();

        await page.evaluate((nextFeed) => {
          window.dispatchEvent(new CustomEvent('feed-switch', { detail: nextFeed }));
        }, feed);

        const feedRoot = page.locator(`[data-feed-tab="${feed}"]`);
        const newPost = feedRoot.locator(`[data-post-id="${id}"]`);
        await expect(newPost).toHaveAttribute('data-new', 'true', { timeout: 30_000 });
        await expect(newPost.getByTestId('new-content-badge')).toHaveText('New');

        const indicator = feedRoot.getByTestId('new-posts-indicator');
        await expect(indicator).toContainText('New posts available');
        await indicator.getByRole('button', { name: 'Scroll to new posts' }).click();
        await expect.poll(() => page.evaluate(() => (
          window as Window & { __newPostScrollTarget?: string }
        ).__newPostScrollTarget)).toBe(id);
      }
    } finally {
      for (const id of createdIds) {
        await request.delete(`${credentials.apiUrl}?id=eq.${id}`, {
          headers: {
            apikey: credentials.session.access_token,
            Authorization: `Bearer ${credentials.session.access_token}`,
          },
        });
      }
    }
  });
});