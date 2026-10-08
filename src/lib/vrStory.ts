/**
 * M'Mora Village story pieces: keys, notes and locked doors (Resident Evil
 * style). Found keys and read notes are remembered on the device and keys
 * also go into the bag. Door logic is pure so it can be tested.
 */
import { useSyncExternalStore } from 'react';

export type StoryKey = { id: string; name: string; opens: string };
export type StoryNote = { id: string; title: string; text: string };

export const KEYS: Record<string, StoryKey> = {
  archive_key: { id: 'archive_key', name: 'Brass archive key', opens: 'archive_door' },
};
export const NOTES: Record<string, StoryNote> = {
  note_gate: { id: 'note_gate', title: 'Torn page by the doorway', text: 'The keeper locked the old archive and hid the brass key under the lamp by the fountain path. Whatever is inside, he said, belongs to whoever remembers.' },
  note_archive: { id: 'note_archive', title: "Keeper's last note", text: 'If you are reading this, the archive is yours now. The shard on the shelf holds a memory of this city. Keep it safe.' },
};
export const DOORS: Record<string, { id: string; name: string; needs: string }> = {
  archive_door: { id: 'archive_door', name: 'Archive door', needs: 'archive_key' },
};

type S = { keys: string[]; notes: string[]; open: string[]; reading: string | null };
const LS = 'vr-story-v1';
const load = (): S => { try { const v = JSON.parse(localStorage.getItem(LS) || 'null'); if (v) return { keys: v.keys ?? [], notes: v.notes ?? [], open: v.open ?? [], reading: null }; } catch { /* */ } return { keys: [], notes: [], open: [], reading: null }; };
let st: S = typeof localStorage === 'undefined' ? { keys: [], notes: [], open: [], reading: null } : load();
const ls = new Set<() => void>();
const save = () => { try { localStorage.setItem(LS, JSON.stringify({ keys: st.keys, notes: st.notes, open: st.open })); } catch { /* */ } };
const set = (p: Partial<S>) => { st = { ...st, ...p }; save(); ls.forEach((l) => l()); };
export const getStory = () => st;
export const useStory = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => st, () => st);

/** Pure: what happens when you press Use at a door. */
export function doorAction(doorId: string, s: Pick<S, 'keys' | 'open'>): { result: 'open' | 'already' | 'locked'; text: string } {
  const d = DOORS[doorId];
  if (!d) return { result: 'locked', text: 'It will not move' };
  if (s.open.includes(doorId)) return { result: 'already', text: `${d.name} is open` };
  if (!s.keys.includes(d.needs)) return { result: 'locked', text: `${d.name} is locked — find the ${KEYS[d.needs]?.name.toLowerCase() ?? 'key'}` };
  return { result: 'open', text: `Used the ${KEYS[d.needs].name} — the ${d.name.toLowerCase()} opens` };
}

export function takeKey(id: string) {
  if (st.keys.includes(id)) return;
  set({ keys: [...st.keys, id] });
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('vr-item-pickup', { detail: { type: id, rarity: 'key item' } }));
}
export function readNote(id: string) { set({ notes: st.notes.includes(id) ? st.notes : [...st.notes, id], reading: id }); }
export function closeNote() { set({ reading: null }); }
export function useDoor(id: string) {
  const r = doorAction(id, st);
  if (r.result === 'open') {
    set({ open: [...st.open, id] });
    void import('@/lib/notifySelf').then(({ notifySelf }) => notifySelf('vr_door_unlocked', 'Door unlocked', `${DOORS[id].name} in M'Mora Village is open.`, { link: '/vr-world' })).catch(() => {});
  }
  return r;
}
export function __resetStory() { st = { keys: [], notes: [], open: [], reading: null }; }
