/**
 * Third-person view and crouch for VR World. L (gamepad L1, V key) switches
 * between first- and third-person; the Crouch button (C key) crouches, which
 * also slows walking. Choice is remembered on the device.
 */
import { useSyncExternalStore } from 'react';

export const CROUCH_SPEED = 0.45;
export const AVATAR_AHEAD = 2.8;
export const AVATAR_HEAD_Y = 1.8;
/** Village chase camera: about 0.6 m above the avatar's head (eye 2.4 m), looking slightly down at the avatar. */
export const CHASE_EYE_M = 2.4;
/** Only the village chase view is adjusted; first person and Real Map stay unchanged. */
export function villageEyeHeight() { return st.thirdPerson ? CHASE_EYE_M + orbit.lift : 1.6; }
/**
 * Standard third-person orbit: dragging up/down swings the camera over or
 * under the avatar on the same 2.8 m arm (it stays aimed at her). Lift 0 is the
 * approved 2.4 m view; limits stop it going under the floor or straight overhead.
 */
export const ORBIT_LIFT_MIN = -0.6, ORBIT_LIFT_MAX = 2.0;
export const orbit = { lift: 0 };
export function addOrbitLift(d: number) { orbit.lift = Math.min(ORBIT_LIFT_MAX, Math.max(ORBIT_LIFT_MIN, orbit.lift + d)); return orbit.lift; }
/** Positive look radians raise the village orbit camera. */
export function orbitLookUp(radians: number) { return addOrbitLift(radians * AVATAR_AHEAD); }
/** Zoom by narrowing the lens only (the arm length never changes, so doors and pickups still find her). */
export const ZOOM_FOV_MIN = 50, ZOOM_FOV_MAX = 75;
export const clampZoomFov = (f: number) => Math.min(ZOOM_FOV_MAX, Math.max(ZOOM_FOV_MIN, f));
/** Turn by d radians around the avatar standing `ahead` m in front of the camera; returns the new camera [x, z, yaw]. */
export function orbitAvatar(x: number, z: number, yaw: number, d: number, ahead = AVATAR_AHEAD): [number, number, number] {
  const ax = x - Math.sin(yaw) * ahead, az = z - Math.cos(yaw) * ahead, ny = yaw + d;
  return [ax + Math.sin(ny) * ahead, az + Math.cos(ny) * ahead, ny];
}
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
