/**
 * Admin gate: /admin/health must be reachable only to root admins.
 * Non-admin (or signed-out) users must be redirected off the page.
 */
import { test, expect } from '@playwright/test';

test('non-authenticated user is redirected away from /admin/health', async ({ page }) => {
  await page.goto('/admin/health', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Either we get bounced to /auth by ProtectedRoute, or the page never
  // renders the "Health & Status" admin heading.
  const url = page.url();
  const heading = await page.getByRole('heading', { name: 'Health & Status' }).count();

  const bouncedOff = !url.includes('/admin/health') || heading === 0;
  expect(bouncedOff, `Non-admin should not see the admin health page. url=${url} heading=${heading}`).toBe(true);
});
