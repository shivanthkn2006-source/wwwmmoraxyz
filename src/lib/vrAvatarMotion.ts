/** Visual telemetry only. Never moves the player or writes game progress. */
export type VillagePose = 'idle' | 'walking' | 'running' | 'jumping' | 'climbing' | 'sitting';
export const avatarMotion = { pose: 'idle' as VillagePose, seated: null as null | { x: number; z: number; yaw: number }, attackAt: -Infinity, headPitch: 0, bodyYaw: 0 };
export function movementPose(speed: number, running: boolean, airborne: boolean, steppedUp: boolean): VillagePose {
  if (airborne) return 'jumping';
  if (speed > 0.3 && steppedUp) return 'climbing';
  return speed > 0.3 ? running ? 'running' : 'walking' : 'idle';
}