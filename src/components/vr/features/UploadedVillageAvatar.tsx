/** Uploaded rigs retain their textures and bind pose; additive local bone poses are visual only. */
import { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import { avatarMotion } from '@/lib/vrAvatarMotion';

export function UploadedVillageAvatar({ url, zoe = false, aiming = false }: { url: string; zoe?: boolean; aiming?: boolean }) {
  const { scene } = useGLTF(url);
  const phase = useRef(0);
  const { model, bones } = useMemo(() => {
    const model = clone(scene);
    const bones = new Map<string, { bone: THREE.Bone; rest: THREE.Quaternion }>();
    model.traverse((o) => {
      if (o instanceof THREE.Bone) bones.set(o.name.replace(/^mixamorig:/, '').replace(/_\d+$/, ''), { bone: o, rest: o.quaternion.clone() });
      if (o instanceof THREE.Mesh) { o.castShadow = true; o.frustumCulled = false; }
    });
    const box = new THREE.Box3().setFromObject(model);
    const height = box.max.y - box.min.y;
    const scale = 1.72 / Math.max(height, 0.0001);
    const center = box.getCenter(new THREE.Vector3());
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    return { model, bones };
  }, [scene]);
  const rotation = useMemo(() => new THREE.Quaternion(), []);
  const euler = useMemo(() => new THREE.Euler(), []);
  useFrame((_, rawDelta) => {
    const pose = avatarMotion.pose;
    const moving = pose === 'walking' || pose === 'running' || pose === 'climbing';
    phase.current += Math.min(rawDelta, 0.05) * (pose === 'running' ? 11 : 7);
    const swing = moving ? Math.sin(phase.current) * (pose === 'running' ? 0.55 : 0.32) : 0;
    const bent = pose === 'jumping' ? 0.7 : pose === 'sitting' ? 1.3 : 0;
    const attack = Math.max(0, 1 - (performance.now() - avatarMotion.attackAt) / 350);
    const set = (mixamo: string, cc: string, x: number, y = 0, z = 0) => {
      const entry = bones.get(zoe ? cc : mixamo); if (!entry) return;
      rotation.setFromEuler(euler.set(x, y, z)); entry.bone.quaternion.copy(entry.rest).multiply(rotation);
    };
    set('LeftUpLeg', 'L_Thigh', swing - bent);
    set('RightUpLeg', 'R_Thigh', -swing - bent);
    set('LeftLeg', 'L_Calf', bent || Math.max(0, -swing));
    set('RightLeg', 'R_Calf', bent || Math.max(0, swing));
    set('LeftArm', 'L_Upperarm', aiming ? -1.1 : swing * 0.6, 0, zoe ? 0 : -0.3);
    set('RightArm', 'R_Upperarm', (aiming ? -1.1 : -swing * 0.6) - attack * 0.35, 0, zoe ? 0 : 0.3);
    set('LeftForeArm', 'L_Forearm', aiming ? -0.4 : 0);
    set('RightForeArm', 'R_Forearm', aiming ? -0.4 : 0);
    set('Head', 'Head', avatarMotion.headPitch);
  });
  return <group rotation-y={zoe ? -Math.PI / 2 : 0}><primitive object={model} /></group>;
}