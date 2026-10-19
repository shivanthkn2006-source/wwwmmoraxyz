/**
 * Village chase-view zoom: mouse wheel and two-finger pinch narrow/widen the
 * lens within limits. Only active in the village third-person view.
 */
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getVRView, clampZoomFov, ZOOM_FOV_MAX } from '@/lib/vrView';
import { getWorldState } from '@/worlds/worldMode';

const active = () => { const v = getVRView(); return getWorldState().mode === 'mmora' && v.thirdPerson && !v.face; };

export function VRChaseZoom() {
  const { camera, gl } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (!cam.isPerspectiveCamera) return;
    const el = gl.domElement;
    const setFov = (f: number) => { cam.fov = clampZoomFov(f); cam.updateProjectionMatrix(); };
    const onWheel = (e: WheelEvent) => {
      if (!active()) return;
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      setFov(cam.fov * Math.exp(dy * 0.0015));
    };
    let pinch = 0;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onStart = (e: TouchEvent) => { pinch = e.touches.length === 2 ? dist(e.touches) : 0; };
    const onMove = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2 || !active()) return;
      const d = dist(e.touches); setFov(cam.fov * (pinch / d)); pinch = d;
    };
    const onEnd = () => { pinch = 0; };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd);
    return () => {
      el.removeEventListener('wheel', onWheel); el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove); el.removeEventListener('touchend', onEnd);
      if (cam.fov < ZOOM_FOV_MAX) setFov(ZOOM_FOV_MAX);
    };
  }, [camera, gl]);
  return null;
}
