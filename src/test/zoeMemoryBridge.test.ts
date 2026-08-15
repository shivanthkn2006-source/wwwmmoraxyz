import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * End-to-end simulation of Zoe's persistent memory path:
 *   1. Zoe saves a completed round (sovereign memory + TencentDB gateway).
 *   2. A "reload" re-reads that memory from persistent storage.
 *   3. The TencentDB agent path is confirmed wired (capture -> recall -> status).
 */

/* ---------------- in-memory fakes ---------------- */

interface Row { user_id: string; event_type: string; content_text: string; created_at: string }
const sovereignRows: Row[] = [];
let sovereignFails = false;

vi.mock('@/integrations/supabase/client', () => {
  const builder = (table: string) => {
    const state: { userId?: string; eventType?: string; limit?: number } = {};
    const api: Record<string, unknown> = {
      insert: (row: Row) => {
        if (sovereignFails) return Promise.resolve({ error: { message: 'rls denied' } });
        sovereignRows.push({ ...row, created_at: new Date().toISOString() });
        return Promise.resolve({ error: null });
      },
      select: (_cols: string, opts?: { head?: boolean }) => {
        if (opts?.head) {
          return {
            eq: () =>
              Promise.resolve({
                count: sovereignRows.filter((r) => r.user_id === state.userId).length,
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
      limit: (n: number) => {
        const data = sovereignRows
          .filter((r) => r.user_id === state.userId && r.event_type === state.eventType)
          .slice(-n)
          .reverse();
        return Promise.resolve({ data, error: null });
      },
    };
    void table;
    return api;
  };
  return { supabase: { from: (t: string) => builder(t) } };
});

/** Fake TencentDB MemoryCore gateway. */
const gateway = {
  online: true,
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
              kind: 'cors',
              origin: 'http://localhost:8080',
              summary: 'Blocked by CORS.',
              detail: 'preflight rejected',
            },
    },
  };
});

import {
  rememberZoeRound,
  recallZoeMemory,
  getZoeMemoryStatus,
} from '@/services/zoeMemoryBridge';

const USER = 'user-1';
const SESSION = 'zoe-orb-user-1';

beforeEach(() => {
  sovereignRows.length = 0;
  gateway.captured.length = 0;
  gateway.online = true;
  sovereignFails = false;
});

describe('Zoe persistent memory (sovereign + TencentDB gateway)', () => {
  it('saves a round to both stores and reloads it after a simulated reload', async () => {
    const saved = await rememberZoeRound({
      userId: USER,
      sessionKey: SESSION,
      userText: 'my favourite colour is teal',
      assistantText: 'Noted — teal it is.',
    });

    expect(saved.sovereignSaved).toBe(true);
    expect(saved.gatewaySaved).toBe(true);
    expect(sovereignRows).toHaveLength(1);
    expect(gateway.captured[0].session).toBe(SESSION);

    // "Reload": a brand-new recall with no in-memory conversation state.
    const recalled = await recallZoeMemory({
      query: 'favourite colour',
      sessionKey: SESSION,
      userId: USER,
    });

    expect(recalled.source).toBe('gateway');
    expect(recalled.context).toContain('teal');
  });

  it('falls back to sovereign memory when the TencentDB gateway is offline', async () => {
    await rememberZoeRound({
      userId: USER,
      sessionKey: SESSION,
      userText: 'I live in Kochi',
      assistantText: 'Got it.',
    });

    gateway.online = false;

    const write = await rememberZoeRound({
      userId: USER,
      sessionKey: SESSION,
      userText: 'I fly on Tuesday',
      assistantText: 'Safe travels.',
    });
    expect(write.sovereignSaved).toBe(true);
    expect(write.gatewaySaved).toBe(false);
    expect(write.gatewayKind).toBe('unreachable');

    const recalled = await recallZoeMemory({
      query: 'where do I live',
      sessionKey: SESSION,
      userId: USER,
    });
    expect(recalled.source).toBe('sovereign');
    expect(recalled.context).toContain('Kochi');
  });

  it('reports connection state and the exact gateway failure reason', async () => {
    await rememberZoeRound({
      userId: USER,
      sessionKey: SESSION,
      userText: 'hi',
      assistantText: 'hello',
    });

    const ok = await getZoeMemoryStatus(USER);
    expect(ok.sovereign.connected).toBe(true);
    expect(ok.sovereign.rows).toBe(1);
    expect(ok.gateway.connected).toBe(true);
    expect(ok.gateway.kind).toBe('online');

    gateway.online = false;
    const failing = await getZoeMemoryStatus(USER);
    expect(failing.gateway.connected).toBe(false);
    expect(failing.gateway.kind).toBe('cors');
    expect(failing.gateway.error).toContain('CORS');
  });

  it('surfaces sovereign write failures without losing the gateway write', async () => {
    sovereignFails = true;
    const res = await rememberZoeRound({
      userId: USER,
      sessionKey: SESSION,
      userText: 'test',
      assistantText: 'ok',
    });
    expect(res.sovereignSaved).toBe(false);
    expect(res.error).toBe('rls denied');
    expect(res.gatewaySaved).toBe(true);
  });
});
