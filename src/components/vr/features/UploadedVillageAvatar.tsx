/** Uploaded rigs retain their textures and bind pose; additive local bone poses are visual only. */
import { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import { avatarMotion } from '@/lib/vrAvatarMotion';
import { gripFrame, isLongGun, isOneHanded, type GripFrame, type HeldWeapon } from '@/lib/vrWeaponGrip';
import { createUploadedWeaponSolver, normalizeUploadedJoint, UPLOADED_STOCK_INWARD } from '@/lib/vrUploadedWeaponGrip';
import { HeldWeaponModel } from './HeldWeaponModel';

export function UploadedVillageAvatar({ url, zoe = false, aiming = false, heldWeapon = null }: { url: string; zoe?: boolean; aiming?: boolean; heldWeapon?: HeldWeapon | null }) {
  const { scene } = useGLTF(url);
  const root = useRef<THREE.Group>(null);
  const weapon = useRef<THREE.Group>(null);
  const shoulder = useMemo(() => new THREE.Vector3(), []);
  const frame = useMemo<GripFrame>(() => ({ weapon: new THREE.Vector3(), right: new THREE.Vector3(), left: new THREE.Vector3() }), []);
  const phase = useRef(0);
  const { model, bones } = useMemo(() => {
    const model = clone(scene);
    const bones = new Map<string, { bone: THREE.Bone; rest: THREE.Quaternion }>();
    model.traverse((o) => {
      if (o instanceof THREE.Bone) bones.set(normalizeUploadedJoint(o.name), { bone: o, rest: o.quaternion.clone() });
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
  const armSolver = useMemo(() => createUploadedWeaponSolver(model, zoe), [model, zoe]);
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
    const avatar = root.current;
    const gun = weapon.current;
    if (heldWeapon && avatar && gun && armSolver?.shoulder) {
      avatar.updateWorldMatrix(true, true);
      avatar.worldToLocal(armSolver.shoulder.getWorldPosition(shoulder));
      const kick = Math.max(0, 1 - (performance.now() - avatarMotion.attackAt) / 180);
      gripFrame(heldWeapon, shoulder, kick, frame);
      // Uploaded rigs have shorter arms: the stock sits in the shoulder pocket
      // nearer the collarbone so the support hand can reach the fore-end.
      if (isLongGun(heldWeapon)) frame.weapon.x += UPLOADED_STOCK_INWARD;
      gun.position.copy(frame.weapon);
      gun.rotation.set(0, -Math.PI / 2, (isLongGun(heldWeapon) ? 0.03 : 0.02) + kick * 0.045);
      // Uploaded palms touch the grip and underside of the pump; skirt wrist
      // offsets were calibrated for a different rig and must not be reused.
      frame.right.copy(frame.weapon);
      // Knife and grenades are one-handed: keep gripFrame's relaxed left-hand spot.
      const support = !isOneHanded(heldWeapon)
        ? armSolver.supportContact(avatar, gun, isLongGun(heldWeapon) ? 0.3 : 0.025)
        : null;
      if (support) frame.left.copy(support);
      armSolver.solve(avatar, frame.right, frame.left, !!support);
    } else {
      armSolver?.relax();
    }
  });
  // Weapon frame is in village-facing coordinates, outside the uploaded rig's
  // corrective rotation. Both hands solve into that same coordinate system.
  return <group ref={root}>
    <group rotation-y={zoe ? -Math.PI / 2 : 0}><primitive object={model} /></group>
    {heldWeapon && armSolver && <group ref={weapon} name="uploaded-held-grip"><HeldWeaponModel weapon={heldWeapon} /></group>}
  </group>;
}