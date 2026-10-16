/** Saves where you are in VR World every 4 s and when you leave (inside the 3D scene). */
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getWorldState, isStartSettled } from '@/worlds/worldMode';
import { writeSave } from '@/lib/vrSaveGame';
import { pushCloud } from '@/lib/vrPickups';

export const VRSaveGameTicker: React.FC = () => {
  const { camera } = useThree();
  useEffect(() => {
    const save = () => {
      const w = getWorldState();
      if (!isStartSettled() || w.origin.status !== 'ready' || w.aerial) return;
      const p = camera.position;
      if (!Number.isFinite(p.x) || p.y > 20) return; // never save mid-air
      const yaw = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').y;
      writeSave({ mode: w.mode, origin: { ...w.origin.origin, label: w.origin.label }, pos: [p.x, p.y, p.z], yaw, realPos: w.savedRealPos });
    };
    const flush = () => { save(); void pushCloud(); void import('@/lib/vrGear').then((m) => m.saveProgressNow()); };
    const t = setInterval(flush, 4000);
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    const now = flush;
    window.addEventListener('vr-save-now', now);
    return () => { flush(); clearInterval(t); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', flush); window.removeEventListener('vr-save-now', now); };
  }, [camera]);
  return null;
};
