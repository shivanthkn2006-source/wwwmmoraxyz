/**
 * Third-person view and crouch for VR World. L (gamepad L1, V key) switches
 * between first- and third-person; the Crouch button (C key) crouches, which
 * also slows walking. Choice is remembered on the device.
 */
import { useSyncExternalStore } from 'react';

export const CROUCH_SPEED = 0.45;
type S = { thirdPerson: boolean; crouch: boolean; face: boolean };
const KEY = 'vr-third-person';
let st: S = { thirdPerson: (() => { try { return localStorage.getItem(KEY) !== '0'; } catch { return true; } })(), crouch: false, face: false };
const ls = new Set<() => void>();
const set = (p: Partial<S>) => { st = { ...st, ...p }; ls.forEach((l) => l()); };
export const getVRView = () => st;
export const useVRView = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => st, () => st);
export function toggleThirdPerson() { set({ thirdPerson: !st.thirdPerson }); try { localStorage.setItem(KEY, st.thirdPerson ? '1' : '0'); } catch { /* private */ } }
export function toggleCrouch() { set({ crouch: !st.crouch }); }
/** Face view: your avatar turns to face the camera (only by the Face button). */
export function toggleFaceView() { set({ face: !st.face, thirdPerson: true }); }

let wired = false;
export function wireVRViewKeys() {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.code === 'KeyV') toggleThirdPerson();
    if (e.code === 'KeyC') toggleCrouch();
  });
}
