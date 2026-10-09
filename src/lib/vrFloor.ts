/**
 * Upper floors in M'Mora Village buildings: each building registers a
 * floorAt(x, z, eyeY) that returns the floor height under the player (stairs
 * ramp up, upper storeys hold you). The walk step keeps the eye 1.6 m above it.
 */
type Floor = (x: number, z: number, eyeY: number) => number;
const floors = new Set<Floor>();
export function registerFloor(f: Floor) { floors.add(f); return () => { floors.delete(f); }; }
export function floorAt(x: number, z: number, eyeY: number): number {
  let h = 0;
  for (const f of floors) { try { h = Math.max(h, f(x, z, eyeY)); } catch { /* */ } }
  return h;
}
