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
    expect(auth).toContain('}, 1500);');
    expect(auth).not.toContain('supabase.auth.startAutoRefresh()');
    expect(auth).not.toContain('10 * 60 * 1000); // Every 10 minutes');
    expect(auth).not.toContain('retryInterval');
  });

  it('shows accurate startup copy and disables automatic failure reloads', () => {
    expect(read('src/App.tsx')).toContain("Loading M'Mora");
    expect(read('src/App.tsx')).not.toContain('Zoe is reconnecting');
    expect(read('src/main.tsx')).not.toContain('then(({ recoverFromChunkError })');
    expect(read('src/components/core/ErrorBoundary.tsx')).not.toContain('recoverFromChunkError');
    expect(read('src/components/SystemFailureBoundary.tsx')).not.toContain('recoverFromChunkError');
    expect(read('src/App.tsx')).not.toContain('recoverFromChunkError');
  });

  it('defers and deduplicates automatic Zoe diagnostics', () => {
    const hook = read('src/hooks/useZoeCoreUnified.ts');
    const shell = read('src/components/AdaptiveProviderShell.tsx');
    expect(hook).toContain('scanInFlightRef.current');
    expect(hook).toContain('requestIdleCallback');
    expect(hook).toContain('if (!user || !autoScan) return;');
    expect(read('src/components/core/ZoeCoreUnifiedProvider.tsx')).toContain('useZoeCoreUnified(autoScan)');
    expect(shell).toContain('{children}');
    expect(shell).toContain('mountDeferredProviders &&');
    expect(shell).not.toContain('if (!initialized || !providersReady)');
  });

  it('does not initialize Zoe voice or browser speech during app startup', () => {
    const app = read('src/App.tsx');
    expect(app).not.toContain("import('@/utils/zoeVoice')");
    expect(app).not.toContain('speechSynthesis.getVoices()');
  });

  it('keeps retired Google vision models out of the sovereign fallback chain', () => {
    expect(read('supabase/functions/_shared/sovereign-ai.ts')).not.toContain("'gemini-2.0-flash'");
  });
});