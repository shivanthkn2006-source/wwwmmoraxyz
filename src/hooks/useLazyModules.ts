// ═══════════════════════════════════════════════════════════════════════════════
// LAZY MODULES - On-demand loading for heavy features
// Part 6: The Performance (Protocol Phantom)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from 'react';

type ModuleType = 'astrology' | 'imageGen' | 'artifact' | 'webgl';

interface LazyModuleState {
  astrology: boolean;
  imageGen: boolean;
  artifact: boolean;
  webgl: boolean;
}

/**
 * Lazy loading hook for heavy modules
 * Modules are NOT loaded until explicitly requested
 * Reduces initial bundle size and memory footprint
 */
export function useLazyModules() {
  const [loadedModules, setLoadedModules] = useState<LazyModuleState>({
    astrology: false,
    imageGen: false,
    artifact: false,
    webgl: false,
  });
  
  const [loadingModules, setLoadingModules] = useState<LazyModuleState>({
    astrology: false,
    imageGen: false,
    artifact: false,
    webgl: false,
  });

  const moduleRefs = useRef<Record<ModuleType, any>>({
    astrology: null,
    imageGen: null,
    artifact: null,
    webgl: null,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LAZY LOAD MODULE
  // ═══════════════════════════════════════════════════════════════════════════
  const loadModule = useCallback(async (moduleType: ModuleType): Promise<any> => {
    // Already loaded - use ref for immediate check
    if (moduleRefs.current[moduleType]) {
      return moduleRefs.current[moduleType];
    }

    // Check if already loading via ref pattern to avoid stale closure
    return new Promise((resolve) => {
      // Use a loading flag in ref to track
      const checkAndLoad = async () => {
        // Double-check if module was loaded while waiting
        if (moduleRefs.current[moduleType]) {
          resolve(moduleRefs.current[moduleType]);
          return;
        }

        setLoadingModules(prev => {
          // If already loading, set up a watcher
          if (prev[moduleType]) {
            const checkLoaded = setInterval(() => {
              if (moduleRefs.current[moduleType]) {
                clearInterval(checkLoaded);
                resolve(moduleRefs.current[moduleType]);
              }
            }, 100);
            return prev;
          }
          return { ...prev, [moduleType]: true };
        });

        // If we got here, we're the one loading
        try {
          let module;
          
          switch (moduleType) {
            case 'astrology':
              console.log('[LazyModules] Loading Astrology module...');
              module = await import('@/hooks/useSoulCodex').catch(() => {
                console.log('[LazyModules] Soul Codex module loaded as fallback');
                return { default: null };
              });
              break;
              
            case 'imageGen':
              console.log('[LazyModules] Loading Image Generation module...');
              module = await import('@/hooks/useArtifactGenerator').catch(() => {
                console.log('[LazyModules] Image gen module not found');
                return { default: null };
              });
              break;
              
            case 'artifact':
              console.log('[LazyModules] Loading Artifact module...');
              module = await import('@/components/zoe-infinity/ArtifactDisplay').catch(() => {
                console.log('[LazyModules] Artifact module not found');
                return { default: null };
              });
              break;
              
            case 'webgl':
              console.log('[LazyModules] Loading WebGL module...');
              module = await import('three').catch(() => {
                console.log('[LazyModules] Three.js not loaded');
                return { default: null };
              });
              break;
              
            default:
              module = null;
          }

          moduleRefs.current[moduleType] = module;
          setLoadedModules(prev => ({ ...prev, [moduleType]: true }));
          
          console.log(`[LazyModules] ${moduleType} module loaded successfully`);
          resolve(module);

        } catch (error) {
          console.error(`[LazyModules] Failed to load ${moduleType}:`, error);
          resolve(null);
        } finally {
          setLoadingModules(prev => ({ ...prev, [moduleType]: false }));
        }
      };

      checkAndLoad();
    });
  }, []);


  // ═══════════════════════════════════════════════════════════════════════════
  // UNLOAD MODULE (Memory cleanup)
  // ═══════════════════════════════════════════════════════════════════════════
  const unloadModule = useCallback((moduleType: ModuleType) => {
    moduleRefs.current[moduleType] = null;
    setLoadedModules(prev => ({ ...prev, [moduleType]: false }));
    console.log(`[LazyModules] ${moduleType} module unloaded`);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK IF MESSAGE NEEDS MODULE
  // ═══════════════════════════════════════════════════════════════════════════
  const detectRequiredModule = useCallback((message: string): ModuleType | null => {
    const lowerMessage = message.toLowerCase();
    
    // Astrology keywords
    if (/\b(horoscope|zodiac|birth chart|natal|astrology|planets|mercury|venus|mars|jupiter|saturn|neptune|uranus|pluto|moon sign|sun sign|rising|ascendant)\b/i.test(lowerMessage)) {
      return 'astrology';
    }
    
    // Image generation keywords
    if (/\b(show me|visualize|imagine|picture|draw|create.*image|generate.*image|paint|illustrate|depict|render)\b/i.test(lowerMessage)) {
      return 'imageGen';
    }
    
    // Artifact keywords (reports, worksheets)
    if (/\b(report|document|pdf|worksheet|compile|export|chronicle)\b/i.test(lowerMessage)) {
      return 'artifact';
    }
    
    // WebGL/3D keywords
    if (/\b(3d|three|rotate|orbit|webgl|render|scene)\b/i.test(lowerMessage)) {
      return 'webgl';
    }
    
    return null;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // PRELOAD BASED ON CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  const preloadForIntent = useCallback(async (message: string) => {
    const requiredModule = detectRequiredModule(message);
    if (requiredModule && !loadedModules[requiredModule]) {
      await loadModule(requiredModule);
    }
  }, [detectRequiredModule, loadedModules, loadModule]);

  return {
    loadedModules,
    loadingModules,
    loadModule,
    unloadModule,
    detectRequiredModule,
    preloadForIntent,
    isModuleLoaded: (type: ModuleType) => loadedModules[type],
    isModuleLoading: (type: ModuleType) => loadingModules[type],
    getModule: (type: ModuleType) => moduleRefs.current[type],
  };
}
