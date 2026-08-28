// Plug-in agent registry: lazy loading, route scoping, failure isolation and
// the guarantee that no agent can read or mutate another agent's state.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/enterpriseTelemetry', () => ({
  reportPlatformError: vi.fn(),
  flushPlatformErrors: vi.fn(),
}));

const registry = await import('@/core/agents/agentRegistry');
const { usePlatformStore } = await import('@/store/usePlatformStore');

describe('agentRegistry', () => {
  beforeEach(() => {
    registry.__resetAgentRegistry();
    usePlatformStore.setState({ activeAgent: null, degradedAgents: {}, thermalSafeMode: false });
  });

  it('does not evaluate an agent module until it is requested', async () => {
    const load = vi.fn(async () => ({ activate: vi.fn() }));
    registry.registerAgent({ id: 'a1', label: 'A1', load });

    expect(load).not.toHaveBeenCalled();
    expect(registry.isLoaded('a1')).toBe(false);

    await registry.loadAgent('a1');
    expect(load).toHaveBeenCalledTimes(1);
    expect(registry.isLoaded('a1')).toBe(true);
  });

  it('shares one in-flight import across concurrent callers', async () => {
    const load = vi.fn(async () => ({}));
    registry.registerAgent({ id: 'a2', label: 'A2', load });

    await Promise.all([registry.loadAgent('a2'), registry.loadAgent('a2'), registry.loadAgent('a2')]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('gives every agent an isolated sandbox — no cross-agent coupling', async () => {
    const seen: Record<string, unknown> = {};
    registry.registerAgent({
      id: 'writer',
      label: 'Writer',
      load: async () => ({
        activate: (sandbox) => sandbox.set('secret', 'writer-only'),
      }),
    });
    registry.registerAgent({
      id: 'reader',
      label: 'Reader',
      load: async () => ({
        activate: (sandbox) => {
          seen.readerView = sandbox.get('secret');
          seen.readerId = sandbox.agentId;
        },
      }),
    });

    const writer = await registry.loadAgent('writer');
    const reader = await registry.loadAgent('reader');

    expect(writer?.sandbox.get('secret')).toBe('writer-only');
    expect(seen.readerView).toBeUndefined();
    expect(seen.readerId).toBe('reader');
    expect(reader?.sandbox).not.toBe(writer?.sandbox);
  });

  it('isolates a failing agent instead of throwing into the caller', async () => {
    registry.registerAgent({
      id: 'broken',
      label: 'Broken',
      load: async () => {
        throw new Error('chunk load failed');
      },
    });

    const result = await registry.loadAgent('broken');
    expect(result).toBeNull();
    expect(usePlatformStore.getState().degradedAgents.broken).toContain('chunk load failed');
  });

  it('refuses to activate an agent outside its allowed routes', async () => {
    registry.registerAgent({ id: 'vr', label: 'VR', routes: ['/zoe-omega'], load: async () => ({}) });

    expect(await registry.activateAgent('vr', '/home')).toBe(false);
    expect(registry.isLoaded('vr')).toBe(false);
    expect(await registry.activateAgent('vr', '/zoe-omega/world')).toBe(true);
    expect(usePlatformStore.getState().activeAgent).toBe('vr');
  });

  it('blocks heavy agents while thermal-safe mode is on', async () => {
    registry.registerAgent({ id: 'heavy', label: 'Heavy', heavy: true, load: async () => ({}) });
    usePlatformStore.getState().setThermalSafeMode(true);

    expect(await registry.activateAgent('heavy', '/home')).toBe(false);
    usePlatformStore.getState().setThermalSafeMode(false);
    expect(await registry.activateAgent('heavy', '/home')).toBe(true);
  });

  it('drops sandbox state on unload so the next load starts clean', async () => {
    registry.registerAgent({
      id: 'cycle',
      label: 'Cycle',
      load: async () => ({ activate: (s) => s.set('runs', (s.get<number>('runs') ?? 0) + 1) }),
    });

    const first = await registry.loadAgent('cycle');
    expect(first?.sandbox.get('runs')).toBe(1);
    await registry.unloadAgent('cycle');
    expect(registry.isLoaded('cycle')).toBe(false);

    const second = await registry.loadAgent('cycle');
    expect(second?.sandbox.get('runs')).toBe(1);
    expect(usePlatformStore.getState().activeAgent).toBeNull();
  });

  it('returns null for an unknown agent id', async () => {
    expect(await registry.loadAgent('nope')).toBeNull();
  });
});
