import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('M’Mora profile transparent presentation', () => {
  const page = readFileSync('src/pages/ProfilePage.tsx', 'utf8');
  const home = readFileSync('src/pages/HomePage.tsx', 'utf8');
  const content = readFileSync('src/components/ProfileContent.tsx', 'utf8');
  const editModal = readFileSync('src/components/ProfileEditModal.tsx', 'utf8');
  const css = readFileSync('src/index.css', 'utf8');

  it('scopes the transparent treatment to the main Profile page', () => {
    expect(page).toContain('data-profile-liquid-page');
    expect(page).toContain('data-profile-liquid-content');
    expect(page).toContain('<ProfileContent />');
    expect(content).toContain('data-profile-photo');
    expect(css).toContain(":not([data-profile-photo])");
  });

  it('applies the same treatment to the profile opened from the Home photo', () => {
    expect(home).toContain('<div className="profile-liquid-page">');
    expect(home).toContain('profile-liquid-surface');
    expect(home).toContain('data-profile-liquid-page');
    expect(home).toContain('data-profile-liquid-content');
    expect(home).not.toContain('bg-background/80 backdrop-blur-xl border-l border-border/50');
  });

  it('activates the portal treatment for every member, old or new', () => {
    expect(content).toContain("document.body.classList.add('profile-liquid-active')");
    expect(content).not.toContain("username === 'moksh50' && 'profile-liquid");
    expect(css).toContain('body.profile-liquid-active');
    expect(css).toContain("[role='dialog']");
  });

  it('keeps the Profile white-only and transparent without affecting Music Profile', () => {
    expect(css).toContain('.profile-liquid-page');
    expect(css).toContain('.profile-liquid-surface::after');
    expect(css).toContain('.profile-liquid-surface {\n  position: fixed');
    expect(css).toContain('--profile-ambient-a: 36 26% 46%');
    expect(content).toContain('h-[28rem]');
    expect(content).toContain('data-profile-edit');
    expect(css).toContain('--profile-white: 0 0% 100%');
    expect(css).toContain('background: transparent');
    expect(editModal).toContain('location_enabled: true');
    expect(editModal).toContain('date_of_birth: formData.birth_date || null');
    expect(page).not.toContain('music-liquid-page');
  });
});
