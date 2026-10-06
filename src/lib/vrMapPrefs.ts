/** Round-map settings on this device: opacity, size (normal/large) and the big half-screen map. */
import { useSyncExternalStore } from 'react';
export type MapPrefs = { opacity: number; size: 'normal' | 'large'; big: boolean; bigOpacity: number };
const KEY = 'vr-map-prefs';
let st: MapPrefs = (() => { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) return { opacity: 1, size: 'normal', bigOpacity: 0.9, ...s, big: false }; } catch { /* */ } return { opacity: 1, size: 'normal', big: false, bigOpacity: 0.9 }; })();
const ls = new Set<() => void>();
export function setMapPrefs(p: Partial<MapPrefs>) {
  st = { ...st, ...p };
  try { localStorage.setItem(KEY, JSON.stringify({ opacity: st.opacity, size: st.size, bigOpacity: st.bigOpacity })); } catch { /* */ }
  ls.forEach((l) => l());
}
export const getMapPrefs = () => st;
export const useMapPrefs = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => st, () => st);
