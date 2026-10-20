/**
 * Real 3D models for every item that goes into the avatar's hands.
 * Weapon frame: +X muzzle/blade forward, +Y up, origin = where the right palm
 * grips. Models load only when equipped (never preloaded) and fall back to
 * nothing (never a loose box) if a file can't load.
 * Sources (CC0): W-870 (MikeMoon), Poly Haven service_pistol,
 * bolt_action_rifle_7_62, ornate_medieval_dagger; Pichuliru "Flat Grenades".
 */
import React, { Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { W870_GRIP_OFFSET, type HeldWeapon } from '@/lib/vrWeaponGrip';
import { W870Model } from './W870Model';
import pistol from '@/assets/models/service-pistol.glb.asset.json';
import rifle from '@/assets/models/bolt-rifle.glb.asset.json';
import knife from '@/assets/models/combat-knife.glb.asset.json';
import frag from '@/assets/models/grenade-frag.glb.asset.json';
import flash from '@/assets/models/grenade-flash.glb.asset.json';
import incendiary from '@/assets/models/grenade-incendiary.glb.asset.json';
import smoke from '@/assets/models/grenade-smoke.glb.asset.json';

type Prop = { url: string; hide?: RegExp; pos: [number, number, number]; rot?: [number, number, number]; tint?: string };
/** Grip offsets measured from each source file's own part layout. */
export const PROPS: Record<string, Prop> = {
  // Wood-grip variant (part set "a"); spare variant, loose magazines and bullet hidden.
  pistol: { url: pistol.url, hide: /_b$|magazine|bullet/, pos: [0.025, 0.005, 0] },
  boltrifle: { url: rifle.url, hide: /bullet|bolt_b/, pos: [0.33, 0.035, 0] },
  // Dagger stands blade-up in its file: turn blade forward, scabbard hidden.
  knife: { url: knife.url, hide: /scabbard/, pos: [0, 0, 0], rot: [0, 0, -Math.PI / 2] },
  fraggrenade: { url: frag.url, pos: [0, -0.02, 0], tint: '#4b5320' },
  flashgrenade: { url: flash.url, pos: [0, -0.01, 0] },
  incgrenade: { url: incendiary.url, pos: [0, -0.01, 0], tint: '#8e1a14' },
  smokegrenade: { url: smoke.url, pos: [0, -0.01, 0] },
};
PROPS.sentinel9 = PROPS.pistol;
PROPS.shockgrenade = PROPS.flashgrenade;

class Boundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

function PropMesh({ p }: { p: Prop }) {
  const { scene } = useGLTF(p.url);
  const obj = useMemo(() => {
    const c = scene.clone(true);
    const drop: THREE.Object3D[] = [];
    c.traverse((n) => {
      if (n !== c && p.hide?.test(n.name)) drop.push(n);
      if (n instanceof THREE.Mesh) {
        n.castShadow = true; n.frustumCulled = false;
        // Grenade body tint (olive frag, crimson incendiary); bands/levers keep their colour.
        if (p.tint) {
          const mats = (Array.isArray(n.material) ? n.material : [n.material]).map((m: THREE.Material) => {
            const s = m as THREE.MeshStandardMaterial;
            if (!/Black_Lighter/.test(s.name)) return s;
            const t = s.clone(); t.color = new THREE.Color(p.tint); t.roughness = 0.75; return t;
          });
          n.material = Array.isArray(n.material) ? mats : mats[0];
        }
      }
    });
    drop.forEach((n) => n.removeFromParent());
    return c;
  }, [scene, p]);
  // Knife: handle centre (y≈-0.03 in the source) goes to the palm before the turn.
  return <group rotation={p.rot ?? [0, 0, 0]}><group position={p.pos}><primitive object={obj} /></group></group>;
}

export function HeldWeaponModel({ weapon }: { weapon: HeldWeapon | string }) {
  if (weapon === 'w870' || weapon === 'shotgun') return <group position={W870_GRIP_OFFSET}><W870Model /></group>;
  const p = PROPS[weapon];
  if (!p) return null;
  const prop = weapon === 'knife' ? { ...p, pos: [0, 0.03, 0] as [number, number, number] } : p;
  return <Boundary><Suspense fallback={null}><PropMesh p={prop} /></Suspense></Boundary>;
}
export const hasHeldModel = (id: string) => id === 'w870' || id === 'shotgun' || !!PROPS[id];
