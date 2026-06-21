import React, { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as THREE from 'three';
import ani10ModelUrl from '@/assets/models/ani10.fbx';

interface LeonCharacterModelProps {
  pose?: 'standing' | 'riding';
  castShadow?: boolean;
  receiveShadow?: boolean;
  targetHeight?: number;
}

export const LeonCharacterModel: React.FC<LeonCharacterModelProps> = ({
  pose = 'standing',
  castShadow = true,
  receiveShadow = true,
  targetHeight = 1.78,
}) => {
  const fbx = useLoader(FBXLoader, ani10ModelUrl) as THREE.Group;

  const model = useMemo(() => {
    const cloned = fbx.clone(true);

    // Material + shadow normalization
    cloned.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = castShadow;
        obj.receiveShadow = receiveShadow;
        obj.frustumCulled = true;

        const fix = (mat: THREE.Material) => {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.roughness = Math.min(0.95, Math.max(0.25, mat.roughness));
            mat.metalness = Math.min(0.35, mat.metalness);
          } else if (mat instanceof THREE.MeshPhongMaterial) {
            // FBX commonly ships Phong — keep but tame shininess
            mat.shininess = Math.min(40, mat.shininess);
          }
        };
        if (Array.isArray(obj.material)) obj.material.forEach(fix);
        else if (obj.material) fix(obj.material as THREE.Material);
      }
    });

    // Auto-fit to targetHeight and ground at y=0
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const modelHeight = Math.max(size.y, 0.0001);
    const fitScale = targetHeight / modelHeight;

    const center = new THREE.Vector3();
    box.getCenter(center);
    cloned.scale.setScalar(fitScale);
    cloned.position.set(
      -center.x * fitScale,
      -box.min.y * fitScale,
      -center.z * fitScale,
    );

    return cloned;
  }, [fbx, castShadow, receiveShadow, targetHeight]);

  if (pose === 'riding') {
    return (
      <group scale={[0.98, 0.98, 0.98]} rotation={[0.34, 0, 0]}>
        <primitive object={model} />
      </group>
    );
  }

  return <primitive object={model} />;
};

export default LeonCharacterModel;
