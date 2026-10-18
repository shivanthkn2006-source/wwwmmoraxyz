import { useSyncExternalStore } from 'react';
import ready from '@/assets/models/village-ready-player-female.glb.asset.json';
import zoe from '@/assets/models/village-zoe-upload.glb.asset.json';

export const AVATAR_CHOICES = [
  { id: 'skirt', name: 'Skirt female', url: null },
  { id: 'ready', name: 'Ready Player female', url: ready.url },
  { id: 'zoe-upload', name: 'Zoe upload', url: zoe.url },
] as const;
export type VillageAvatarId = typeof AVATAR_CHOICES[number]['id'];
export function validAvatarId(value: unknown): VillageAvatarId {
  return AVATAR_CHOICES.find((a) => a.id === value)?.id ?? 'skirt';
}
const KEY = 'mmora-avatar-choice';
let choice: VillageAvatarId = (() => { try { return validAvatarId(localStorage.getItem(KEY)); } catch { return 'skirt'; } })();
const listeners = new Set<() => void>();
export function setAvatarChoice(value: VillageAvatarId) {
  choice = validAvatarId(value);
  try { localStorage.setItem(KEY, choice); } catch { /* private browsing */ }
  listeners.forEach((l) => l());
}
export const useAvatarChoice = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => choice, () => 'skirt' as VillageAvatarId);