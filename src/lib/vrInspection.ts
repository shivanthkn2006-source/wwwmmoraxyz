import { useSyncExternalStore } from 'react';
import { getVRView, orbit } from '@/lib/vrView';
import { getWorldState } from '@/worlds/worldMode';
import { chase, approachAngle } from '@/lib/vrChaseCam';
import { avatarMotion } from '@/lib/vrAvatarMotion';

let active = false;
let returning = false;
const listeners = new Set<() => void>();
export const inspectionActive = () => active;
export const useInspection = () => useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, inspectionActive, () => false);
export function toggleInspection() {
  const view = getVRView();
  if (getWorldState().mode !== 'mmora' || !view.thirdPerson || view.face) return;
  active = !active;
  returning = !active;
  if (returning) chase.targetYaw = avatarMotion.bodyYaw;
  listeners.forEach((l) => l());
}
export function resetInspection() {
  active = false; returning = false; listeners.forEach((l) => l());
}
/** Smooth only the existing lift; yaw already uses the game's angular damping. */
export function returnInspectionLift(dt: number) {
  if (!returning) return;
  orbit.lift = approachAngle(orbit.lift, 0, 10, Math.min(dt, 0.05));
  if (Math.abs(orbit.lift) < 0.001) { orbit.lift = 0; returning = false; }
}