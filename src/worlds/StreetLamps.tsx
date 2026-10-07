/**
 * Street lamps for every VR world: one instanced mesh per part (pole, glowing
 * head, warm light pool on the ground), so hundreds of lamps cost 3 batches.
 * They switch on 17:00–05:50 on the member's clock (src/lib/vrLights.ts).
 */
import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { registerLit, registerToggle } from '@/lib/vrLights';

const POLE = new THREE.CylinderGeometry(0.06, 0.09, 5, 6); POLE.translate(0, 2.5, 0);
const HEAD = new THREE.SphereGeometry(0.28, 10, 8); HEAD.translate(0, 5.1, 0);
const POOL = new THREE.CircleGeometry(4.5, 20); POOL.rotateX(-Math.PI / 2); POOL.translate(0, 0.06, 0);
const POLE_MAT = new THREE.MeshStandardMaterial({ color: '#3b3f45', roughness: 0.6, metalness: 0.4 });
const HEAD_MAT = registerLit(new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffd890', roughness: 0.3 }), 3, 'street');
const POOL_MAT = registerToggle(new THREE.MeshBasicMaterial({ color: '#ffcf7a', transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending }), 'street');

export const StreetLamps: React.FC<{ spots: [number, number][] }> = ({ spots }) => {
  const meshes = useMemo(() => [[POLE, POLE_MAT], [HEAD, HEAD_MAT], [POOL, POOL_MAT]].map(([g, m]) => {
    const im = new THREE.InstancedMesh(g as THREE.BufferGeometry, m as THREE.Material, Math.max(1, spots.length));
    const mx = new THREE.Matrix4();
    spots.forEach(([x, z], i) => im.setMatrixAt(i, mx.makeTranslation(x, 0, z)));
    im.count = spots.length;
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    im.frustumCulled = spots.length > 0;
    return im;
  }), [spots]);
  useEffect(() => () => meshes.forEach((m) => m.dispose()), [meshes]);
  if (!spots.length) return null;
  return <>{meshes.map((m, i) => <primitive key={i} object={m} />)}</>;
};
