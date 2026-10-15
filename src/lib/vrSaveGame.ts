/**
 * VR World game save: where you stopped (world, map place, position, facing),
 * saved on this device every few seconds and when you leave, so the next visit
 * resumes there. Keys, doors, notes (vrStory), bag and quests already persist
 * in their own stores.
 */
import type { LatLng } from '@/worlds/realmap/geo';

const KEY = 'vr-save-game';
export type VRSave = {
  at: number;
  mode: 'real' | 'mmora';
  origin: LatLng & { label?: string };
  pos: [number, number, number];
  yaw: number;
  realPos?: [number, number, number] | null;
};

export function readSave(): VRSave | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!s || !Array.isArray(s.pos) || typeof s.origin?.lat !== 'number') return null;
    return s;
  } catch { return null; }
}
export function writeSave(s: Omit<VRSave, 'at'>, at = Date.now()) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...s, at })); } catch { /* private mode */ }
}
export function clearSave() { try { localStorage.removeItem(KEY); } catch { /* */ } }
