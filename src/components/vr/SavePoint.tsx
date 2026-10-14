import { MerchantShop } from './VRMerchantShop';
import { Euler } from 'three';
import { getVRView } from '@/lib/vrView';
import { useAmmo, usesAmmo, isReloading, condition } from '@/lib/vrAmmo';
import { useEquipped } from '@/lib/vrGear';
import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

/** M'Mora World save point beside the return doorway, health and respawn. */
const SAVE_POS: [number, number, number] = [3, 0, 6];
const MAX_HP = 100;
let hp = MAX_HP;
const emit = () => window.dispatchEvent(new CustomEvent('vr-health', { detail: { hp } }));

export const SavePoint: React.FC<{ position?: [number, number, number] }> = ({ position = SAVE_POS }) => {
  const { camera } = useThree();
  const ring = useRef<any>(null);
  const lastY = useRef(camera.position.y);
  const fallStart = useRef<number | null>(null);

  const respawn = () => {
    hp = MAX_HP; emit();
    window.dispatchEvent(new CustomEvent('vr-teleport', {
      detail: { position: [position[0], 1.6, position[2] + 2], lockGround: true },
    }));
  };

  useEffect(() => {
    const onDamage = (e: Event) => {
      hp = Math.min(MAX_HP, Math.max(0, hp - ((e as CustomEvent).detail?.amount ?? 10))); emit();
      if (hp <= 0) setTimeout(respawn, 800);
    };
    const onHeal = (e: Event) => { hp = Math.min(MAX_HP, hp + ((e as CustomEvent).detail?.amount ?? 20)); emit(); };
    window.addEventListener('vr-damage', onDamage);
    window.addEventListener('vr-heal', onHeal);
    emit();
    return () => { window.removeEventListener('vr-damage', onDamage); window.removeEventListener('vr-heal', onHeal); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    if (ring.current) ring.current.rotation.z += dt;
    const p = camera.position;
    // Fell off the world → lose health and respawn at the save point.
    if (p.y < -15) { hp = Math.max(0, hp - 34); emit(); respawn(); return; }
    // Long fall damage.
    if (p.y < lastY.current - 0.05) fallStart.current ??= lastY.current;
    else if (fallStart.current !== null) {
      const drop = fallStart.current - p.y;
      fallStart.current = null;
      if (drop > 8) window.dispatchEvent(new CustomEvent('vr-damage', { detail: { amount: Math.round(drop * 3) } }));
    }
    lastY.current = p.y;
    // Standing at the save point heals.
    const dx = p.x - position[0], dz = p.z - position[2];
    if (dx * dx + dz * dz < 4 && hp < MAX_HP) { hp = Math.min(MAX_HP, hp + 20 * dt); emit(); }
  });

  return (
    <group position={position}>
      <HealShell />
      <mesh ref={ring} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.3, 32]} />
        <meshBasicMaterial color="#387BF6" transparent opacity={0.7} />
      </mesh>
      <pointLight position={[0, 1.5, 0]} color="#9cc0ff" intensity={1.2} distance={6} />
    </group>
  );
};

export const HealthBar: React.FC = () => {
  const [v, setV] = useState(MAX_HP);
  useEffect(() => {
    const on = (e: Event) => setV((e as CustomEvent).detail.hp);
    window.addEventListener('vr-health', on);
    return () => window.removeEventListener('vr-health', on);
  }, []);
  return (
    <div className="pointer-events-none fixed left-1/2 top-3 z-20 w-32 -translate-x-1/2" aria-label={`Health ${Math.round(v)}`}>
      <div className="h-1.5 overflow-hidden rounded-full bg-background/40">
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${v}%` }} />
      </div>
      <SurvivalLine hp={v} />
      <HealVignette />
      <MerchantShop />
    </div>
  );
};

/** Green (or gold) glow around the screen edge while a herb heals — seen in first person too. */
const HealVignette: React.FC = () => {
  const [on, setOn] = useState<null | boolean>(null);
  useEffect(() => {
    let t = 0;
    const f = (e: Event) => { setOn(!!(e as CustomEvent).detail?.gold); window.clearTimeout(t); t = window.setTimeout(() => setOn(null), 1600); };
    window.addEventListener('vr-heal-glow', f); return () => { window.removeEventListener('vr-heal-glow', f); window.clearTimeout(t); };
  }, []);
  if (on === null) return null;
  return <div data-testid="vr-heal-glow" className="pointer-events-none fixed inset-0 animate-pulse" style={{ boxShadow: `inset 0 0 60px 12px ${on ? 'hsl(45 95% 55% / .55)' : 'hsl(120 85% 50% / .5)'}` }} />;
};

/** Condition (Fine / Caution / Danger) and the equipped gun's rounds, under the health bar. */
const SurvivalLine: React.FC<{ hp: number }> = ({ hp }) => {
  const ammo = useAmmo(); const eq = useEquipped();
  const gun = eq.find((id) => usesAmmo(id));
  const a = gun ? ammo[gun] : null;
  return (
    <div className="mt-0.5 flex justify-between text-[10px] italic leading-none text-foreground" style={{ textShadow: '0 1px 2px hsl(0 0% 0% / .7)' }}>
      <span data-testid="vr-condition">{condition(hp)}</span>
      {a && <span data-testid="vr-ammo">{isReloading() ? 'Reloading…' : `${a.inMag} / ${a.reserve}`}</span>}
    </div>
  );
};

/** Outline glow around the player's body (third person: the avatar 2.8 m ahead). */
const _eu = new Euler();
const HealShell: React.FC = () => {
  const { camera } = useThree();
  const ref = useRef<any>(null);
  const until = useRef(0); const gold = useRef(false);
  useEffect(() => { const f = (e: Event) => { until.current = performance.now() + 1600; gold.current = !!(e as CustomEvent).detail?.gold; }; window.addEventListener('vr-heal-glow', f); return () => window.removeEventListener('vr-heal-glow', f); }, []);
  useFrame(() => {
    const m = ref.current; if (!m) return;
    const left = until.current - performance.now();
    m.visible = left > 0 && getVRView().thirdPerson; if (!m.visible) return;
    const yaw = _eu.setFromQuaternion(camera.quaternion, 'YXZ').y;
    const parent = m.parent; const px = parent?.position.x ?? 0, pz = parent?.position.z ?? 0;
    m.position.set(camera.position.x - Math.sin(yaw) * 2.8 - px, 0.9, camera.position.z - Math.cos(yaw) * 2.8 - pz);
    m.material.color.set(gold.current ? '#ffd24a' : '#3dff5a');
    m.material.opacity = 0.35 * Math.min(1, left / 600);
  });
  return <mesh ref={ref} visible={false}><capsuleGeometry args={[0.42, 1.1, 4, 12]} /><meshBasicMaterial transparent side={2} depthWrite={false} opacity={0.35} /></mesh>;
};
