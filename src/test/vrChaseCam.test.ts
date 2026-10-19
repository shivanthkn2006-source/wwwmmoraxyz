import { describe, it, expect } from 'vitest';
import { chaseMoveDir, approachAngle, yawOf } from '@/lib/vrChaseCam';

describe('village chase camera', () => {
  it('forward walks where the camera faces', () => {
    const [x, z] = chaseMoveDir(1.1, { forward: true, backward: false, left: false, right: false })!;
    expect(x).toBeCloseTo(-Math.sin(1.1)); expect(z).toBeCloseTo(-Math.cos(1.1));
  });
  it('right strafes instead of turning, back walks toward the camera', () => {
    const [x, z] = chaseMoveDir(0, { forward: false, backward: false, left: false, right: true })!;
    expect(x).toBeCloseTo(1); expect(z).toBeCloseTo(0);
    const [bx, bz] = chaseMoveDir(0, { forward: false, backward: true, left: false, right: false })!;
    expect(bx).toBeCloseTo(0); expect(bz).toBeCloseTo(1);
  });
  it('no input means no movement', () => {
    expect(chaseMoveDir(0.4, { forward: false, backward: false, left: false, right: false })).toBeNull();
  });
  it('camera eases toward the look target the short way round', () => {
    const a = approachAngle(3.0, -3.0, 10, 0.016);
    expect(a).toBeGreaterThan(3.0);
    expect(yawOf(-Math.sin(0.7), -Math.cos(0.7))).toBeCloseTo(0.7);
  });
});

import { addOrbitLift, orbit, clampZoomFov, ORBIT_LIFT_MIN, ORBIT_LIFT_MAX } from '@/lib/vrView';
describe('village camera orbit + zoom limits', () => {
  it('up/down orbit stays between the floor and overhead limits', () => {
    expect(addOrbitLift(-10)).toBe(ORBIT_LIFT_MIN); expect(addOrbitLift(10)).toBe(ORBIT_LIFT_MAX);
    orbit.lift = 0;
  });
  it('zoom stays between 50° and 75° lens', () => {
    expect(clampZoomFov(10)).toBe(50); expect(clampZoomFov(120)).toBe(75);
  });
});
