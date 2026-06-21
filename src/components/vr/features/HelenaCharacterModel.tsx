import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import helenaModelUrl from '@/assets/models/re6-helena-harper-asia-v2.glb';

interface HelenaCharacterModelProps {
  pose?: 'standing' | 'riding';
  castShadow?: boolean;
  receiveShadow?: boolean;
  targetHeight?: number;
}

export const HelenaCharacterModel: React.FC<HelenaCharacterModelProps> = ({
  pose = 'standing',
  castShadow = true,
  receiveShadow = true,
  targetHeight = 1.72,
}) => {
  const { scene } = useGLTF(helenaModelUrl) as { scene: THREE.Group };

  const model = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.castShadow = castShadow;
      obj.receiveShadow = receiveShadow;
      obj.frustumCulled = true;

      if (Array.isArray(obj.material)) {
        obj.material.forEach((mat) => {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.roughness = Math.min(0.95, Math.max(0.22, mat.roughness));
            mat.metalness = Math.min(0.3, Math.max(0.02, mat.metalness));
          }
        });
      } else if (obj.material instanceof THREE.MeshStandardMaterial) {
        obj.material.roughness = Math.min(0.95, Math.max(0.22, obj.material.roughness));
        obj.material.metalness = Math.min(0.3, Math.max(0.02, obj.material.metalness));
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
  }, [scene, castShadow, receiveShadow, targetHeight]);

  if (pose === 'riding') {
    return (
      <group scale={[0.97, 0.97, 0.97]} rotation={[0.32, 0, 0]}>
        <primitive object={model} />
      </group>
    );
  }

  return <primitive object={model} />;
};

useGLTF.preload(helenaModelUrl);

export default HelenaCharacterModel;