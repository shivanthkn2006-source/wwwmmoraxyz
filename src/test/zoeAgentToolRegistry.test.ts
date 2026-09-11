import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn(async () => ({ data: { ok: true, engine: 'swieph' }, error: null })) } },
}));

vi.mock('@/utils/headlessResumeBuilder', () => ({
  triggerHeadlessResume: vi.fn(async () => ({ success: true, message: 'ok', fileName: 'a.pdf' })),
}));

import {
  ZOE_TOOL_DEFINITIONS,
  executeZoeTool,
  hasZoeTool,
  toolAcknowledgement,
} from '@/services/zoe-agent/toolRegistry';
import { setAmbientContext, describeAmbientContext } from '@/services/zoe-agent/ambientContext';

describe('Zoe agent tool registry', () => {
  beforeEach(() => {
    setAmbientContext({ currentPostId: null, activeVRLocation: null, friendsList: [], extras: {} });
  });

  it('exposes every tool with a schema', () => {
    expect(ZOE_TOOL_DEFINITIONS.length).toBeGreaterThanOrEqual(5);
    ZOE_TOOL_DEFINITIONS.forEach((t) => {
      expect(t.name).toBeTruthy();
      expect(hasZoeTool(t.name)).toBe(true);
      expect((t.parameters as any).type).toBe('object');
    });
  });

  it('never throws on an unknown tool', async () => {
    const res = await executeZoeTool('not_a_tool', {});
    expect(res.ok).toBe(false);
  });

  it('reports VR world status from the live presence function', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: { ok: true, usersOnline: 12, usersInVr: 3, friendsOnline: ['Asha'] },
      error: null,
    });
    setAmbientContext({ activeVRLocation: 'Neon Bay' });
    const res = await executeZoeTool('queryVRWorldStatus');
    expect(res.ok).toBe(true);
    expect(res.source).toBe('live');
    expect(res.usersInVr).toBe(3);
    expect(res.vrLocation).toBe('Neon Bay');
  });

  it('falls back to what the screen knows when the live check fails', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.functions.invoke as any).mockResolvedValueOnce({ data: null, error: { message: 'down' } });
    setAmbientContext({ activeVRLocation: 'Neon Bay', friendsList: [{ name: 'Asha', online: true }] });
    const res = await executeZoeTool('queryVRWorldStatus');
    expect(res.ok).toBe(true);
    expect(res.source).toBe('local');
    expect(res.friendsOnline).toEqual(['Asha']);
  });

  it('emails the conversation history through the mail function', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: { ok: true, messageCount: 4, to: 'a@b.co' },
      error: null,
    });
    const res = await executeZoeTool('emailConversationHistory', { days: 7 });
    expect(res.ok).toBe(true);
    expect(res.messageCount).toBe(4);
  });

  it('rejects unsafe navigation targets', async () => {
    const bad = await executeZoeTool('navigatePlatform', { path: 'https://evil.example' });
    expect(bad.ok).toBe(false);
  });

  it('calls the ephemeris function for planetary positions', async () => {
    const res = await executeZoeTool('calculatePlanetaryPositions', { latitude: 10, longitude: 76 });
    expect(res.ok).toBe(true);
    expect(res.engine).toBe('swieph');
  });

  it('generates a resume through the headless builder', async () => {
    const res = await executeZoeTool('generateResume', { name: 'Marc', skills: 'a, b' });
    expect(res.ok).toBe(true);
  });

  it('gives a spoken acknowledgement for each tool', () => {
    ZOE_TOOL_DEFINITIONS.forEach((t) => expect(toolAcknowledgement(t.name).length).toBeGreaterThan(3));
  });

  it('describes the ambient context for the prompt', () => {
    setAmbientContext({ currentPostId: 'p1' });
    const text = describeAmbientContext('/home', 'Home');
    expect(text).toContain('Home');
    expect(text).toContain('p1');
  });
});
