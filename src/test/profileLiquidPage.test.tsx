import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('main Profile transparent presentation', () => {
  const page = readFileSync('src/pages/ProfilePage.tsx', 'utf8');
  const content = readFileSync('src/components/ProfileContent.tsx', 'utf8');
  const css = readFileSync('src/index.css', 'utf8');

  it('scopes the transparent treatment to the main Profile page', () => {
    expect(page).toContain('data-profile-liquid-page');
    expect(page).toContain('data-profile-liquid-content');
    expect(page).toContain('<ProfileContent />');
    expect(page).toContain('<FaithSection />');
    expect(page).toContain('<IdentityVaultSection />');
    expect(page).toContain('<ConversationEmailSection />');
    expect(content).toContain('data-profile-photo');
    expect(css).toContain(":not([data-profile-photo])");
  });

  it('keeps the Profile white-only and transparent without affecting Music Profile', () => {
    expect(css).toContain('.profile-liquid-page');
    expect(css).toContain('--profile-white: 0 0% 100%');
    expect(css).toContain('background: transparent');
    expect(page).not.toContain('music-liquid-page');
  });
});