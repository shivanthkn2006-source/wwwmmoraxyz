/** Puts the player back on the street if the camera position breaks (NaN/Infinity). */
import { useFrame, useThree } from '@react-three/fiber';

export const watchdogStats = { rescues: 0, lastOkAt: 0 };
export const isBrokenPos = (x: number, y: number, z: number) => ![x, y, z].every(Number.isFinite) || Math.abs(x) > 1e6 || Math.abs(z) > 1e6;

export const AvatarWatchdog: React.FC = () => {
  const { camera } = useThree();
  useFrame(() => {
    const p = camera.position;
    if (isBrokenPos(p.x, p.y, p.z)) {
      watchdogStats.rescues++;
      p.set(0, 1.6, 0);
      window.dispatchEvent(new CustomEvent('vr-teleport', { detail: { position: [0, 1.6, 0], lockGround: true } }));
    } else watchdogStats.lastOkAt = Date.now();
  });
  return null;
};
export default AvatarWatchdog;
