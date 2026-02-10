// ═══════════════════════════════════════════════════════════════════════════════
// WEBGL CAPABILITIES DETECTOR - Cross-Browser/Device Safe Graphics Initialization
// Provides detailed capability detection and graceful degradation for all devices
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';

export interface WebGLCapabilities {
  // Core Support
  webglSupported: boolean;
  webgl2Supported: boolean;
  contextType: 'webgl2' | 'webgl' | 'none';
  
  // GPU Info
  renderer: string;
  vendor: string;
  
  // Browser/Device Info
  browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'brave' | 'samsung' | 'oculus' | 'wolvic' | 'unknown';
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isMac: boolean;
  isVRHeadset: boolean;
  isQuest: boolean;
  
  // Capability Flags
  canRender3D: boolean;
  recommendedTier: 'ultra' | 'high' | 'medium' | 'low' | 'fallback';
  
  // Feature Support
  maxTextureSize: number;
  maxRenderbufferSize: number;
  maxViewportDims: number[];
  floatTexturesSupported: boolean;
  depthTextureSupported: boolean;
  
  // Error State
  error: string | null;
  errorCode: 'context_lost' | 'no_webgl' | 'gpu_blocked' | 'unknown' | null;
}

// Browser detection (cross-platform including VR browsers)
const detectBrowser = (): WebGLCapabilities['browser'] => {
  if (typeof navigator === 'undefined') return 'unknown';
  
  const ua = navigator.userAgent.toLowerCase();
  
  // VR-specific browsers first
  if (ua.includes('oculusbrowser')) return 'oculus';
  if (ua.includes('wolvic') || ua.includes('firefox reality')) return 'wolvic';
  if (ua.includes('samsungbrowser')) return 'samsung';
  
  // Desktop browsers
  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('brave')) return 'brave';
  if (ua.includes('opr/') || ua.includes('opera')) return 'opera';
  if (ua.includes('firefox')) return 'firefox';
  if (ua.includes('chrome') && !ua.includes('edg/')) return 'chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
  
  return 'unknown';
};

// Device detection (mobile, desktop, VR headsets)
const detectDevice = () => {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return { isMobile: false, isIOS: false, isAndroid: false, isMac: false, isVRHeadset: false, isQuest: false };
  }
  
  const ua = navigator.userAgent.toLowerCase();
  
  const isIOS = /iphone|ipad|ipod/.test(ua) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  const isAndroid = /android/.test(ua);
  
  const isMobile = isIOS || isAndroid || 
    /webos|blackberry|windows phone|opera mini|iemobile/.test(ua) ||
    ('ontouchstart' in window && navigator.maxTouchPoints > 1);
  
  const isMac = /macintosh|mac os x/.test(ua) && !isIOS;
  
  // VR headset detection
  const isQuest = /quest/i.test(ua);
  const isVRHeadset = isQuest || /pico|vive|vision|wmr|pimax/i.test(ua);
  
  return { isMobile, isIOS, isAndroid, isMac, isVRHeadset, isQuest };
};

// Safe WebGL context creation with multiple fallbacks
const createWebGLContext = (canvas: HTMLCanvasElement): {
  gl: WebGLRenderingContext | WebGL2RenderingContext | null;
  contextType: 'webgl2' | 'webgl' | 'none';
  error: string | null;
} => {
  const contextAttributes: WebGLContextAttributes = {
    alpha: true,
    depth: true,
    stencil: true,
    antialias: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false, // Important: Don't fail on software rendering
  };
  
  // Try WebGL2 first
  try {
    const gl2 = canvas.getContext('webgl2', contextAttributes);
    if (gl2) {
      return { gl: gl2, contextType: 'webgl2', error: null };
    }
  } catch (e) {
    console.warn('[WebGL] WebGL2 context creation failed:', e);
  }
  
  // Fall back to WebGL1
  try {
    const gl1 = canvas.getContext('webgl', contextAttributes) || 
                canvas.getContext('experimental-webgl', contextAttributes);
    if (gl1) {
      return { gl: gl1 as WebGLRenderingContext, contextType: 'webgl', error: null };
    }
  } catch (e) {
    console.warn('[WebGL] WebGL1 context creation failed:', e);
  }
  
  return { gl: null, contextType: 'none', error: 'WebGL not available' };
};

// Get GPU info safely
const getGPUInfo = (gl: WebGLRenderingContext | WebGL2RenderingContext): { 
  renderer: string; 
  vendor: string; 
} => {
  let renderer = 'unknown';
  let vendor = 'unknown';
  
  try {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
      vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown';
    }
  } catch (e) {
    // WEBGL_debug_renderer_info may not be available for privacy reasons
    console.warn('[WebGL] GPU info extension not available');
  }
  
  return { renderer, vendor };
};

// Get WebGL capabilities
const getCapabilities = (gl: WebGLRenderingContext | WebGL2RenderingContext): {
  maxTextureSize: number;
  maxRenderbufferSize: number;
  maxViewportDims: number[];
  floatTexturesSupported: boolean;
  depthTextureSupported: boolean;
} => {
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;
  const maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 2048;
  const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS) || [2048, 2048];
  
  // Check for float texture support (needed for HDR effects)
  const floatTexturesSupported = !!(
    gl.getExtension('OES_texture_float') || 
    gl.getExtension('OES_texture_half_float')
  );
  
  // Check for depth texture support (needed for shadows)
  const depthTextureSupported = !!(
    gl.getExtension('WEBGL_depth_texture') || 
    gl.getExtension('WEBKIT_WEBGL_depth_texture')
  );
  
  return {
    maxTextureSize,
    maxRenderbufferSize,
    maxViewportDims,
    floatTexturesSupported,
    depthTextureSupported,
  };
};

// Determine recommended graphics tier based on capabilities (all platforms)
const determineRecommendedTier = (
  browser: WebGLCapabilities['browser'],
  device: ReturnType<typeof detectDevice>,
  contextType: 'webgl2' | 'webgl' | 'none',
  gpuRenderer: string,
  capabilities: ReturnType<typeof getCapabilities>
): WebGLCapabilities['recommendedTier'] => {
  if (contextType === 'none') return 'fallback';
  
  const renderer = gpuRenderer.toLowerCase();
  
  // VR Headsets - optimize for their GPUs
  if (device.isVRHeadset) {
    if (device.isQuest) {
      // Quest 3 has better GPU than Quest 2
      if (renderer.includes('adreno 7')) return 'high';
      if (renderer.includes('adreno 6')) return 'medium';
      return 'medium';
    }
    // Other VR headsets (Pico, Vive, etc.)
    return 'medium';
  }
  
  // VR browsers on headsets
  if (browser === 'oculus' || browser === 'wolvic') {
    return 'medium';
  }
  
  // iOS Safari - conservative settings
  if (device.isIOS) {
    if (renderer.includes('apple gpu') || renderer.includes('apple a17') || renderer.includes('apple a16')) {
      return 'medium';
    }
    if (renderer.includes('apple a15') || renderer.includes('apple a14')) {
      return 'medium';
    }
    return 'low';
  }
  
  // Android devices
  if (device.isAndroid) {
    // High-end Adreno or Mali GPUs
    if (renderer.includes('adreno 7') || renderer.includes('mali-g7') || renderer.includes('mali-g9')) {
      return 'medium';
    }
    if (renderer.includes('adreno 6') || renderer.includes('mali-g5') || renderer.includes('mali-g6')) {
      return 'medium';
    }
    return 'low';
  }
  
  // Safari desktop - Apple Silicon is powerful
  if (browser === 'safari') {
    if (renderer.includes('apple m3')) return 'ultra';
    if (renderer.includes('apple m2') || renderer.includes('apple m1')) return 'high';
    return 'medium';
  }
  
  // Desktop GPUs - full tier detection
  const ultraGPUs = ['rtx 40', 'rtx 4', 'rtx 30', 'rtx 3', 'apple m3 pro', 'apple m3 max', 'radeon rx 7', 'arc a7'];
  const highGPUs = ['rtx 20', 'rtx 2', 'gtx 1080', 'gtx 1070', 'apple m1', 'apple m2', 'apple m3', 'radeon rx 5', 'radeon rx 6', 'arc a5'];
  const mediumGPUs = ['gtx 1060', 'gtx 1050', 'gtx 9', 'radeon rx 5', 'intel iris', 'iris xe', 'iris plus'];
  const lowGPUs = ['intel hd', 'intel uhd 6', 'mali-4', 'mali-t', 'adreno 5', 'adreno 4', 'powervr'];
  
  if (ultraGPUs.some(g => renderer.includes(g))) return 'ultra';
  if (highGPUs.some(g => renderer.includes(g))) return 'high';
  if (mediumGPUs.some(g => renderer.includes(g))) return 'medium';
  if (lowGPUs.some(g => renderer.includes(g))) return 'low';
  
  // WebGL2 with decent texture size = medium tier minimum
  if (contextType === 'webgl2' && capabilities.maxTextureSize >= 4096) {
    return 'medium';
  }
  
  // Default to medium for unknown configs
  return 'medium';
};

// Full capability detection
export const detectWebGLCapabilities = (): WebGLCapabilities => {
  const browser = detectBrowser();
  const device = detectDevice();
  
  // Default fallback capabilities
  const fallbackCapabilities: WebGLCapabilities = {
    webglSupported: false,
    webgl2Supported: false,
    contextType: 'none',
    renderer: 'unknown',
    vendor: 'unknown',
    browser,
    ...device,
    canRender3D: false,
    recommendedTier: 'fallback',
    maxTextureSize: 0,
    maxRenderbufferSize: 0,
    maxViewportDims: [0, 0],
    floatTexturesSupported: false,
    depthTextureSupported: false,
    error: null,
    errorCode: null,
  };
  
  if (typeof document === 'undefined') {
    return { ...fallbackCapabilities, error: 'No document available', errorCode: 'unknown' };
  }
  
  // Create test canvas
  let canvas: HTMLCanvasElement | null = null;
  
  try {
    canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
  } catch (e) {
    return { ...fallbackCapabilities, error: 'Canvas creation failed', errorCode: 'unknown' };
  }
  
  // Get WebGL context
  const { gl, contextType, error } = createWebGLContext(canvas);
  
  if (!gl || contextType === 'none') {
    return { 
      ...fallbackCapabilities, 
      error: error || 'WebGL context creation failed', 
      errorCode: 'no_webgl' 
    };
  }
  
  // Get GPU info
  const gpuInfo = getGPUInfo(gl);
  
  // Get capabilities
  const capabilities = getCapabilities(gl);
  
  // Determine recommended tier
  const recommendedTier = determineRecommendedTier(
    browser,
    device,
    contextType,
    gpuInfo.renderer,
    capabilities
  );
  
  // Clean up test context
  try {
    const loseContext = gl.getExtension('WEBGL_lose_context');
    if (loseContext) {
      loseContext.loseContext();
    }
  } catch (e) {
    // Ignore cleanup errors
  }
  
  return {
    webglSupported: true,
    webgl2Supported: contextType === 'webgl2',
    contextType,
    renderer: gpuInfo.renderer,
    vendor: gpuInfo.vendor,
    browser,
    ...device,
    canRender3D: true,
    recommendedTier,
    ...capabilities,
    error: null,
    errorCode: null,
  };
};

// Hook for reactive capability detection
export const useWebGLCapabilities = () => {
  const [capabilities, setCapabilities] = useState<WebGLCapabilities | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  
  const detect = useCallback(() => {
    setIsLoading(true);
    
    // Slight delay to ensure DOM is ready
    requestAnimationFrame(() => {
      try {
        const caps = detectWebGLCapabilities();
        setCapabilities(caps);
      } catch (e) {
        console.error('[WebGL] Detection failed:', e);
        setCapabilities({
          webglSupported: false,
          webgl2Supported: false,
          contextType: 'none',
          renderer: 'unknown',
          vendor: 'unknown',
          browser: detectBrowser(),
          ...detectDevice(),
          canRender3D: false,
          recommendedTier: 'fallback',
          maxTextureSize: 0,
          maxRenderbufferSize: 0,
          maxViewportDims: [0, 0],
          floatTexturesSupported: false,
          depthTextureSupported: false,
          error: e instanceof Error ? e.message : 'Unknown error',
          errorCode: 'unknown',
        });
      }
      setIsLoading(false);
    });
  }, []);
  
  // Initial detection
  useEffect(() => {
    detect();
  }, [detect, retryCount]);
  
  // Retry function
  const retry = useCallback(() => {
    setRetryCount(c => c + 1);
  }, []);
  
  // Get browser-specific troubleshooting tips (cross-platform)
  const getTroubleshootingTips = useCallback((): string[] => {
    if (!capabilities) return [];
    
    const tips: string[] = [];
    
    if (!capabilities.canRender3D) {
      switch (capabilities.browser) {
        case 'safari':
          tips.push('Safari: Enable WebGL in Develop → Experimental Features → WebGL 2.0');
          tips.push('Update macOS to the latest version for better WebGL support');
          if (capabilities.isMac) {
            tips.push('For Apple Silicon Macs, ensure you are using Safari 15.4 or later');
          }
          break;
        case 'chrome':
          tips.push('Chrome: Check chrome://gpu for hardware acceleration status');
          tips.push('Disable extensions that might block WebGL');
          tips.push('Try chrome://flags and enable "Override software rendering list"');
          break;
        case 'firefox':
          tips.push('Firefox: Check about:config and ensure webgl.disabled is false');
          tips.push('Try setting webgl.force-enabled to true in about:config');
          tips.push('Update your graphics drivers');
          break;
        case 'edge':
          tips.push('Edge: Check edge://gpu for hardware acceleration');
          tips.push('Enable "Use hardware acceleration when available" in Settings');
          break;
        case 'opera':
          tips.push('Opera: Enable hardware acceleration in Settings → Browser → System');
          break;
        case 'brave':
          tips.push('Brave: Check brave://gpu and ensure WebGL is enabled');
          tips.push('Disable Brave Shields temporarily to test');
          break;
        case 'samsung':
          tips.push('Samsung Internet: Ensure you have the latest version');
          tips.push('Try enabling "Labs → WebXR" in settings');
          break;
        case 'oculus':
          tips.push('Oculus Browser: This browser is optimized for VR - try refreshing');
          tips.push('Check if other VR apps are running and close them');
          break;
        case 'wolvic':
          tips.push('Wolvic/Firefox Reality: Ensure you have the latest version');
          break;
        default:
          tips.push('Try updating your browser to the latest version');
          tips.push('Ensure hardware acceleration is enabled in browser settings');
      }
      
      // Mobile-specific tips
      if (capabilities.isMobile) {
        tips.push('Close other apps to free up GPU resources');
        tips.push('Restart your device if issues persist');
      }
      
      // iOS-specific tips
      if (capabilities.isIOS) {
        tips.push('iOS: Try Safari - other browsers use the same WebKit engine');
        tips.push('Ensure Low Power Mode is disabled for better graphics performance');
      }
      
      // Android-specific tips
      if (capabilities.isAndroid) {
        tips.push('Android: Try Chrome or Firefox for best WebGL support');
        tips.push('Check Developer Options → Force GPU rendering');
      }
      
      tips.push('Close other GPU-intensive applications');
      tips.push('Restart your browser');
    }
    
    return tips;
  }, [capabilities]);
  
  return {
    capabilities,
    isLoading,
    retry,
    getTroubleshootingTips,
  };
};

export default useWebGLCapabilities;
