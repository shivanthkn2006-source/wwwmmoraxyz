import React, { useEffect, useMemo } from 'react';
import { useAnimations, useFBX } from '@react-three/drei';
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import partyMaleModelUrl from '@/assets/models/party-m-0001.fbx';

type PartyAnimState = 'idle' | 'walking' | 'running' | 'sitting' | 'jumping';

interface PartyCharacterModelProps {
  animState: PartyAnimState;
  pose?: 'standing' | 'riding';
  castShadow?: boolean;
  receiveShadow?: boolean;
  targetHeight?: number;
}

const pickAction = (
  actions: Record<string, THREE.AnimationAction | null>,
  needles: string[],
): THREE.AnimationAction | null => {
  const entries = Object.entries(actions);
  const match = entries.find(([name, action]) => {
    if (!action) return false;
    const lower = name.toLowerCase();
    return needles.some((needle) => lower.includes(needle));
  });
  return match?.[1] ?? null;
};

export const PartyCharacterModel: React.FC<PartyCharacterModelProps> = ({
  animState,
  pose = 'standing',
  castShadow = true,
  receiveShadow = true,
  targetHeight = 1.78,
}) => {
  const source = useFBX(partyMaleModelUrl) as THREE.Group & { animations?: THREE.AnimationClip[] };
  const clips = useMemo(() => source.animations ?? [], [source]);

  const model = useMemo(() => {
    const cloned = skeletonClone(source) as THREE.Group;

    cloned.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.castShadow = castShadow;
      obj.receiveShadow = receiveShadow;
      obj.frustumCulled = true;

      if (Array.isArray(obj.material)) {
        obj.material.forEach((mat) => {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.roughness = Math.min(0.95, Math.max(0.2, mat.roughness));
            mat.metalness = Math.min(0.4, Math.max(0.05, mat.metalness));
          }
        });
      } else if (obj.material instanceof THREE.MeshStandardMaterial) {
        obj.material.roughness = Math.min(0.95, Math.max(0.2, obj.material.roughness));
        obj.material.metalness = Math.min(0.4, Math.max(0.05, obj.material.metalness));
      }
    });

    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const height = Math.max(size.y, 0.0001);
    const fitScale = targetHeight / height;

    cloned.scale.setScalar(fitScale);
    cloned.position.set(-center.x * fitScale, -box.min.y * fitScale, -center.z * fitScale);
    return cloned;
  }, [source, castShadow, receiveShadow, targetHeight]);

  const { actions } = useAnimations(clips, model);

  useEffect(() => {
    const allActions = Object.values(actions).filter(Boolean) as THREE.AnimationAction[];
    if (allActions.length === 0) return;

    const target = (() => {
      if (animState === 'running') return pickAction(actions, ['run', 'sprint', 'jog']);
      if (animState === 'walking') return pickAction(actions, ['walk', 'jog']);
      if (animState === 'jumping') return pickAction(actions, ['jump', 'air']);
      return pickAction(actions, ['idle', 'stand', 'breath']);
    })();

    allActions.forEach((action) => action.stop());
    if (!target) return;

    target.reset();
    target.fadeIn(0.14);
    target.play();

    return () => {
      target.fadeOut(0.1);
    };
  }, [actions, animState]);

  const ridingTransform = pose === 'riding'
    ? {
      outerRotation: [0.25, 0, 0] as [number, number, number],
      outerScale: [0.97, 0.97, 0.97] as [number, number, number],
    }
    : {
      outerRotation: [0, 0, 0] as [number, number, number],
      outerScale: [1, 1, 1] as [number, number, number],
    };

  return (
    <group rotation={ridingTransform.outerRotation} scale={ridingTransform.outerScale}>
      <primitive object={model} rotation={[0, Math.PI, 0]} />
    </group>
  );
};

useFBX.preload(partyMaleModelUrl);

export default PartyCharacterModel;