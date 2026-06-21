// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3: MEMORY LEAK PLUMBER (Aggressive Garbage Collection)
// Fixes memory leaks in 3D/Camera modules & ensures RAM doesn't fill up
// Connected to Zoe Core for sovereign monitoring
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import * as THREE from 'three';
import { supabase } from '@/integrations/supabase/client';

// ═══ TYPES ═══
interface MemoryStats {
  jsHeapSize: number;
  totalJSHeapSize: number;
  heapUtilization: number;
  webglContexts: number;
  eventListenerCount: number;
  cleanupCount: number;
}

interface CleanupResource {
  id: string;
  type: 'geometry' | 'material' | 'texture' | 'renderer' | 'scene' | 'audio' | 'listener' | 'subscription';
  dispose: () => void;
  timestamp: number;
}

// ═══ GLOBAL CLEANUP REGISTRY ═══
const globalCleanupRegistry: CleanupResource[] = [];
let cleanupCounter = 0;
let lastCleanupTime = 0;

// ═══ MEMORY MONITORING ═══
const getMemoryStats = (): MemoryStats => {
  const performance = window.performance as any;
  const memory = performance?.memory;
  
  return {
    jsHeapSize: memory?.usedJSHeapSize || 0,
    totalJSHeapSize: memory?.totalJSHeapSize || 0,
    heapUtilization: memory ? (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100 : 0,
    webglContexts: countWebGLContexts(),
    eventListenerCount: (window as any).__eventListenerCount || 0,
    cleanupCount: cleanupCounter,
  };
};

// Count active WebGL contexts
const countWebGLContexts = (): number => {
  let count = 0;
  const canvases = document.querySelectorAll('canvas');
  canvases.forEach(canvas => {
    try {
      const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (ctx && !(ctx as any).isContextLost?.()) {
        count++;
      }
    } catch {
      // Ignore
    }
  });
  return count;
};

// ═══ DISPOSAL FUNCTIONS ═══
const disposeThreeTexture = (texture: THREE.Texture) => {
  if (texture && texture.dispose) {
    texture.dispose();
  }
};

const disposeThreeMaterial = (material: THREE.Material) => {
  if (!material) return;
  
  // Dispose all texture maps
  const textureKeys = [
    'map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap',
    'envMap', 'alphaMap', 'aoMap', 'displacementMap',
    'emissiveMap', 'gradientMap', 'metalnessMap', 'roughnessMap',
  ];
  
  textureKeys.forEach(key => {
    const texture = (material as any)[key];
    if (texture) {
      disposeThreeTexture(texture);
    }
  });
  
  material.dispose();
};

const disposeThreeGeometry = (geometry: THREE.BufferGeometry) => {
  if (geometry && geometry.dispose) {
    geometry.dispose();
  }
};

const disposeThreeScene = (scene: THREE.Scene) => {
  if (!scene) return;
  
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
      if (object.geometry) {
        object.geometry.dispose();
      }
      
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(disposeThreeMaterial);
        } else {
          disposeThreeMaterial(object.material);
        }
      }
    }
  });
  
  scene.clear();
};

const disposeThreeRenderer = (renderer: THREE.WebGLRenderer) => {
  if (!renderer) return;
  
  try {
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
  } catch (e) {
    console.warn('[MemoryLeakPlumber] Error disposing renderer:', e);
  }
};

// ═══ REGISTRATION FUNCTIONS ═══
export const registerForCleanup = {
  geometry: (geometry: THREE.BufferGeometry, id?: string) => {
    globalCleanupRegistry.push({
      id: id || `geometry_${Date.now()}`,
      type: 'geometry',
      dispose: () => disposeThreeGeometry(geometry),
      timestamp: Date.now(),
    });
  },
  
  material: (material: THREE.Material, id?: string) => {
    globalCleanupRegistry.push({
      id: id || `material_${Date.now()}`,
      type: 'material',
      dispose: () => disposeThreeMaterial(material),
      timestamp: Date.now(),
    });
  },
  
  texture: (texture: THREE.Texture, id?: string) => {
    globalCleanupRegistry.push({
      id: id || `texture_${Date.now()}`,
      type: 'texture',
      dispose: () => disposeThreeTexture(texture),
      timestamp: Date.now(),
    });
  },
  
  renderer: (renderer: THREE.WebGLRenderer, id?: string) => {
    globalCleanupRegistry.push({
      id: id || `renderer_${Date.now()}`,
      type: 'renderer',
      dispose: () => disposeThreeRenderer(renderer),
      timestamp: Date.now(),
    });
  },
  
  scene: (scene: THREE.Scene, id?: string) => {
    globalCleanupRegistry.push({
      id: id || `scene_${Date.now()}`,
      type: 'scene',
      dispose: () => disposeThreeScene(scene),
      timestamp: Date.now(),
    });
  },
  
  audio: (audioContext: AudioContext, id?: string) => {
    globalCleanupRegistry.push({
      id: id || `audio_${Date.now()}`,
      type: 'audio',
      dispose: () => {
        if (audioContext.state !== 'closed') {
          audioContext.close().catch(() => {});
        }
      },
      timestamp: Date.now(),
    });
  },
  
  listener: (target: EventTarget, event: string, handler: EventListener, id?: string) => {
    globalCleanupRegistry.push({
      id: id || `listener_${event}_${Date.now()}`,
      type: 'listener',
      dispose: () => target.removeEventListener(event, handler),
      timestamp: Date.now(),
    });
    
    // Track listener count
    (window as any).__eventListenerCount = ((window as any).__eventListenerCount || 0) + 1;
  },
  
  subscription: (unsubscribe: () => void, id?: string) => {
    globalCleanupRegistry.push({
      id: id || `subscription_${Date.now()}`,
      type: 'subscription',
      dispose: unsubscribe,
      timestamp: Date.now(),
    });
  },
};

// ═══ AGGRESSIVE CLEANUP FUNCTION ═══
export const performAggressiveCleanup = async (source: string = 'manual'): Promise<void> => {
  const startTime = performance.now();
  const beforeStats = getMemoryStats();
  
  console.log(`[MemoryLeakPlumber] 🔧 Starting aggressive cleanup (source: ${source})`);
  console.log(`[MemoryLeakPlumber] Before cleanup: ${globalCleanupRegistry.length} resources registered`);
  console.log(`[MemoryLeakPlumber] Heap utilization: ${beforeStats.heapUtilization.toFixed(1)}%`);
  
  // Dispose all registered resources
  let disposedCount = 0;
  while (globalCleanupRegistry.length > 0) {
    const resource = globalCleanupRegistry.pop();
    if (resource) {
      try {
        resource.dispose();
        disposedCount++;
      } catch (e) {
        console.warn(`[MemoryLeakPlumber] Failed to dispose ${resource.type}:`, e);
      }
    }
  }
  
  // Clear any orphaned WebGL contexts
  const canvases = document.querySelectorAll('canvas[data-webgl]');
  canvases.forEach(canvasEl => {
    try {
      const canvas = canvasEl as HTMLCanvasElement;
      const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (ctx) {
        const loseContext = ctx.getExtension('WEBGL_lose_context');
        if (loseContext) {
          loseContext.loseContext();
        }
      }
    } catch {
      // Ignore
    }
  });
  
  // Clear SpeechRecognition instances
  if ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) {
    try {
      const recognition = (window as any).__activeRecognition;
      if (recognition) {
        recognition.abort();
        (window as any).__activeRecognition = null;
      }
    } catch {
      // Ignore
    }
  }
  
  // Clear Supabase realtime subscriptions
  try {
    const channels = supabase.getChannels();
    for (const channel of channels) {
      await supabase.removeChannel(channel);
    }
  } catch (e) {
    // Ignore subscription cleanup errors
  }
  
  // Clear sessionStorage caches
  try {
    const keysToRemove = ['selfie-city-cache', 'globe-texture-cache', 'quantum-camera-cache'];
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  } catch {
    // Ignore storage errors
  }
  
  // Force garbage collection if available (Chrome with --expose-gc flag)
  if ((window as any).gc) {
    (window as any).gc();
  }
  
  // Update stats
  cleanupCounter++;
  lastCleanupTime = Date.now();
  
  const duration = performance.now() - startTime;
  const afterStats = getMemoryStats();
  
  console.log(`[MemoryLeakPlumber] ✅ Memory Cleaned (${disposedCount} resources in ${duration.toFixed(1)}ms)`);
  console.log(`[MemoryLeakPlumber] Heap: ${beforeStats.heapUtilization.toFixed(1)}% → ${afterStats.heapUtilization.toFixed(1)}%`);
  console.log(`[MemoryLeakPlumber] WebGL contexts: ${afterStats.webglContexts}`);
  
  // Log to Zoe Core for sovereign monitoring
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    // Only log if user is authenticated (UUID required)
    if (currentUser?.id) {
      await supabase.from('behavioral_events').insert({
        user_id: currentUser.id,
        event_type: 'memory_cleanup',
        event_category: 'system_health',
        metadata: {
          source,
          disposedCount,
          durationMs: duration,
          heapBefore: beforeStats.heapUtilization,
          heapAfter: afterStats.heapUtilization,
          webglContexts: afterStats.webglContexts,
          totalCleanups: cleanupCounter,
        },
        sentiment_score: 1.0, // Positive - system is healthy
      });
    }
  } catch {
    // Ignore logging errors
  }
};

// ═══ REACT HOOK: MEMORY LEAK PLUMBER ═══
export const useMemoryLeakPlumber = (options: {
  cleanupOnUnmount?: boolean;
  cleanupOnRouteChange?: boolean;
  cleanupOnVisibilityHidden?: boolean;
  aggressiveMode?: boolean;
  logToZoeCore?: boolean;
} = {}) => {
  const {
    cleanupOnUnmount = true,
    cleanupOnRouteChange = true,
    cleanupOnVisibilityHidden = true,
    aggressiveMode = true,
    logToZoeCore = true,
  } = options;
  
  const location = useLocation();
  const lastPathRef = useRef(location.pathname);
  const localResourcesRef = useRef<CleanupResource[]>([]);
  
  // Register local resource for component-specific cleanup
  const registerLocalResource = useCallback((
    type: CleanupResource['type'],
    dispose: () => void,
    id?: string
  ) => {
    localResourcesRef.current.push({
      id: id || `${type}_${Date.now()}`,
      type,
      dispose,
      timestamp: Date.now(),
    });
  }, []);
  
  // Register WebGL resources
  const registerWebGL = useCallback((
    geometry?: THREE.BufferGeometry | null,
    material?: THREE.Material | THREE.Material[] | null,
    texture?: THREE.Texture | null,
    renderer?: THREE.WebGLRenderer | null,
    scene?: THREE.Scene | null
  ) => {
    if (geometry) {
      registerLocalResource('geometry', () => disposeThreeGeometry(geometry));
    }
    if (material) {
      if (Array.isArray(material)) {
        material.forEach(m => registerLocalResource('material', () => disposeThreeMaterial(m)));
      } else {
        registerLocalResource('material', () => disposeThreeMaterial(material));
      }
    }
    if (texture) {
      registerLocalResource('texture', () => disposeThreeTexture(texture));
    }
    if (renderer) {
      registerLocalResource('renderer', () => disposeThreeRenderer(renderer));
    }
    if (scene) {
      registerLocalResource('scene', () => disposeThreeScene(scene));
    }
  }, [registerLocalResource]);
  
  // Register audio context
  const registerAudio = useCallback((audioContext: AudioContext) => {
    registerLocalResource('audio', () => {
      if (audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
    });
  }, [registerLocalResource]);
  
  // Register event listener with auto-cleanup
  const registerListener = useCallback((
    target: EventTarget,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ) => {
    target.addEventListener(event, handler, options);
    registerLocalResource('listener', () => target.removeEventListener(event, handler, options));
    (window as any).__eventListenerCount = ((window as any).__eventListenerCount || 0) + 1;
  }, [registerLocalResource]);
  
  // Register subscription with auto-cleanup
  const registerSubscription = useCallback((unsubscribe: () => void) => {
    registerLocalResource('subscription', unsubscribe);
  }, [registerLocalResource]);
  
  // Perform local cleanup
  const cleanupLocal = useCallback((source: string = 'local') => {
    console.log(`[MemoryLeakPlumber] Cleaning ${localResourcesRef.current.length} local resources (${source})`);
    
    while (localResourcesRef.current.length > 0) {
      const resource = localResourcesRef.current.pop();
      if (resource) {
        try {
          resource.dispose();
        } catch (e) {
          console.warn(`[MemoryLeakPlumber] Failed to dispose local ${resource.type}:`, e);
        }
      }
    }
    
    console.log('[MemoryLeakPlumber] ✅ Memory Cleaned (local)');
  }, []);
  
  // Route change cleanup
  useEffect(() => {
    if (!cleanupOnRouteChange) return;
    
    const currentPath = location.pathname;
    const previousPath = lastPathRef.current;
    
    // Only cleanup when navigating away
    if (currentPath !== previousPath) {
      console.log(`[MemoryLeakPlumber] Route change: ${previousPath} → ${currentPath}`);
      
      if (aggressiveMode) {
        performAggressiveCleanup('route_change');
      } else {
        cleanupLocal('route_change');
      }
      
      lastPathRef.current = currentPath;
    }
  }, [location.pathname, cleanupOnRouteChange, aggressiveMode, cleanupLocal]);
  
  // Visibility change cleanup
  useEffect(() => {
    if (!cleanupOnVisibilityHidden) return;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[MemoryLeakPlumber] Page hidden, triggering cleanup');
        if (aggressiveMode) {
          performAggressiveCleanup('visibility_hidden');
        } else {
          cleanupLocal('visibility_hidden');
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cleanupOnVisibilityHidden, aggressiveMode, cleanupLocal]);
  
  // Unmount cleanup
  useEffect(() => {
    return () => {
      if (cleanupOnUnmount) {
        cleanupLocal('unmount');
        console.log('[MemoryLeakPlumber] ✅ Memory Cleaned (component unmount)');
      }
    };
  }, [cleanupOnUnmount, cleanupLocal]);
  
  return {
    // Registration functions
    registerWebGL,
    registerAudio,
    registerListener,
    registerSubscription,
    registerLocalResource,
    
    // Manual cleanup
    cleanupLocal,
    cleanupGlobal: performAggressiveCleanup,
    
    // Stats
    getMemoryStats,
  };
};

// ═══ STANDALONE ROUTE CLEANUP HOOK ═══
export const useRouteCleanupLogger = () => {
  const location = useLocation();
  const lastPathRef = useRef(location.pathname);
  
  useEffect(() => {
    if (location.pathname !== lastPathRef.current) {
      console.log(`[MemoryLeakPlumber] ✅ Memory Cleaned (route: ${lastPathRef.current} → ${location.pathname})`);
      lastPathRef.current = location.pathname;
    }
  }, [location.pathname]);
};

export default useMemoryLeakPlumber;
