/**
 * Round, rotating mini-map (GTA style): your arrow always points forward and
 * the map turns as you turn, with N/E/S/W on the ring. Real Map shows the real
 * roads around you; M'Mora World shows houses, herbs and coins, and the edge
 * marker points to the nearest thing to pick up. Herb and coin counts sit below.
 */
import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getWorldState } from '@/worlds/worldMode';
import { mapBlocks } from '@/worlds/realmap/mapIndex';
import { toLocal } from '@/worlds/realmap/geo';
import { HOUSES, ALL_PICKUPS } from '@/worlds/mmora/PickupHouses';
import { usePickups, getPickups, useHerb, autoHerbIfDry } from '@/lib/vrPickups';

const pose = { x: 0, z: 0, yaw: 0 };
const e = new THREE.Euler();
/** Inside the 3D scene: copies where you stand and face for the map. */
export const VRPoseTicker: React.FC = () => {
  const { camera } = useThree();
  const t = useRef(0);
  useFrame((_, dt) => {
    pose.x = camera.position.x; pose.z = camera.position.z;
    pose.yaw = e.setFromQuaternion(camera.quaternion, 'YXZ').y;
    t.current += dt; if (t.current > 0.5) { t.current = 0; autoHerbIfDry(); }
  });
  return null;
};

const SIZE = 112, R = SIZE / 2, RANGE = 120; // metres from centre to edge

export const VRMiniMap: React.FC<{ onToast?: (s: string) => void }> = ({ onToast }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const p = usePickups();
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = SIZE * dpr; cv.height = SIZE * dpr;
    const g = cv.getContext('2d'); if (!g) return;
    const k = R / RANGE;
    const draw = () => {
      const w = getWorldState();
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, SIZE, SIZE);
      g.save();
      g.beginPath(); g.arc(R, R, R - 3, 0, Math.PI * 2); g.clip();
      const bg = g.createRadialGradient(R, R * 0.6, 4, R, R, R); bg.addColorStop(0, 'rgba(255,255,255,0.28)'); bg.addColorStop(1, 'rgba(255,255,255,0.10)'); g.fillStyle = bg; g.fillRect(0, 0, SIZE, SIZE);
      g.translate(R, R); g.rotate(pose.yaw);
      const P = (x: number, z: number) => [(x - pose.x) * k, (z - pose.z) * k] as const;
      if (w.mode === 'real' && w.origin.status === 'ready') {
        const o = w.origin.origin;
        g.strokeStyle = 'rgba(255,255,255,0.95)'; g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 2; g.lineCap = 'round';
        mapBlocks().forEach((b) => b.roads.forEach((r) => {
          g.lineWidth = Math.max(1, r.w * k * 0.9); g.beginPath();
          r.pts.forEach(([la, ln], i) => { const q = toLocal({ lat: la, lng: ln }, o); const [sx, sy] = P(q.x, q.z); if (i) g.lineTo(sx, sy); else g.moveTo(sx, sy); });
          g.stroke();
        }));
        g.fillStyle = '#e0a84a';
        mapBlocks().forEach((b) => b.pois.forEach((q) => { const l = toLocal(q, o); const [sx, sy] = P(l.x, l.z); if (Math.hypot(sx, sy) < R) { g.beginPath(); g.arc(sx, sy, 2, 0, 7); g.fill(); } }));
      } else {
        g.fillStyle = 'rgba(160,150,135,0.9)';
        HOUSES.forEach(([x, z]) => { const [sx, sy] = P(x, z); g.fillRect(sx - 5 * k * 1.2, sy - 5 * k * 1.2, 10 * k * 1.2, 10 * k * 1.2); });
        const taken = getPickups().taken;
        ALL_PICKUPS.forEach((q) => { if (taken.includes(q.id)) return; const [sx, sy] = P(q.pos[0], q.pos[2]); g.fillStyle = q.kind === 'herb' ? '#5fb04a' : '#e3c15a'; g.beginPath(); g.arc(sx, sy, 2.4, 0, 7); g.fill(); });
      }
      g.restore();
      // Guide marker to nearest pickup (M'Mora World)
      if (w.mode === 'mmora') {
        const taken = getPickups().taken; let best: [number, number] | null = null, bd = Infinity;
        ALL_PICKUPS.forEach((q) => { if (taken.includes(q.id)) return; const d = Math.hypot(q.pos[0] - pose.x, q.pos[2] - pose.z); if (d < bd) { bd = d; best = [q.pos[0] - pose.x, q.pos[2] - pose.z]; } });
        if (best && bd * k > R - 10) {
          const [dx, dz] = best as [number, number];
          const c = Math.cos(pose.yaw), s = Math.sin(pose.yaw);
          const a = Math.atan2(dx * s + dz * c, dx * c - dz * s);
          g.fillStyle = '#5fb04a'; g.beginPath(); g.arc(R + Math.cos(a) * (R - 9), R + Math.sin(a) * (R - 9), 4, 0, 7); g.fill();
        }
      }
      // Ring + compass letters (rotate with the map)
      g.strokeStyle = 'rgba(240,236,225,0.9)'; g.lineWidth = 3; g.beginPath(); g.arc(R, R, R - 2, 0, 7); g.stroke();
      g.font = 'bold 10px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
      ([['N', 0], ['E', Math.PI / 2], ['S', Math.PI], ['W', -Math.PI / 2]] as const).forEach(([l, a]) => {
        const ang = a + pose.yaw - Math.PI / 2;
        const x = R + Math.cos(ang) * (R - 10), y = R + Math.sin(ang) * (R - 10);
        g.fillStyle = l === 'N' ? '#e3c15a' : '#f0ece1'; g.fillText(l, x, y);
      });
      // Player arrow (fixed, pointing forward)
      g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(R, R - 8); g.lineTo(R + 6, R + 6); g.lineTo(R, R + 2); g.lineTo(R - 6, R + 6); g.closePath(); g.fill(); g.stroke();
    };
    const t = window.setInterval(draw, 100);
    draw();
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="pointer-events-auto absolute right-3 top-40 flex flex-col items-center gap-1" data-exclude-phantom-tap data-testid="vr-minimap">
      <canvas ref={ref} style={{ width: SIZE, height: SIZE }} className="rounded-full border border-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_6px_20px_rgba(0,0,0,0.25)]" aria-label="Mini map" />
      <div className="flex gap-2 text-[11px] font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
        <button type="button" aria-label="Use a green herb" onClick={() => onToast?.(useHerb())} className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#5fb04a' }} />×{p.herbs}
        </button>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#e3c15a' }} />×{p.coins}</span>
      </div>
    </div>
  );
};
export default VRMiniMap;
