import { useSyncExternalStore } from 'react';

/**
 * Whether the member is currently inside VR World (the 3D memory palace).
 * While true, background hosts outside the world unmount so the phone's
 * memory and CPU go to the 3D scene only.
 */
let active = false;
const listeners = new Set<() => void>();

export function setVRWorldActive(next: boolean) {
  if (active === next) return;
  active = next;
  if (typeof document !== 'undefined') {
    if (next) document.body.setAttribute('data-vr-world', '1');
    else document.body.removeAttribute('data-vr-world');
  }
  listeners.forEach((l) => l());
}

export function isVRWorldActive() { return active; }

export function useVRWorldActive() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => active,
    () => false,
  );
}
