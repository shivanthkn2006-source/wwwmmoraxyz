/**
 * Voice chat inside VR World: when you turn your mic on, you talk live with
 * the nearest members in the same room who also have their mic on (up to 4),
 * peer-to-peer. The mic is only opened after you tap the mic button.
 */
import { useSyncExternalStore } from 'react';
import { getMeet, onSignal, sendSignal, myMeetId, setVoiceFlag } from './vrMeet';

export const MAX_PEERS = 4;
import { supabase } from '@/integrations/supabase/client';
import { normalizeIceServers, FALLBACK_ICE_SERVERS } from '@/features/calls/callTransport';
/** Same relay as calls, so voice also connects on strict phone/office networks. */
const ICE: RTCConfiguration = { iceServers: FALLBACK_ICE_SERVERS };
async function loadRelay() {
  try {
    const { data } = await supabase.functions.invoke('zoe-call-turn-credentials');
    const servers = normalizeIceServers((data as { iceServers?: unknown } | null)?.iceServers);
    if (servers.length) ICE.iceServers = servers;
  } catch { /* keep public servers */ }
}

type VState = { on: boolean; error: string | null; talkingWith: string[] };
let st: VState = { on: false, error: null, talkingWith: [] };
const ls = new Set<() => void>();
const set = (p: Partial<VState>) => { st = { ...st, ...p }; ls.forEach((l) => l()); };
export const useVoice = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => st, () => st);

let mic: MediaStream | null = null;
const peers = new Map<string, { pc: RTCPeerConnection; audio: HTMLAudioElement }>();
let offSignal: (() => void) | null = null;
let timer: number | null = null;

/** Pure: which members to connect to — voice-on, nearest first, capped. */
export function pickVoicePeers(players: { id: string; voice?: boolean }[], max = MAX_PEERS): string[] {
  return players.filter((p) => p.voice).slice(0, max).map((p) => p.id);
}

function close(id: string) {
  const p = peers.get(id);
  if (!p) return;
  try { p.pc.close(); } catch { /* closed */ }
  p.audio.srcObject = null; p.audio.remove();
  peers.delete(id);
  set({ talkingWith: [...peers.keys()] });
}

function peerFor(id: string): RTCPeerConnection {
  const have = peers.get(id);
  if (have) return have.pc;
  const pc = new RTCPeerConnection(ICE);
  const audio = document.createElement('audio');
  audio.autoplay = true; audio.setAttribute('playsinline', ''); audio.style.display = 'none';
  document.body.appendChild(audio);
  mic?.getTracks().forEach((t) => pc.addTrack(t, mic!));
  pc.ontrack = (e) => { audio.srcObject = e.streams[0]; void audio.play().catch(() => {}); };
  pc.onicecandidate = (e) => { if (e.candidate) sendSignal(id, 'ice', e.candidate.toJSON()); };
  pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed' || pc.connectionState === 'closed') close(id); };
  peers.set(id, { pc, audio });
  set({ talkingWith: [...peers.keys()] });
  return pc;
}

async function onSig(s: { from: string; kind: string; data?: unknown }) {
  if (!st.on) return;
  try {
    if (s.kind === 'bye') return close(s.from);
    if (s.kind === 'offer') {
      if (!peers.has(s.from) && peers.size >= MAX_PEERS) return;
      const pc = peerFor(s.from);
      await pc.setRemoteDescription(s.data as RTCSessionDescriptionInit);
      const ans = await pc.createAnswer(); await pc.setLocalDescription(ans);
      sendSignal(s.from, 'answer', pc.localDescription?.toJSON());
    } else if (s.kind === 'answer') {
      await peers.get(s.from)?.pc.setRemoteDescription(s.data as RTCSessionDescriptionInit);
    } else if (s.kind === 'ice') {
      await peers.get(s.from)?.pc.addIceCandidate(s.data as RTCIceCandidateInit);
    }
  } catch { /* stale signal */ }
}

/** Every 2 s: call new voice-on members (the lower id calls, so only one side offers), hang up on ones who left. */
async function reconcile() {
  const me = myMeetId();
  if (!st.on || !me) return;
  const want = new Set(pickVoicePeers(getMeet().players));
  for (const id of [...peers.keys()]) if (!want.has(id)) { sendSignal(id, 'bye'); close(id); }
  for (const id of want) {
    if (peers.has(id) || me > id) continue;
    const pc = peerFor(id);
    const off = await pc.createOffer(); await pc.setLocalDescription(off);
    sendSignal(id, 'offer', pc.localDescription?.toJSON());
  }
}

export async function startVoice(): Promise<boolean> {
  if (st.on) return true;
  const relay = loadRelay();
  try {
    mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
  } catch {
    set({ error: 'Microphone not allowed' });
    return false;
  }
  await relay;
  set({ on: true, error: null });
  setVoiceFlag(true);
  offSignal = onSignal((s) => void onSig(s));
  timer = window.setInterval(() => void reconcile(), 2000);
  void reconcile();
  return true;
}

export function stopVoice() {
  if (!st.on) return;
  for (const id of [...peers.keys()]) { sendSignal(id, 'bye'); close(id); }
  mic?.getTracks().forEach((t) => t.stop()); mic = null;
  offSignal?.(); offSignal = null;
  if (timer) window.clearInterval(timer); timer = null;
  setVoiceFlag(false);
  set({ on: false, talkingWith: [] });
}
