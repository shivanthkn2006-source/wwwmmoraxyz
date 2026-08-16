import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Gateway recovery path:
 *   1. Gateway offline  -> recall falls back to sovereign memory.
 *   2. Gateway online   -> status flips and recall switches back to the gateway.
 */

interface Row { user_id: string; event_type: string; content_text: string; created_at: string }
const sovereignRows: Row[] = [];

vi.mock('@/integrations/supabase/client', () => {
  const builder = () => {
    const state: { userId?: string; eventType?: string } = {};
    const api: Record<string, unknown> = {
      insert: (row: Row) => {
        sovereignRows.push({ ...row, created_at: new Date().toISOString() });
        return Promise.resolve({ error: null });
      },
      select: (_cols: string, opts?: { head?: boolean }) => {
        if (opts?.head) {
          return {
            eq: (_col: string, value: string) =>
              Promise.resolve({
                count: sovereignRows.filter((r) => r.user_id === value).length,
                error: null,
              }),
          };
        }
        return api;
      },
      eq: (col: string, value: string) => {
        if (col === 'user_id') state.userId = value;
        if (col === 'event_type') state.eventType = value;
        return api;
      },
      order: () => api,
      limit: (n: number) =>
        Promise.resolve({
          data: sovereignRows
            .filter((r) => r.user_id === state.userId && r.event_type === state.eventType)
            .slice(-n)
            .reverse(),
          error: null,
        }),
    };
    return api;
  };
  return { supabase: { from: () => builder() } };
});

const gateway = {
  online: false,
  captured: [] as { session: string; user: string; assistant: string }[],
};

vi.mock('@/services/memoryService', async () => {
  const actual = await vi.importActual<typeof import('@/services/memoryService')>(
    '@/services/memoryService'
  );
  const offline = { success: false, failureKind: 'unreachable', error: 'gateway down' };
  return {
    ...actual,
    getGatewayUrl: () => 'http://localhost:8420',
    MemoryService: {
      captureRound: async (session: string, user: string, assistant: string) => {
        if (!gateway.online) return offline;
        gateway.captured.push({ session, user, assistant });
        return { success: true, data: { l0_recorded: true } };
      },
      recall: async (query: string) => {
        if (!gateway.online) return offline;
        const hit = gateway.captured.find((c) => c.user.includes(query));
        return { success: true, data: { context: hit ? `Recalled: ${hit.user}` : '' } };
      },
      searchMemories: async () => ({ success: true, data: { results: [] } }),
      getPersona: async () => ({ success: true, data: {} }),
      diagnose: async () =>
        gateway.online
          ? { ok: true, kind: 'online', origin: 'http://localhost:8080', summary: '', detail: '' }
          : {
              ok: false,
              kind: 'unreachable',
              origin: 'http://localhost:8080',
              summary: 'Gateway unreachable.',
              detail: 'connection refused',
            },
    },
  };
});

import {
  rememberZoeRound,
  recallZoeMemory,
  getZoeMemoryStatus,
} from '@/services/zoeMemoryBridge';

const USER = 'user-recovery';
const SESSION = 'zoe-orb-user-recovery';

beforeEach(() => {
  sovereignRows.length = 0;
  gateway.captured.length = 0;
  gateway.online = false;
});

describe('TencentDB gateway offline -> online recovery', () => {
  it('falls back to sovereign while offline, then switches to the gateway on recovery', async () => {
    // --- Phase 1: gateway offline ---
    const offlineWrite = await rememberZoeRound({
      userId: USER,
      sessionKey: SESSION,
      userText: 'I keep my notebooks in Kochi',
      assistantText: 'Noted.',
    });
    expect(offlineWrite.sovereignSaved).toBe(true);
    expect(offlineWrite.gatewaySaved).toBe(false);

    const offlineStatus = await getZoeMemoryStatus(USER);
    expect(offlineStatus.gateway.connected).toBe(false);
    expect(offlineStatus.gateway.kind).toBe('unreachable');
    expect(offlineStatus.sovereign.connected).toBe(true);

    const offlineRecall = await recallZoeMemory({
      query: 'notebooks',
      sessionKey: SESSION,
      userId: USER,
    });
    expect(offlineRecall.source).toBe('sovereign');
    expect(offlineRecall.context).toContain('Kochi');

    // --- Phase 2: container comes online ---
    gateway.online = true;

    const onlineStatus = await getZoeMemoryStatus(USER);
    expect(onlineStatus.gateway.connected).toBe(true);
    expect(onlineStatus.gateway.kind).toBe('online');
    expect(onlineStatus.gateway.error).toBeNull();

    const onlineWrite = await rememberZoeRound({
      userId: USER,
      sessionKey: SESSION,
      userText: 'my notebooks are teal',
      assistantText: 'Teal notebooks, got it.',
    });
    expect(onlineWrite.gatewaySaved).toBe(true);

    const onlineRecall = await recallZoeMemory({
      query: 'notebooks',
      sessionKey: SESSION,
      userId: USER,
    });
    expect(onlineRecall.source).toBe('gateway');
    expect(onlineRecall.context).toContain('teal');
  });
});
