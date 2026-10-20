import { useSyncExternalStore } from 'react';
import ready from '@/assets/models/village-ready-player-female.glb.asset.json';
import zoe from '@/assets/models/village-zoe-upload.glb.asset.json';

export const AVATAR_CHOICES = [
  { id: 'skirt', name: 'Skirt female', url: null },
  { id: 'ready', name: 'Ready Player female', url: ready.url },
  { id: 'zoe-upload', name: 'Zoe upload', url: zoe.url },
] as const;
export type VillageAvatarId = typeof AVATAR_CHOICES[number]['id'];
export const DEFAULT_AVATAR: VillageAvatarId = 'zoe-upload';
export function validAvatarId(value: unknown): VillageAvatarId {
  return AVATAR_CHOICES.find((a) => a.id === value)?.id ?? DEFAULT_AVATAR;
}
const KEY = 'mmora-avatar-choice';
// Apply this testing default once; subsequent explicit selections still win.
const DEFAULT_VERSION = 'mmora-avatar-default-20261020';
let choice: VillageAvatarId = (() => { try {
  if (!localStorage.getItem(DEFAULT_VERSION)) {
    localStorage.setItem(KEY, DEFAULT_AVATAR);
    localStorage.setItem(DEFAULT_VERSION, '1');
  }
  return validAvatarId(localStorage.getItem(KEY));
} catch { return DEFAULT_AVATAR; } })();
const listeners = new Set<() => void>();
export function setAvatarChoice(value: VillageAvatarId) {
  choice = validAvatarId(value);
  try { localStorage.setItem(KEY, choice); } catch { /* private browsing */ }
  listeners.forEach((l) => l());
}
export const useAvatarChoice = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => choice, () => DEFAULT_AVATAR);