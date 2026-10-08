/**
 * Round, rotating mini-map (GTA style): your arrow always points forward and
 * the map turns as you turn, with N/E/S/W on the ring. Real Map shows the real
 * roads around you; M'Mora Village shows houses, herbs and coins, and the edge
 * marker points to the nearest thing to pick up. Herb and coin counts sit below.
 */
import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getWorldState } from '@/worlds/worldMode';
import { mapBlocks } from '@/worlds/realmap/mapIndex';
import { toLocal } from '@/worlds/realmap/geo';
import { HOUSES, ALL_PICKUPS } from '@/worlds/mmora/PickupHouses';
import { nearestStreet } from '@/worlds/realmap/ZoeStreetAwareness';
import { setAmbientExtra } from '@/services/zoe-agent/ambientContext';
import { getStreetHouses } from '@/worlds/realmap/StreetHouses';
import { getStreetRelics } from '@/worlds/realmap/streetRelics';
import { useMapPrefs, setMapPrefs } from '@/lib/vrMapPrefs';
import { useStamina } from '@/lib/vrWalk';
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

// Exploration: 50 m squares you have walked through, per city/place, saved on this device.
const CELL = 50, GOAL = 150;
const exKey = (label: string) => `vr-explored:${label}`;
const readEx = (label: string): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(exKey(label)) || '[]')); } catch { return new Set(); } };


/** Rounded square path (works on older Safari without roundRect). */
const rr = (g: CanvasRenderingContext2D, x: number, y: number, s: number, r: number) => { g.moveTo(x + r, y); g.arcTo(x + s, y, x + s, y + s, r); g.arcTo(x + s, y + s, x, y + s, r); g.arcTo(x, y + s, x, y, r); g.arcTo(x, y, x + s, y, r); g.closePath(); };

const RELIC_COLORS: Record<string, string> = { common: '#9fd8ff', uncommon: '#7ee0a8', rare: '#5aa2ff', epic: '#c58bff', legendary: '#ffd166' };

/** The drawn map itself; used for the small rotating map and the big half-screen map. */
const MapCanvas: React.FC<{ SIZE: number; RANGE: number; names?: boolean; explored: React.MutableRefObject<number>; opacity: number; rect?: boolean }> = ({ SIZE, RANGE, names = false, explored, opacity, rect = false }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const R = SIZE / 2;
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
      g.beginPath(); if (rect) rr(g, 2, 2, SIZE - 4, 22); else g.arc(R, R, R - 3, 0, Math.PI * 2); g.clip();
      const bg = g.createRadialGradient(R, R * 0.6, 4, R, R, R); bg.addColorStop(0, 'rgba(255,255,255,0.28)'); bg.addColorStop(1, 'rgba(255,255,255,0.10)'); g.fillStyle = bg; g.fillRect(0, 0, SIZE, SIZE);
      g.translate(R, R); g.rotate(pose.yaw);
      const P = (x: number, z: number) => [(x - pose.x) * k, (z - pose.z) * k] as const;
      if (w.mode === 'real' && w.origin.status === 'ready') {
        const o = w.origin.origin;
        const poly = (pts: [number, number][]) => { g.beginPath(); pts.forEach(([la, ln], i) => { const q = toLocal({ lat: la, lng: ln }, o); const [sx, sy] = P(q.x, q.z); if (i) g.lineTo(sx, sy); else g.moveTo(sx, sy); }); };
        mapBlocks().forEach((b) => {
          (b.areas ?? []).forEach((a) => { g.fillStyle = a.kind === 'water' ? 'rgba(80,150,220,0.75)' : 'rgba(110,170,90,0.5)'; poly(a.pts); g.fill(); });
          (b.waterways ?? []).forEach((wy) => { g.strokeStyle = 'rgba(80,150,220,0.85)'; g.lineWidth = Math.max(1.5, wy.w * k); poly(wy.pts); g.stroke(); });
        });
        g.fillStyle = 'rgba(255,255,255,0.22)';
        mapBlocks().forEach((b) => b.buildings.forEach((bd) => {
          const q0 = toLocal({ lat: bd.pts[0][0], lng: bd.pts[0][1] }, o);
          if (Math.abs(q0.x - pose.x) > RANGE * 1.5 || Math.abs(q0.z - pose.z) > RANGE * 1.5) return;
          g.beginPath();
          bd.pts.forEach(([la, ln], i) => { const q = toLocal({ lat: la, lng: ln }, o); const [sx, sy] = P(q.x, q.z); if (i) g.lineTo(sx, sy); else g.moveTo(sx, sy); });
          g.fill();
        }));
        g.strokeStyle = 'rgba(255,255,255,0.95)'; g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 2; g.lineCap = 'round';
        mapBlocks().forEach((b) => b.roads.forEach((r) => {
          g.lineWidth = Math.max(1, r.w * k * 0.9); g.beginPath();
          r.pts.forEach(([la, ln], i) => { const q = toLocal({ lat: la, lng: ln }, o); const [sx, sy] = P(q.x, q.z); if (i) g.lineTo(sx, sy); else g.moveTo(sx, sy); });
          g.stroke();
        }));
        getStreetRelics().forEach((r) => { const l = toLocal(r, o); const [sx, sy] = P(l.x, l.z); g.fillStyle = RELIC_COLORS[r.rarity] ?? '#c58bff'; g.shadowColor = g.fillStyle; g.shadowBlur = 8; g.beginPath(); g.arc(sx, sy, 3.2, 0, 7); g.fill(); });
        g.shadowBlur = 0;
        const tk = getPickups().taken;
        getStreetHouses().forEach((h) => {
          const herb = h.herbId && !tk.includes(h.herbId), coin = h.coinId && !tk.includes(h.coinId);
          if (!herb && !coin) return;
          const [sx, sy] = P(h.cx, h.cz); g.fillStyle = herb ? '#5fb04a' : '#e3c15a'; g.shadowColor = g.fillStyle; g.shadowBlur = 10;
          g.beginPath(); g.arc(sx, sy, 3.6, 0, 7); g.fill(); g.shadowBlur = 0;
        });
        if (names) {
          g.save(); g.font = '600 10px system-ui'; g.textAlign = 'center'; g.fillStyle = '#ffffff';
          const seen = new Set<string>();
          mapBlocks().forEach((b) => b.roads.forEach((r) => {
            if (!r.name || seen.has(r.name)) return; const m = r.pts[Math.floor(r.pts.length / 2)]; const q = toLocal({ lat: m[0], lng: m[1] }, o); const [sx, sy] = P(q.x, q.z);
            if (Math.hypot(sx, sy) > R - 14) return; seen.add(r.name);
            g.save(); g.translate(sx, sy); g.rotate(-pose.yaw); g.fillStyle = 'rgba(0,0,0,0.75)'; const tw = g.measureText(r.name).width + 6; g.fillRect(-tw / 2, -7, tw, 12); g.fillStyle = '#ffffff'; g.fillText(r.name, 0, 3); g.restore();
          }));
          g.restore();
        }
        g.fillStyle = '#e0a84a';
        mapBlocks().forEach((b) => b.pois.forEach((q) => { const l = toLocal(q, o); const [sx, sy] = P(l.x, l.z); if (Math.hypot(sx, sy) < R) { g.beginPath(); g.arc(sx, sy, 2, 0, 7); g.fill(); } }));
      } else {
        const taken = getPickups().taken;
        HOUSES.forEach(([x, z], i) => {
          const [sx, sy] = P(x, z); const hw = 5 * k * 1.2;
          const herb = !taken.includes(`house${i}-herb`), coin = !taken.includes(`house${i}-coin`);
          g.shadowBlur = herb || coin ? 10 : 0; g.shadowColor = herb ? '#5fb04a' : '#e3c15a';
          g.fillStyle = 'rgba(210,200,185,0.9)'; g.fillRect(sx - hw, sy - hw, hw * 2, hw * 2); g.shadowBlur = 0;
        });
        ALL_PICKUPS.forEach((q) => { if (taken.includes(q.id)) return; const [sx, sy] = P(q.pos[0], q.pos[2]); g.fillStyle = q.kind === 'herb' ? '#5fb04a' : '#e3c15a'; g.beginPath(); g.arc(sx, sy, 2.4, 0, 7); g.fill(); });
      }
      g.restore();
      // Guide marker to nearest pickup (M'Mora Village)
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
      g.strokeStyle = 'rgba(240,236,225,0.9)'; g.lineWidth = 3; g.beginPath(); if (rect) rr(g, 1.5, 1.5, SIZE - 3, 22); else g.arc(R, R, R - 2, 0, 7); g.stroke();
      const frac = Math.min(1, explored.current / GOAL);
      g.strokeStyle = '#5fb04a'; g.lineWidth = 3; g.lineCap = 'round';
      if (frac > 0 && !rect) { g.beginPath(); g.arc(R, R, R - 2, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); g.stroke(); }
      g.font = 'bold 10px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
      ([['N', 0], ['E', Math.PI / 2], ['S', Math.PI], ['W', -Math.PI / 2]] as const).forEach(([l, a]) => {
        const ang = a + pose.yaw - Math.PI / 2;
        const x = R + Math.cos(ang) * (R - 10), y = R + Math.sin(ang) * (R - 10);
        g.fillStyle = l === 'N' ? '#e3c15a' : '#f0ece1'; g.fillText(l, x, y);
      });
      // Player arrow (fixed, pointing forward)
      const A = rect ? 1.6 : 1.25;
      g.fillStyle = '#387BF6'; g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; g.shadowColor = 'rgba(56,123,246,0.8)'; g.shadowBlur = 6;
      g.beginPath(); g.moveTo(R, R - 9 * A); g.lineTo(R + 7 * A, R + 7 * A); g.lineTo(R, R + 2.5 * A); g.lineTo(R - 7 * A, R + 7 * A); g.closePath(); g.fill(); g.stroke(); g.shadowBlur = 0;
    };
    const t = window.setInterval(draw, 100);
    draw();
    return () => window.clearInterval(t);
  }, [SIZE, RANGE, names]);
  return <canvas ref={ref} style={{ width: SIZE, height: SIZE, opacity }} className={`${rect ? "rounded-[22px]" : "rounded-full"} border border-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_6px_20px_rgba(0,0,0,0.25)]`} aria-label="Mini map" />;
};

export const VRMiniMap: React.FC<{ onToast?: (s: string) => void }> = ({ onToast }) => {
  const p = usePickups();
  const prefs = useMapPrefs();
  const sta = useStamina();
  const [street, setStreet] = React.useState<string | null>(null);
  const [explored, setExplored] = React.useState(0);
  useEffect(() => {
    let label = '', cells = new Set<string>();
    const t = window.setInterval(() => {
      const w = getWorldState();
      if (w.origin.status !== 'ready') return;
      const l = w.mode === 'real' ? (w.origin.label || `${w.origin.origin.lat.toFixed(2)},${w.origin.origin.lng.toFixed(2)}`) : "M'Mora Village";
      if (l !== label || cells.size === 0) { label = l; cells = readEx(l); }
      const id = `${Math.round(pose.x / CELL)},${Math.round(pose.z / CELL)}`;
      if (!cells.has(id)) { cells.add(id); try { localStorage.setItem(exKey(l), JSON.stringify([...cells].slice(-5000))); window.dispatchEvent(new Event('vr-explore-changed')); } catch { /* */ } }
      setExplored(cells.size);
      const st = w.mode === 'real' ? nearestStreet(pose.x, pose.z, w.origin.origin) : null;
      setStreet(st);
      setAmbientExtra('VR explored', `${Math.min(100, Math.round((cells.size / GOAL) * 100))}% of ${l} (${cells.size}/${GOAL} areas)`);
    }, 1000);
    return () => window.clearInterval(t);
  }, []);
  const exploredRef = useRef(0); exploredRef.current = explored;

  return (
    <>
    <div className={`pointer-events-auto absolute right-2 top-2 z-[9997] flex flex-col items-center gap-1 ${prefs.big ? 'invisible' : ''}`} aria-hidden={prefs.big} data-exclude-phantom-tap data-testid="vr-minimap">
      <button type="button" aria-label="Open big map" onClick={() => setMapPrefs({ big: true })} className="rounded-full">
        <MapCanvas SIZE={Math.min(prefs.size === 'large' ? 168 : 136, typeof window !== 'undefined' && window.innerHeight < 520 ? Math.round(window.innerHeight * 0.2) : 999)} RANGE={130} explored={exploredRef} opacity={prefs.opacity} />
      </button>
      {street && <div className="max-w-[9rem] truncate text-center text-[11px] font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]" data-testid="vr-minimap-street">{street}</div>}
      <div className="text-[10px] font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]" aria-label="Explored">{Math.min(100, Math.round((explored / GOAL) * 100))}% explored · goal {GOAL}</div>
      <div className="flex items-center gap-1 text-[10px] font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]" role="meter" aria-label="Stamina" aria-valuenow={Math.round(sta.stamina * 100)}>
        Stamina <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/25"><span className="block h-full rounded-full" style={{ width: `${Math.round(sta.stamina * 100)}%`, background: sta.exhausted ? '#e5534b' : '#5fb04a' }} /></span>
      </div>
      <div className="flex gap-2 text-[11px] font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
        <button type="button" aria-label="Use a green herb" onClick={() => onToast?.(useHerb())} className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#5fb04a' }} />×{p.herbs}
        </button>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#e3c15a' }} />×{p.coins}</span>
      </div>
    </div>
    {prefs.big && (
      <>
      <div className="pointer-events-auto fixed inset-0 z-[9998]" aria-hidden onClick={() => setMapPrefs({ big: false })} />
      <div className="pointer-events-auto fixed right-2 top-2 z-[9999]" data-exclude-phantom-tap data-testid="vr-big-map">
        <button type="button" aria-label="Close big map" onClick={() => setMapPrefs({ big: false })}
          className="absolute right-1 top-1 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-base font-bold text-white">✕</button>
        <div className="flex flex-col items-center gap-2">
          <MapCanvas rect SIZE={Math.min((prefs.size === 'large' ? 168 : 136) * 2, Math.round(Math.min(window.innerWidth * 0.9, window.innerHeight - 70)))} RANGE={300} names explored={exploredRef} opacity={prefs.bigOpacity} />
          <label className="flex items-center gap-2 text-[11px] font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">Opacity
            <input type="range" min={30} max={100} step={5} value={Math.round(prefs.bigOpacity * 100)} onChange={(e) => setMapPrefs({ bigOpacity: +e.target.value / 100 })} aria-label="Big map opacity" />
          </label>
          <div className="flex gap-3 text-[11px] font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
            <span style={{ color: '#5fb04a' }}>● herbs</span><span style={{ color: '#e3c15a' }}>● coins</span><span style={{ color: '#c58bff' }}>● relics</span><span style={{ color: '#5096dc' }}>● water</span><span style={{ color: '#387BF6' }}>▲ you</span>
          </div>
        </div>
      </div>
      </>
    )}
    </>
  );
};
export default VRMiniMap;
