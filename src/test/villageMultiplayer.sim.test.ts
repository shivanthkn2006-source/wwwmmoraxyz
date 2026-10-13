/**
 * Six separate signed-in clients in one simulated live room service:
 * five share the village, the sixth lands in the next copy, reconnects keep
 * places, chat reaches only room-mates, and Real Map rooms have no cap.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Ch = { name: string; key: string; meta: unknown; handlers: Record<string, ((p: unknown) => void)[]>; status?: (s: string) => void; dead: boolean };
const rooms = new Map<string, Set<Ch>>();

function sync(name: string) {
  for (const c of rooms.get(name) ?? []) c.handlers['presence:sync']?.forEach((h) => h({}));
}
function makeSupabase(uid: string) {
  const chain: Record<string, unknown> = {};
  for (const k of ['select', 'eq', 'in']) chain[k] = () => chain;
  chain.maybeSingle = async () => ({ data: { display_name: uid, username: uid } });
  (chain as { then: unknown }).then = (r: (v: unknown) => void) => r({ data: [] });
  return {
    auth: { getUser: async () => ({ data: { user: { id: uid, email: `${uid}@x` } } }) },
    from: () => chain,
    channel(name: string, cfg: { config: { presence: { key: string } } }) {
      const c: Ch = { name, key: cfg.config.presence.key, meta: null, handlers: {}, dead: false };
      const api = {
        on(type: string, f: { event: string }, h: (p: unknown) => void) { (c.handlers[`${type}:${f.event}`] ??= []).push(h); return api; },
        subscribe(cb: (s: string) => void) { c.status = cb; if (!rooms.has(name)) rooms.set(name, new Set()); rooms.get(name)!.add(c); setTimeout(() => cb('SUBSCRIBED'), 0); return api; },
        async track(m: unknown) { c.meta = m; sync(name); },
        async untrack() { c.meta = null; sync(name); },
        async send(msg: { event: string; payload: unknown }) {
          for (const o of rooms.get(name) ?? []) if (o !== c) o.handlers[`broadcast:${msg.event}`]?.forEach((h) => h({ payload: msg.payload }));
        },
        presenceState() { const out: Record<string, unknown[]> = {}; for (const o of rooms.get(name) ?? []) if (o.meta) out[o.key] = [o.meta]; return out; },
        __c: c,
      };
      return api;
    },
    removeChannel(api: { __c: Ch }) { const c = api.__c; c.dead = true; rooms.get(c.name)?.delete(c); sync(c.name); },
  };
}

type Meet = typeof import('@/worlds/meet/vrMeet');
async function client(uid: string): Promise<Meet> {
  vi.resetModules();
  vi.doMock('@/integrations/supabase/client', () => ({ supabase: makeSupabase(uid) }));
  vi.doMock('@/lib/vrPrivacy', () => ({ setShareRealLocation: async () => {} }));
  return import('@/worlds/meet/vrMeet');
}
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));
async function enter(m: Meet, room: string, mode: 'mmora' | 'real' = 'mmora') {
  await m.joinMeet(room); await tick();
  m.updateMyPose({ mode, x: 0, z: 0, yaw: 0 }); await tick();
}

beforeEach(() => rooms.clear());

describe('M\u2019Mora Village multiplayer (6 sessions)', () => {
  it('groups five, isolates the sixth, keeps places on reconnect, scopes chat', async () => {
    const cs: Meet[] = [];
    for (let i = 0; i < 6; i++) { const m = await client(`u${i}`); cs.push(m); await enter(m, 'mmora:chennai'); await tick(3); }
    await tick(20);
    for (let i = 0; i < 5; i++) {
      expect(cs[i].getMeet().room).toBe('mmora:chennai');
      expect(cs[i].getMeet().players.map((p) => p.id).sort()).toEqual(['u0', 'u1', 'u2', 'u3', 'u4'].filter((x) => x !== `u${i}`));
      expect(cs[i].getMeet().party?.count).toBe(5);
    }
    const six = cs[5].getMeet();
    expect(six.room).toBe('mmora:chennai#2');
    expect(six.players).toHaveLength(0);
    expect(six.party?.shard).toBe(2);

    // chat: room-mates hear, the sixth does not
    cs[0].sendChat('hello village'); await tick();
    expect(cs[3].getMeet().messages.some((m) => m.text === 'hello village')).toBe(true);
    expect(cs[5].getMeet().messages.some((m) => m.text === 'hello village')).toBe(false);

    // reconnect: u2 drops and rejoins; keeps its earlier place, sixth stays out
    const ch = [...rooms.get('mmora:chennai')!].find((c) => c.key === 'u2')!;
    ch.status!('CHANNEL_ERROR');
    await tick(3200);
    m_check: {
      cs[2].updateMyPose({ mode: 'mmora', x: 1, z: 1, yaw: 0 }); await tick(20);
      expect(cs[2].getMeet().room).toBe('mmora:chennai');
      expect(cs[2].getMeet().players).toHaveLength(4);
      break m_check;
    }
    expect(cs[5].getMeet().room).toBe('mmora:chennai#2');

    // a village member leaving frees nothing for #2 automatically (no shuffle mid-game) but new joiners fill gaps
    await cs[4].joinMeet(null); await tick(10);
    const late = await client('u9'); await enter(late, 'mmora:chennai'); await tick(20);
    expect(late.getMeet().room).toBe('mmora:chennai');
  }, 15000);

  it('Real Map rooms are not capped', async () => {
    const cs: Meet[] = [];
    for (let i = 0; i < 6; i++) { const m = await client(`r${i}`); cs.push(m); await enter(m, 'real:1_2', 'real'); }
    await tick(20);
    for (const m of cs) { expect(m.getMeet().room).toBe('real:1_2'); expect(m.getMeet().players).toHaveLength(5); expect(m.getMeet().party).toBeNull(); }
  });
});
