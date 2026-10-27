import { describe, expect, it, vi } from 'vitest';
import { runDeferredInitializers } from '../lib/deferredInitialization';

describe('independent deferred initialization', () => {
  it('starts healthy initializers when a module import rejects', async () => {
    const healthy = vi.fn();
    const report = vi.fn();
    const error = new Error('Failed to fetch dynamically imported module');
    await runDeferredInitializers([
      { name: 'missing chunk', run: () => Promise.reject(error) },
      { name: 'media', run: healthy },
    ], report);
    expect(healthy).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith('missing chunk', error);
  });

  it('isolates synchronous initialization exceptions', async () => {
    const healthy = vi.fn();
    const report = vi.fn();
    await runDeferredInitializers([
      { name: 'compat', run: () => { throw new Error('unsupported'); } },
      { name: 'preloader', run: healthy },
    ], report);
    expect(healthy).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledTimes(1);
  });

  it('waits for asynchronous initialization and contains a broken diagnostic sink', async () => {
    let finish: (() => void) | undefined;
    let completed = false;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    const result = runDeferredInitializers([
      { name: 'voice', run: () => pending },
      { name: 'diagnostic', run: () => { throw new Error('failed'); } },
    ], () => { throw new Error('logger unavailable'); }).then(() => { completed = true; });
    await Promise.resolve();
    expect(completed).toBe(false);
    finish?.();
    await result;
    expect(completed).toBe(true);
  });
});