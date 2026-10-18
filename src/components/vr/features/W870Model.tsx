/** CC0 870 source, dark tactical finish. X muzzle-forward, Y up; 1.08 m long. */
import React, { Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import asset from '@/assets/models/w870-tactical.glb.asset.json';

class ModelBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}
function Mesh() {
  const { scene } = useGLTF(asset.url);
  const clone = useMemo(() => {
    const result = scene.clone(true);
    result.traverse((node) => {
      if (node instanceof THREE.Mesh) { node.castShadow = true; node.receiveShadow = true; }
    });
    return result;
  }, [scene]);
  return <primitive object={clone} />;
}
export function W870Model() {
  return <ModelBoundary><Suspense fallback={null}><Mesh /></Suspense></ModelBoundary>;
}