// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY HYGIENE - WebGL Context & Resource Garbage Collection
// Aggressive cleanup to prevent memory leaks on low-memory devices
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

interface CleanupRegistry {
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  textures: THREE.Texture[];
  renderTargets: THREE.WebGLRenderTarget[];
  scenes: THREE.Scene[];
  renderers: THREE.WebGLRenderer[];
}

// Global cleanup registry
const cleanupRegistry: CleanupRegistry = {
  geometries: [],
  materials: [],
  textures: [],
  renderTargets: [],
  scenes: [],
  renderers: [],
};

// Register resources for cleanup
export const registerForCleanup = {
  geometry: (geo: THREE.BufferGeometry) => {
    cleanupRegistry.geometries.push(geo);
  },
  material: (mat: THREE.Material) => {
    cleanupRegistry.materials.push(mat);
  },
  texture: (tex: THREE.Texture) => {
    cleanupRegistry.textures.push(tex);
  },
  renderTarget: (rt: THREE.WebGLRenderTarget) => {
    cleanupRegistry.renderTargets.push(rt);
  },
  scene: (scene: THREE.Scene) => {
    cleanupRegistry.scenes.push(scene);
  },
  renderer: (renderer: THREE.WebGLRenderer) => {
    cleanupRegistry.renderers.push(renderer);
  },
};

// Dispose a single Three.js object
const disposeObject = (obj: any) => {
  if (!obj) return;
  
  if (obj.geometry) {
    obj.geometry.dispose();
  }
  
  if (obj.material) {
    if (Array.isArray(obj.material)) {
      obj.material.forEach((mat: THREE.Material) => {
        disposeMaterial(mat);
      });
    } else {
      disposeMaterial(obj.material);
    }
  }
  
  if (obj.dispose) {
    obj.dispose();
  }
};

// Dispose material and its textures
const disposeMaterial = (material: THREE.Material) => {
  if (!material) return;
  
  // Dispose all texture maps
  const textureKeys = [
    'map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap',
    'envMap', 'alphaMap', 'aoMap', 'displacementMap',
    'emissiveMap', 'gradientMap', 'metalnessMap', 'roughnessMap',
  ];
  
  textureKeys.forEach(key => {
    const texture = (material as any)[key];
    if (texture && texture.dispose) {
      texture.dispose();
    }
  });
  
  material.dispose();
};

// Deep dispose a scene
export const disposeScene = (scene: THREE.Scene) => {
  if (!scene) return;
  
  scene.traverse((object) => {
    disposeObject(object);
  });
  
  scene.clear();
};

// Dispose WebGL renderer completely
export const disposeRenderer = (renderer: THREE.WebGLRenderer) => {
  if (!renderer) return;
  
  renderer.dispose();
  renderer.forceContextLoss();
  
  const gl = renderer.getContext();
  if (gl) {
    const loseContext = gl.getExtension('WEBGL_lose_context');
    if (loseContext) {
      loseContext.loseContext();
    }
  }
  
  // Remove canvas from DOM
  const canvas = renderer.domElement;
  if (canvas && canvas.parentNode) {
    canvas.parentNode.removeChild(canvas);
  }
};

// Full cleanup of all registered resources
export const performFullCleanup = () => {
  console.log('[WebGLCleanup] Performing full garbage collection...');
  
  // Dispose all registered geometries
  cleanupRegistry.geometries.forEach(geo => {
    if (geo && geo.dispose) geo.dispose();
  });
  cleanupRegistry.geometries.length = 0;
  
  // Dispose all registered materials
  cleanupRegistry.materials.forEach(mat => {
    disposeMaterial(mat);
  });
  cleanupRegistry.materials.length = 0;
  
  // Dispose all registered textures
  cleanupRegistry.textures.forEach(tex => {
    if (tex && tex.dispose) tex.dispose();
  });
  cleanupRegistry.textures.length = 0;
  
  // Dispose all render targets
  cleanupRegistry.renderTargets.forEach(rt => {
    if (rt && rt.dispose) rt.dispose();
  });
  cleanupRegistry.renderTargets.length = 0;
  
  // Dispose all scenes
  cleanupRegistry.scenes.forEach(scene => {
    disposeScene(scene);
  });
  cleanupRegistry.scenes.length = 0;
  
  // Dispose all renderers
  cleanupRegistry.renderers.forEach(renderer => {
    disposeRenderer(renderer);
  });
  cleanupRegistry.renderers.length = 0;
  
  // Force garbage collection if available
  if ((window as any).gc) {
    (window as any).gc();
  }
  
  console.log('[WebGLCleanup] Cleanup complete');
};

// ═══ REACT HOOK FOR AUTOMATIC CLEANUP ═══
export const useWebGLCleanup = (isActive: boolean = true) => {
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Register renderer for tracking
  const setRenderer = useCallback((renderer: THREE.WebGLRenderer | null) => {
    rendererRef.current = renderer;
    if (renderer) {
      registerForCleanup.renderer(renderer);
    }
  }, []);
  
  // Register scene for tracking
  const setScene = useCallback((scene: THREE.Scene | null) => {
    sceneRef.current = scene;
    if (scene) {
      registerForCleanup.scene(scene);
    }
  }, []);
  
  // Cleanup when component unmounts or becomes inactive
  useEffect(() => {
    if (!isActive) {
      // Delay cleanup slightly to avoid issues with rapid toggling
      cleanupTimeoutRef.current = setTimeout(() => {
        if (sceneRef.current) {
          disposeScene(sceneRef.current);
          sceneRef.current = null;
        }
        
        if (rendererRef.current) {
          disposeRenderer(rendererRef.current);
          rendererRef.current = null;
        }
        
        console.log('[WebGLCleanup] Cleaned up inactive WebGL context');
      }, 100);
    }
    
    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, [isActive]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sceneRef.current) {
        disposeScene(sceneRef.current);
      }
      
      if (rendererRef.current) {
        disposeRenderer(rendererRef.current);
      }
    };
  }, []);
  
  return {
    setRenderer,
    setScene,
    performCleanup: performFullCleanup,
  };
};

// ═══ VISIBILITY-BASED CLEANUP HOOK ═══
export const useVisibilityCleanup = (cleanupOnHidden: boolean = true) => {
  useEffect(() => {
    if (!cleanupOnHidden) return;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - perform cleanup
        console.log('[WebGLCleanup] Page hidden, performing cleanup...');
        performFullCleanup();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cleanupOnHidden]);
};

// ═══ ROUTE-BASED CLEANUP HOOK ═══
export const useRouteCleanup = (currentPath: string, cleanupPaths: string[] = ['/hologram', '/vr', '/3d']) => {
  const lastPathRef = useRef(currentPath);
  
  useEffect(() => {
    const wasOn3DPath = cleanupPaths.some(p => lastPathRef.current.includes(p));
    const isOn3DPath = cleanupPaths.some(p => currentPath.includes(p));
    
    // Navigating away from a 3D view
    if (wasOn3DPath && !isOn3DPath) {
      console.log('[WebGLCleanup] Navigated away from 3D view, cleaning up...');
      performFullCleanup();
    }
    
    lastPathRef.current = currentPath;
  }, [currentPath, cleanupPaths]);
};

export default useWebGLCleanup;
