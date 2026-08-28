// Throttling, debouncing and route-safe cancellation for the persistent
// voice command service, plus the Zustand store contract.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/enterpriseTelemetry', () => ({
  reportPlatformError: vi.fn(),
  flushPlatformErrors: vi.fn(),
}));

const { VoiceCommandService } = await import('@/services/voiceCommandService');
const { usePlatformStore } = await import('@/store/usePlatformStore');

describe('VoiceCommandService', () => {
  let route = '/home';

  const makeService = () =>
    new VoiceCommandService({ throttleMs: 1000, debounceMs: 0, getRoute: () => route });

  beforeEach(() => {
    route = '/home';
    usePlatformStore.setState({ voiceStatus: 'idle', lastCommand: null, voiceCommandActive: false });
  });

  it('dispatches a matching command and records it in the store', async () => {
    const service = makeService();
    const run = vi.fn();
    service.register({ id: 'shot', match: /take my picture/, run });

    expect(await service.dispatch('Zoe take my picture')).toBe('dispatched');
    expect(run).toHaveBeenCalledTimes(1);
    expect(usePlatformStore.getState().lastCommand).toBe('zoe take my picture');
  });

  it('ignores unmatched transcripts without touching the store', async () => {
    const service = makeService();
    service.register({ id: 'shot', match: /take my picture/, run: vi.fn() });

    expect(await service.dispatch('what is the weather')).toBe('no-match');
    expect(usePlatformStore.getState().lastCommand).toBeNull();
  });

  it('throttles rapid repeats from a chatty recognizer', async () => {
    const service = makeService();
    const run = vi.fn();
    service.register({ id: 'shot', match: /picture/, run });

    expect(await service.dispatch('take a picture')).toBe('dispatched');
    expect(await service.dispatch('take a picture')).toBe('throttled');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('scopes commands to their allowed routes', async () => {
    const service = makeService();
    const run = vi.fn();
    service.register({ id: 'vr', match: /enter world/, routes: ['/zoe-omega'], run });

    expect(await service.dispatch('enter world')).toBe('no-match');
    route = '/zoe-omega/world';
    expect(await service.dispatch('enter world')).toBe('dispatched');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('aborts in-flight command work when the route changes', async () => {
    const service = makeService();
    let aborted = false;
    service.register({
      id: 'slow',
      match: /post it/,
      run: ({ signal }) =>
        new Promise<void>((resolve) => {
          signal.addEventListener('abort', () => {
            aborted = true;
            resolve();
          });
        }),
    });

    const pending = service.dispatch('post it on my timeline');
    await Promise.resolve();
    service.handleRouteChange();
    await pending;

    expect(aborted).toBe(true);
  });

  it('unregistering a command stops it from firing', async () => {
    const service = makeService();
    const run = vi.fn();
    const off = service.register({ id: 'temp', match: /ping/, run });
    off();

    expect(await service.dispatch('ping')).toBe('no-match');
    expect(run).not.toHaveBeenCalled();
  });

  it('reports an error status when speech recognition is unsupported', () => {
    const service = makeService();
    expect(service.start()).toBe(false);
    expect(usePlatformStore.getState().voiceStatus).toBe('error');
    expect(service.isRunning).toBe(false);
  });
});
