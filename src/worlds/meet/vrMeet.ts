/**
 * Meet other members in VR World: one live room per world/area (M'Mora World
 * is one room; the Real Map is split into ~2 km areas), presence for where
 * everyone stands, and an in-world text chat. Members are visible by default
 * and can hide themselves with the "Visible to others" switch.
 */
import { useSyncExternalStore } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { setShareRealLocation } from '@/lib/vrPrivacy';
import { admitted, isVillageRoom, shardRoom, MAX_SHARDS, VILLAGE_CAP } from './villageParty';

export type MeetTag = 'friend' | 'follower' | 'unknown';
export type MeetPose = { mode: 'real' | 'mmora'; x?: number; z?: number; lat?: number; lng?: number; yaw: number; f?: boolean };
export type Remote = MeetPose & { id: string; name: string; username: string; photo?: string | null; at: number; tag: MeetTag; voice?: boolean; since?: number };
export type ChatMsg = { id: string; from: string; name: string; username: string; photo?: string | null; tag: MeetTag | 'me'; text: string; at: number; system?: boolean };

type Me = { id: string; name: string; username: string; photo?: string | null };
type State = { connected: boolean; room: string | null; visible: boolean; players: Remote[]; messages: ChatMsg[]; chatOpen: boolean; chatFocus: number; nearest: { id: string; username: string; dist: number } | null; base: string | null; party: { count: number; cap: number; shard: number } | null };

const VIS_KEY = 'vr-meet-visible';
const readVisible = () => { try { return localStorage.getItem(VIS_KEY) !== '0'; } catch { return true; } };

let state: State = { connected: false, room: null, visible: typeof localStorage === 'undefined' ? true : readVisible(), players: [], messages: [], chatOpen: false, chatFocus: 0, nearest: null, base: null, party: null };
const ls = new Set<() => void>();
const set = (p: Partial<State>) => { state = { ...state, ...p }; ls.forEach((l) => l()); };
export const getMeet = () => state;
if (typeof window !== 'undefined') (window as unknown as { __vrMeet: () => State }).__vrMeet = () => state;
export const useMeet = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => state, () => state);

let me: Me | null = null;
let channel: RealtimeChannel | null = null;
const tags = new Map<string, MeetTag>();
const waves = new Map<string, number>();
let lastTracked: { pose: MeetPose; at: number } | null = null;
let voiceFlag = false;
type Signal = { from: string; to: string; kind: 'offer' | 'answer' | 'ice' | 'bye'; data?: unknown };
const signalLs = new Set<(s: Signal) => void>();
/** Voice chat signalling rides on the same room (WebRTC offers/answers/ICE). */
export function onSignal(fn: (s: Signal) => void) { signalLs.add(fn); return () => { signalLs.delete(fn); }; }
export function sendSignal(to: string, kind: Signal['kind'], data?: unknown) {
  if (!channel || !me || !state.connected) return;
  void channel.send({ type: 'broadcast', event: 'rtc', payload: { from: me.id, to, kind, data } });
}
export const myMeetId = () => me?.id ?? null;
/** Tell the room my mic is on/off (shown as a speaker badge; only voice-on members connect). */
export function setVoiceFlag(on: boolean) { voiceFlag = on; lastTracked = null; }

export const TAG_LABEL: Record<MeetTag, string> = { friend: 'Friend', follower: 'Follower', unknown: 'New' };

/** Pure: tag for one member, from my friendships and who follows me. */
export function tagFor(id: string, friends: Set<string>, followers: Set<string>): MeetTag {
  return friends.has(id) ? 'friend' : followers.has(id) ? 'follower' : 'unknown';
}

async function ensureMe(): Promise<Me | null> {
  if (me) return me;
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u) {
    // Dev test harness only: a throwaway guest so two test browsers can meet.
    if (import.meta.env.DEV && typeof location !== 'undefined' && location.pathname === '/__vr-harness') {
      const id = sessionStorage.getItem('vr-guest') ?? crypto.randomUUID();
      sessionStorage.setItem('vr-guest', id);
      me = { id, name: `Guest ${id.slice(0, 4)}`, username: `guest_${id.slice(0, 4)}`, photo: null };
      return me;
    }
    return null;
  }
  const { data: p } = await supabase.from('public_profiles').select('display_name, username, profile_photo_url').eq('user_id', u.id).maybeSingle();
  me = { id: u.id, name: p?.display_name || u.email?.split('@')[0] || 'Member', username: p?.username || u.email?.split('@')[0] || 'member', photo: p?.profile_photo_url ?? null };
  return me;
}

async function loadTags(ids: string[]) {
  const todo = ids.filter((i) => !tags.has(i));
  if (!todo.length || !me) return;
  const list = todo.join(',');
  const [f1, f2, fo] = await Promise.all([
    supabase.from('friendships').select('user2_id').eq('user1_id', me.id).in('user2_id', todo),
    supabase.from('friendships').select('user1_id').eq('user2_id', me.id).in('user1_id', todo),
    supabase.from('user_follows').select('follower_id').eq('following_id', me.id).in('follower_id', todo),
  ]).catch(() => [{ data: [] }, { data: [] }, { data: [] }] as never);
  void list;
  const friends = new Set<string>([...(f1.data ?? []).map((r: { user2_id: string }) => r.user2_id), ...(f2.data ?? []).map((r: { user1_id: string }) => r.user1_id)]);
  const followers = new Set<string>((fo.data ?? []).map((r: { follower_id: string }) => r.follower_id));
  for (const id of todo) tags.set(id, tagFor(id, friends, followers));
  set({ players: state.players.map((p) => ({ ...p, tag: tags.get(p.id) ?? 'unknown' })) });
}

function pushMsg(m: ChatMsg) {
  set({ messages: [...state.messages, m].slice(-40) });
}

/** Join (or switch to) a live room. Pass null to leave. */
let since = 0;
let shard = 1;

/** Join (or switch to) a live room. Village rooms hold at most VILLAGE_CAP members; extras go to the next copy. */
export async function joinMeet(base: string | null) {
  if (base === state.base) return;
  shard = 1;
  await openRoom(base, base ? shardRoom(base, 1) : null);
}

async function openRoom(base: string | null, room: string | null, keepSince = false) {
  if (channel) { void supabase.removeChannel(channel); channel = null; }
  lastTracked = null;
  if (!keepSince || !since) since = Date.now();
  set({ base, room, connected: false, players: [], nearest: null, party: isVillageRoom(room) ? { count: 1, cap: VILLAGE_CAP, shard } : null });
  if (!room) return;
  const self = await ensureMe();
  if (!self || state.room !== room) return;
  const ch = supabase.channel(`vr-meet:${room}`, { config: { presence: { key: self.id }, broadcast: { self: false } } });
  channel = ch;
  ch.on('presence', { event: 'sync' }, () => {
    const st = ch.presenceState<Remote>();
    let players: Remote[] = [];
    for (const [key, metas] of Object.entries(st)) {
      if (key === self.id) continue;
      const m = metas[metas.length - 1] as unknown as Remote | undefined;
      if (m) players.push({ ...m, id: key, tag: tags.get(key) ?? 'unknown' });
    }
    if (isVillageRoom(room)) {
      const inSet = admitted([{ id: self.id, since }, ...players.map((p) => ({ id: p.id, since: p.since ?? p.at }))]);
      if (!inSet.has(self.id) && shard < MAX_SHARDS && channel === ch) {
        shard += 1;
        void openRoom(state.base, shardRoom(state.base ?? room, shard));
        return;
      }
      players = players.filter((p) => inSet.has(p.id));
      set({ players, party: { count: players.length + 1, cap: VILLAGE_CAP, shard } });
    } else set({ players });
    void loadTags(players.map((p) => p.id));
  })
    .on('broadcast', { event: 'chat' }, ({ payload }) => {
      const m = payload as ChatMsg;
      if (!m?.text || typeof m.text !== 'string') return;
      pushMsg({ ...m, at: Date.now(), text: m.text.slice(0, 240), tag: tags.get(m.from) ?? 'unknown' });
    })
    .on('broadcast', { event: 'rtc' }, ({ payload }) => {
      const sg = payload as Signal;
      if (sg?.to !== self.id || typeof sg.from !== 'string') return;
      signalLs.forEach((l) => l(sg));
    })
    .on('broadcast', { event: 'wave' }, ({ payload }) => {
      const p = payload as { to: string; from: string; username: string };
      if (p?.to !== self.id) return;
      const last = waves.get(p.from) ?? 0;
      if (Date.now() - last < 30_000) return;
      waves.set(p.from, Date.now());
      pushMsg({ id: `w${Date.now()}`, from: p.from, name: p.username, username: p.username, tag: tags.get(p.from) ?? 'unknown', text: 'stopped next to you and said hi 👋', at: Date.now(), system: true });
      window.dispatchEvent(new CustomEvent('vr-meet-wave', { detail: p }));
    })
    .subscribe((status) => {
      if (channel !== ch) return;
      if (status === 'SUBSCRIBED') set({ connected: true });
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        set({ connected: false });
        // Busy phones can miss the heartbeat: rejoin the same room shortly.
        window.setTimeout(() => {
          if (channel !== ch || state.connected) return;
          const b = state.base, r = state.room; void openRoom(b, r, true);
        }, 3000);
      }
    });
}

/** Called about once a second with where I stand. Sends only when I moved or every 5 s. */
export function updateMyPose(pose: MeetPose) {
  if (!channel || !me || !state.connected || !state.visible) return;
  const now = Date.now();
  const prev = lastTracked;
  const moved = !prev || prev.pose.mode !== pose.mode
    || Math.hypot((pose.x ?? 0) - (prev.pose.x ?? 0), (pose.z ?? 0) - (prev.pose.z ?? 0)) > 0.4
    || Math.abs((pose.lat ?? 0) - (prev.pose.lat ?? 0)) > 3e-6 || Math.abs((pose.lng ?? 0) - (prev.pose.lng ?? 0)) > 3e-6
    || Math.abs(pose.yaw - prev.pose.yaw) > 0.3;
  if (!moved && prev && now - prev.at < 5000) return;
  lastTracked = { pose, at: now };
  void channel.track({ ...pose, id: me.id, name: me.name, username: me.username, photo: me.photo, at: now, since, voice: voiceFlag });
}

export async function setMeetVisible(v: boolean) {
  try { localStorage.setItem(VIS_KEY, v ? '1' : '0'); } catch { /* private mode */ }
  set({ visible: v });
  lastTracked = null;
  if (!v && channel) void channel.untrack();
  void setShareRealLocation(v);
}

export function sendChat(text: string, system = false): boolean {
  const t = text.trim().slice(0, 240);
  if (!t || !me) return false;
  const msg: ChatMsg = { id: `${me.id}-${Date.now()}`, from: me.id, name: me.name, username: me.username, photo: me.photo, tag: 'me', text: t, at: Date.now(), system };
  pushMsg(msg);
  if (channel && state.connected) void channel.send({ type: 'broadcast', event: 'chat', payload: { ...msg, tag: 'unknown' } });
  return true;
}

/** A short line others nearby see, e.g. "found a rare relic". Silent when hidden. */
export function sayInWorld(text: string) { if (state.visible) sendChat(text, true); }

export function sendWave(to: string) {
  if (!channel || !me || !state.connected) return;
  void channel.send({ type: 'broadcast', event: 'wave', payload: { to, from: me.id, username: me.username } });
}

/** `focus` puts the cursor in the chat box (explicit opens only, so walking keys keep working). */
export const setChatOpen = (v: boolean, focus = false) => set({ chatOpen: v, chatFocus: focus ? Date.now() : state.chatFocus });
export const setNearest = (n: State['nearest']) => {
  const a = state.nearest, same = a?.id === n?.id && Math.abs((a?.dist ?? 0) - (n?.dist ?? 0)) < 0.3;
  if (!same) set({ nearest: n });
};

export function __resetMeetForTests() {
  if (channel) void supabase.removeChannel(channel);
  channel = null; me = null; tags.clear(); lastTracked = null;
  state = { connected: false, room: null, visible: true, players: [], messages: [], chatOpen: false, chatFocus: 0, nearest: null, base: null, party: null };
}
