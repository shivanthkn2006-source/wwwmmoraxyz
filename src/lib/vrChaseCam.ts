/**
 * Village third-person chase camera. The avatar's body is the player; the
 * camera hangs on a fixed arm (AVATAR_AHEAD behind, unchanged height) and only
 * swings round when you look. Movement is relative to where the camera faces.
 * The camera always stays exactly AVATAR_AHEAD behind the body, so systems that
 * read "camera + forward × AVATAR_AHEAD" still find the avatar.
 */
export const chase = { targetYaw: null as number | null };
export const CAM_YAW_DAMP = 10;   // camera eases toward the look target
export const BODY_TURN_DAMP = 12; // body turns toward the walk direction

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** Frame-rate-independent ease of angle `cur` toward `target` along the short way. */
export function approachAngle(cur: number, target: number, k: number, dt: number) {
  return cur + wrap(target - cur) * (1 - Math.exp(-k * dt));
}
/** World walk direction (unit x,z) for camera-relative input, or null when idle. Forward = (-sin yaw, -cos yaw). */
export function chaseMoveDir(camYaw: number, i: { forward: boolean; backward: boolean; left: boolean; right: boolean }): [number, number] | null {
  const f = (i.forward ? 1 : 0) - (i.backward ? 1 : 0), s = (i.right ? 1 : 0) - (i.left ? 1 : 0);
  if (!f && !s) return null;
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
  const x = fx * f + rx * s, z = fz * f + rz * s, l = Math.hypot(x, z);
  return [x / l, z / l];
}
/** Yaw that faces world direction (x,z), same convention as the camera. */
export const yawOf = (x: number, z: number) => Math.atan2(-x, -z);
