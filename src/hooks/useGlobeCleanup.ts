// ============================================
// GLOBE WEBGL CLEANUP HOOK
// Proper disposal of 3D resources on unmount
// ============================================

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

interface CleanupRefs {
  renderer: THREE.WebGLRenderer | null;
  scene: THREE.Scene | null;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  textures: THREE.Texture[];
}

export const useGlobeCleanup = () => {
  const cleanupRefs = useRef<CleanupRefs>({
    renderer: null,
    scene: null,
    geometries: [],
    materials: [],
    textures: [],
  });
  
  // Register renderer for cleanup
  const registerRenderer = useCallback((renderer: THREE.WebGLRenderer | null) => {
    cleanupRefs.current.renderer = renderer;
  }, []);
  
  // Register scene for cleanup
  const registerScene = useCallback((scene: THREE.Scene | null) => {
    cleanupRefs.current.scene = scene;
  }, []);
  
  // Register individual resources
  const registerGeometry = useCallback((geometry: THREE.BufferGeometry) => {
    cleanupRefs.current.geometries.push(geometry);
  }, []);
  
  const registerMaterial = useCallback((material: THREE.Material) => {
    cleanupRefs.current.materials.push(material);
  }, []);
  
  const registerTexture = useCallback((texture: THREE.Texture) => {
    cleanupRefs.current.textures.push(texture);
  }, []);
  
  // Dispose a single material and its textures
  const disposeMaterial = useCallback((material: THREE.Material) => {
    if (!material) return;
    
    // Handle materials with textures
    if ('map' in material && material.map) {
      (material.map as THREE.Texture).dispose();
    }
    if ('normalMap' in material && material.normalMap) {
      (material.normalMap as THREE.Texture).dispose();
    }
    if ('bumpMap' in material && material.bumpMap) {
      (material.bumpMap as THREE.Texture).dispose();
    }
    if ('specularMap' in material && material.specularMap) {
      (material.specularMap as THREE.Texture).dispose();
    }
    if ('emissiveMap' in material && material.emissiveMap) {
      (material.emissiveMap as THREE.Texture).dispose();
    }
    
    material.dispose();
  }, []);
  
  // Traverse and dispose scene
  const disposeScene = useCallback((scene: THREE.Scene | null) => {
    if (!scene) return;
    
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(disposeMaterial);
          } else {
            disposeMaterial(object.material);
          }
        }
      }
      
      // Handle instanced meshes
      if (object instanceof THREE.InstancedMesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(disposeMaterial);
          } else {
            disposeMaterial(object.material);
          }
        }
        if (object.instanceMatrix) {
          object.dispose();
        }
      }
    });
    
    scene.clear();
  }, [disposeMaterial]);
  
  // Full cleanup function
  const performCleanup = useCallback(() => {
    const refs = cleanupRefs.current;
    
    console.log('[GlobeCleanup] Starting WebGL resource cleanup...');
    
    // Dispose registered textures
    refs.textures.forEach((texture) => {
      try {
        texture.dispose();
      } catch (e) {
        // Ignore already disposed
      }
    });
    
    // Dispose registered geometries
    refs.geometries.forEach((geometry) => {
      try {
        geometry.dispose();
      } catch (e) {
        // Ignore already disposed
      }
    });
    
    // Dispose registered materials
    refs.materials.forEach(disposeMaterial);
    
    // Dispose scene
    disposeScene(refs.scene);
    
    // Dispose renderer
    if (refs.renderer) {
      try {
        refs.renderer.dispose();
        refs.renderer.forceContextLoss();
        
        // Remove canvas from DOM if it exists
        const canvas = refs.renderer.domElement;
        if (canvas && canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        
        console.log('[GlobeCleanup] Renderer disposed and context lost');
      } catch (e) {
        console.warn('[GlobeCleanup] Error disposing renderer:', e);
      }
    }
    
    // Clear refs
    cleanupRefs.current = {
      renderer: null,
      scene: null,
      geometries: [],
      materials: [],
      textures: [],
    };
    
    console.log('[GlobeCleanup] WebGL cleanup complete');
  }, [disposeMaterial, disposeScene]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      performCleanup();
    };
  }, [performCleanup]);
  
  return {
    registerRenderer,
    registerScene,
    registerGeometry,
    registerMaterial,
    registerTexture,
    performCleanup,
  };
};

// ============================================
// Canvas-level cleanup hook
// Call gl.dispose() when leaving the page
// ============================================

export const useCanvasCleanup = (
  onCleanup?: () => void
) => {
  const cleanupRef = useRef<(() => void) | null>(null);
  
  // Store cleanup function
  const setCleanup = useCallback((cleanup: () => void) => {
    cleanupRef.current = cleanup;
  }, []);
  
  // Perform cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      if (onCleanup) {
        onCleanup();
      }
    };
  }, [onCleanup]);
  
  return { setCleanup };
};

export default useGlobeCleanup;
