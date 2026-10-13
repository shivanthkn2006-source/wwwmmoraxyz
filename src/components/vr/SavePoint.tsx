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
    window.addEventListener('vr-damage', onDamage);
    emit();
    return () => window.removeEventListener('vr-damage', onDamage);
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
    </div>
  );
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
