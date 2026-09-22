import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('startup and reconnect stability', () => {
  it('does not run preview cache recovery or Zoe reconnect before first render', () => {
    const main = read('src/main.tsx');
    const beforeRender = main.slice(0, main.indexOf('createRoot('));
    expect(beforeRender).not.toContain('ensurePreviewSessionFreshness()');
    expect(beforeRender).not.toContain('executePlatformPurge()');
    expect(main).not.toContain('reconnectZoeCore()');
  });

  it('uses a bounded auth shell and one refresh owner', () => {
    const auth = read('src/lib/auth.tsx');
    expect(auth).toContain('}, 2500);');
    expect(auth).not.toContain('supabase.auth.startAutoRefresh()');
    expect(auth).not.toContain('10 * 60 * 1000); // Every 10 minutes');
    expect(auth).not.toContain('retryInterval');
  });

  it('shows accurate startup copy and blocks repeated automatic recovery', () => {
    expect(read('src/App.tsx')).toContain("Loading M'Mora");
    expect(read('src/App.tsx')).not.toContain('Zoe is reconnecting');
    expect(read('src/lib/versionCheck.ts')).toContain('blocking another automatic reload');
  });

  it('defers and deduplicates automatic Zoe diagnostics', () => {
    const hook = read('src/hooks/useZoeCoreUnified.ts');
    expect(hook).toContain('scanInFlightRef.current');
    expect(hook).toContain('requestIdleCallback');
    expect(hook).toContain('if (!user || !autoScan) return;');
    expect(read('src/components/core/ZoeCoreUnifiedProvider.tsx')).toContain('useZoeCoreUnified(autoScan)');
    expect(read('src/components/AdaptiveProviderShell.tsx')).toContain('if (!initialized || !providersReady)');
  });

  it('does not initialize Zoe voice or browser speech during app startup', () => {
    const app = read('src/App.tsx');
    expect(app).not.toContain("import('@/utils/zoeVoice')");
    expect(app).not.toContain('speechSynthesis.getVoices()');
  });
});