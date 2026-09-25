import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

describe('device permissions', () => {
  it('does not mount the legacy platform permission primers', () => {
    const app = read('src/App.tsx');
    expect(app).not.toContain('<PlatformPermissionsInitializer');
    expect(app).not.toContain('<MicPermissionInitializer');
  });

  it('does not reopen microphone hardware when media context mounts', () => {
    const context = read('src/contexts/GlobalMediaContext.tsx');
    const initialization = context.slice(
      context.indexOf('// INITIALIZATION'),
      context.indexOf('// Listen for voice activation events'),
    );
    expect(initialization).not.toContain('getUserMedia');
  });

  it('does not start background listening on the first unrelated page gesture', () => {
    const quickConnect = read('src/components/audio/GlobalAudioQuickConnect.tsx');
    expect(quickConnect).not.toContain("window.addEventListener('pointerdown', onGesture");
    expect(quickConnect).not.toContain("window.addEventListener('keydown', onGesture");
    expect(quickConnect).not.toContain('wasMicGrantedBefore()');
  });

  it('does not reactivate voice merely because an old preference exists', () => {
    const activator = read('src/components/VoiceSystemActivator.tsx');
    const restoredPreference = activator.slice(
      activator.indexOf('if (alreadyActivated)'),
      activator.indexOf('// Ensure auth pages'),
    );
    expect(restoredPreference).not.toContain("dispatchEvent(new CustomEvent('zoe-voice-system-activated'))");
  });

  it('does not request location when Home search mounts', () => {
    const homeTools = read('src/components/home/HomeFloatingTools.tsx');
    expect(homeTools).not.toContain('navigator.geolocation.getCurrentPosition');
  });

  it('does not show the all-device permission request after sign-in', () => {
    const auth = read('src/pages/AuthPage.tsx');
    expect(auth).not.toContain('<PermissionActivationModal');
    expect(auth).not.toContain('setShowPermissionModal');
  });

  it('does not unlock Safari audio from the first unrelated tap', () => {
    const safari = read('src/utils/safariBrowserFixes.ts');
    const compat = read('src/utils/crossBrowserCompat.ts');
    expect(safari).not.toContain("document.addEventListener('touchstart', resumeOnGesture");
    expect(compat).not.toContain("document.addEventListener('touchstart', resumeAudioContext");
  });
});