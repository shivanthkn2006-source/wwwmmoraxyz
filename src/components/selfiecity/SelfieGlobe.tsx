import React, { useRef, useMemo, Suspense, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import WeatherSystem from './GlobeWeatherSystem';
import InstancedSelfiePins from './InstancedSelfiePins';
import GlobeCameraController from './GlobeCameraController';
import { HolographicLoader } from './HolographicLoader';
import { useGlobeTextures } from '@/hooks/useGlobeTextures';
import { useGlobeCleanup, useCanvasCleanup } from '@/hooks/useGlobeCleanup';
import { useMemoryLeakPlumber } from '@/hooks/useMemoryLeakPlumber';
import { useDeviceTierContext } from '@/contexts/DeviceTierContext';
import { SelfieCityPin } from '@/hooks/useSelfieCityStore';
import useGlobeInputControls from '@/hooks/useGlobeInputControls';
import { usePhantomVisible } from '@/stores/usePhantomStore'; // PROTOCOL PHANTOM

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================
const GLOBE_RADIUS = 1;
const CLOUD_RADIUS = 1.02;
const ATMOSPHERE_RADIUS = 1.15;

// ============================================
// ATMOSPHERE SHADER (Fresnel Glow Effect)
// ============================================
const AtmosphereShader = {
  uniforms: {
    coefficient: { value: 0.5 },
    power: { value: 2.0 },
    glowColor: { value: new THREE.Color(0x93cfef) },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPositionNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float coefficient;
    uniform float power;
    uniform vec3 glowColor;
    varying vec3 vNormal;
    varying vec3 vPositionNormal;
    void main() {
      float intensity = pow(coefficient + dot(vPositionNormal, vNormal), power);
      gl_FragColor = vec4(glowColor, intensity * 0.6);
    }
  `,
};

// ============================================
// EARTH COMPONENT (Tier-Optimized)
// ============================================
interface EarthProps {
  sphereSegments: number;
  cloudSegments: number;
  enableClouds: boolean;
  enableBump: boolean;
  enableSpecular: boolean;
  enableAtmosphere: boolean;
  anisotropy: number;
  textureUrls: {
    day: string;
    night: string;
    clouds: string;
    bump: string;
    specular: string;
  };
}

const Earth: React.FC<EarthProps> = ({
  sphereSegments,
  cloudSegments,
  enableClouds,
  enableBump,
  enableSpecular,
  enableAtmosphere,
  anisotropy,
  textureUrls,
}) => {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  
  // Load textures based on tier configuration
  const texturesToLoad = useMemo(() => {
    const urls = [textureUrls.day, textureUrls.night];
    if (enableClouds) urls.push(textureUrls.clouds);
    if (enableBump) urls.push(textureUrls.bump);
    if (enableSpecular) urls.push(textureUrls.specular);
    return urls;
  }, [textureUrls, enableClouds, enableBump, enableSpecular]);
  
  const loadedTextures = useTexture(texturesToLoad);
  
  // Map loaded textures
  const [dayMap, nightMap, cloudsMap, bumpMap, specularMap] = useMemo(() => {
    const day = Array.isArray(loadedTextures) ? loadedTextures[0] : loadedTextures;
    const night = Array.isArray(loadedTextures) ? loadedTextures[1] : null;
    const clouds = enableClouds && Array.isArray(loadedTextures) ? loadedTextures[2] : null;
    const bump = enableBump && Array.isArray(loadedTextures) ? loadedTextures[enableClouds ? 3 : 2] : null;
    const specular = enableSpecular && Array.isArray(loadedTextures) 
      ? loadedTextures[enableClouds && enableBump ? 4 : enableClouds || enableBump ? 3 : 2] 
      : null;
    
    return [day, night, clouds, bump, specular];
  }, [loadedTextures, enableClouds, enableBump, enableSpecular]);

  // Configure texture settings
  useMemo(() => {
    [dayMap, nightMap, cloudsMap, bumpMap, specularMap].forEach(texture => {
      if (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = anisotropy;
      }
    });
  }, [dayMap, nightMap, cloudsMap, bumpMap, specularMap, anisotropy]);

  // Create custom shader material for day/night blending
  const earthMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayMap },
        nightTexture: { value: nightMap },
        bumpTexture: { value: bumpMap },
        specularTexture: { value: specularMap },
        sunDirection: { value: new THREE.Vector3(5, 3, 5).normalize() },
        hasBump: { value: enableBump && bumpMap ? 1.0 : 0.0 },
        hasSpecular: { value: enableSpecular && specularMap ? 1.0 : 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vSunDirection;
        uniform vec3 sunDirection;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vSunDirection = sunDirection;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform sampler2D specularTexture;
        uniform float hasSpecular;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vSunDirection;
        
        void main() {
          vec3 dayColor = texture2D(dayTexture, vUv).rgb;
          vec3 nightColor = texture2D(nightTexture, vUv).rgb;
          float specular = hasSpecular > 0.5 ? texture2D(specularTexture, vUv).r : 0.0;
          
          // Calculate sun intensity based on angle
          float sunIntensity = dot(vNormal, vSunDirection);
          
          // Smooth transition between day and night
          float mixFactor = smoothstep(-0.1, 0.2, sunIntensity);
          
          // Blend day and night textures
          vec3 color = mix(nightColor * 1.5, dayColor, mixFactor);
          
          // Add specular highlight on water
          float spec = pow(max(0.0, sunIntensity), 20.0) * specular * 0.5;
          color += vec3(spec);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
  }, [dayMap, nightMap, bumpMap, specularMap, enableBump, enableSpecular]);

  // Animate clouds rotation (only if enabled)
  useFrame((state, delta) => {
    if (cloudsRef.current && enableClouds) {
      cloudsRef.current.rotation.y += delta * 0.02;
    }
  });

  return (
    <group>
      {/* Main Earth Sphere */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[GLOBE_RADIUS, sphereSegments, sphereSegments]} />
        <primitive object={earthMaterial} attach="material" />
      </mesh>
      
      {/* Cloud Layer (conditional based on tier) */}
      {enableClouds && cloudsMap && (
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[CLOUD_RADIUS, cloudSegments, cloudSegments]} />
          <meshPhongMaterial
            map={cloudsMap}
            transparent
            opacity={0.4}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Atmosphere Glow (conditional based on tier) */}
      {enableAtmosphere && (
        <mesh scale={[ATMOSPHERE_RADIUS, ATMOSPHERE_RADIUS, ATMOSPHERE_RADIUS]}>
          <sphereGeometry args={[1, sphereSegments, sphereSegments]} />
          <shaderMaterial
            {...AtmosphereShader}
            transparent
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
};

// ============================================
// SUN LIGHT
// ============================================
const SunLight: React.FC = () => {
  return (
    <>
      <directionalLight
        position={[5, 3, 5]}
        intensity={2}
        color="#ffffff"
      />
      <ambientLight intensity={0.15} color="#4488ff" />
    </>
  );
};

// ============================================
// SCENE SETUP & CONTROLS
// ============================================
interface GlobeSceneProps {
  weatherEnabled?: boolean;
  selfies?: SelfieCityPin[];
  onSelfieSelect?: (selfie: SelfieCityPin) => void;
  textureSettings: ReturnType<typeof useGlobeTextures>;
}

const GlobeScene: React.FC<GlobeSceneProps> = ({ 
  weatherEnabled = true, 
  selfies = [], 
  onSelfieSelect,
  textureSettings 
}) => {
  const { camera, gl, scene } = useThree();
  const { registerRenderer, registerScene } = useGlobeCleanup();
  
  // Register for cleanup on unmount
  useEffect(() => {
    registerRenderer(gl);
    registerScene(scene);
  }, [gl, scene, registerRenderer, registerScene]);
  
  // Set initial camera position
  useMemo(() => {
    camera.position.set(0, 0, 2.5);
  }, [camera]);

  const { config, textureUrls, tier, particleMultiplier } = textureSettings;

  return (
    <>
      {/* Starfield Background - reduced count for lower tiers */}
      <Stars
        radius={100}
        depth={50}
        count={tier === 'C' ? 2000 : tier === 'B' ? 3500 : 5000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />
      
      {/* Lighting */}
      <SunLight />
      
      {/* Earth Globe - Tier Optimized */}
      <Earth 
        sphereSegments={config.sphereSegments}
        cloudSegments={config.cloudSegments}
        enableClouds={config.enableClouds}
        enableBump={config.enableBump}
        enableSpecular={config.enableSpecular}
        enableAtmosphere={config.enableAtmosphere}
        anisotropy={config.anisotropy}
        textureUrls={textureUrls}
      />
      
      {/* Dynamic Weather System - Particle count adjusted by tier */}
      <WeatherSystem 
        enabled={weatherEnabled} 
        particleMultiplier={particleMultiplier}
        tier={tier}
      />
      
      {/* Selfie Pins - GPU Instanced for 500+ users */}
      <InstancedSelfiePins selfies={selfies} onSelfieSelect={onSelfieSelect} />
      
      {/* Camera Controller - Voice Navigation */}
      <GlobeCameraController />
      
      {/* Orbit Controls */}
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        enableRotate={true}
        zoomSpeed={0.6}
        rotateSpeed={0.4}
        minDistance={1.5}
        maxDistance={10}
        autoRotate={true}
        autoRotateSpeed={0.3}
        enableDamping={true}
        dampingFactor={0.05}
        maxPolarAngle={Math.PI * 0.85}
        minPolarAngle={Math.PI * 0.15}
      />
    </>
  );
};

// ============================================
// MAIN COMPONENT EXPORT
// ============================================
interface SelfieGlobeProps {
  className?: string;
  onLocationSelect?: (lat: number, lng: number) => void;
  weatherEnabled?: boolean;
  selfies?: SelfieCityPin[];
  onSelfieSelect?: (selfie: SelfieCityPin) => void;
}

const SelfieGlobe: React.FC<SelfieGlobeProps> = ({ 
  className = '', 
  onLocationSelect, 
  weatherEnabled = true,
  selfies = [],
  onSelfieSelect
}) => {
  const textureSettings = useGlobeTextures();
  const { tier, tierClasses } = useDeviceTierContext();
  const isPhantomVisible = usePhantomVisible(); // PROTOCOL PHANTOM
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Memory Leak Plumber (Phase 3) - Aggressive garbage collection
  const memoryPlumber = useMemoryLeakPlumber({
    cleanupOnUnmount: true,
    cleanupOnRouteChange: true,
    cleanupOnVisibilityHidden: true,
    aggressiveMode: true,
    logToZoeCore: true,
  });
  
  // Initialize globe input controls (mouse, touch, keyboard, trackpad)
  const { setupListeners, isUserInteracting } = useGlobeInputControls({
    enabled: true,
    rotationSpeed: 0.008,
    keyboardSpeed: 0.06,
  });
  
  // Setup input listeners when container is available + auto-focus
  useEffect(() => {
    if (containerRef.current) {
      // Auto-focus container to enable keyboard controls immediately
      containerRef.current.focus();
      const cleanup = setupListeners(containerRef.current);
      return cleanup;
    }
  }, [setupListeners]);
  
  // Cleanup callback for Canvas unmount - with Memory Leak Plumber
  const handleCleanup = useCallback(() => {
    console.log(`[SelfieGlobe] ✅ Memory Cleaned (Tier ${tier} cleanup triggered)`);
    memoryPlumber.cleanupLocal('globe_unmount');
  }, [tier, memoryPlumber]);
  
  const { setCleanup } = useCanvasCleanup(handleCleanup);
  
  // Log tier info on mount
  useEffect(() => {
    console.log(`[SelfieGlobe] Initializing with Tier ${tier} (${textureSettings.tierName})`);
    console.log(`[SelfieGlobe] Config: ${textureSettings.config.resolution} textures, ${textureSettings.config.sphereSegments} segments`);
    console.log(`[SelfieGlobe] Features: Clouds=${textureSettings.config.enableClouds}, Bump=${textureSettings.config.enableBump}`);
  }, [tier, textureSettings]);
  
  return (
    <div 
      ref={containerRef}
      className={`w-full h-full bg-black ${className} ${tierClasses} touch-none outline-none`}
      tabIndex={0}
      aria-label="Interactive 3D Globe - Use mouse, touch, or keyboard arrows to rotate"
      onFocus={() => console.log('[SelfieGlobe] Container focused - keyboard controls active')}
    >
      <Canvas
        ref={canvasRef}
        camera={{ fov: 45, near: 0.1, far: 1000 }}
        gl={{ 
          antialias: tier !== 'C', // Disable antialiasing on low-end
          alpha: false,
          powerPreference: tier === 'C' ? 'low-power' : 'high-performance',
          stencil: false,
          depth: true,
        }}
        dpr={textureSettings.dpr}
        style={{ background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0f 100%)' }}
        onCreated={({ gl }) => {
          // Register renderer cleanup with Memory Leak Plumber
          memoryPlumber.registerWebGL(undefined, undefined, undefined, gl);
          
          // Register cleanup on canvas creation
          setCleanup(() => {
            gl.dispose();
            gl.forceContextLoss();
            console.log('[SelfieGlobe] ✅ Memory Cleaned (WebGL context disposed)');
          });
        }}
      >
        <Suspense fallback={<HolographicLoader message={`LOADING GAIA (${textureSettings.tierName})...`} />}>
          <GlobeScene 
            weatherEnabled={weatherEnabled} 
            selfies={selfies}
            onSelfieSelect={onSelfieSelect}
            textureSettings={textureSettings}
          />
        </Suspense>
      </Canvas>
      
      {/* User interaction indicator */}
      {isUserInteracting && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary/20 backdrop-blur-sm rounded-full text-xs font-mono text-primary/80 pointer-events-none">
          MANUAL CONTROL
        </div>
      )}
      
      {/* Tier indicator (dev mode only - remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-[10px] font-mono text-primary/70">
          Tier {tier} • {textureSettings.config.resolution} • {textureSettings.config.sphereSegments}seg
        </div>
      )}
      
      {/* Control hint */}
      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/30 rounded text-[9px] font-mono text-muted-foreground/50 pointer-events-none">
        ↑↓←→ or WASD to rotate • +/- to zoom
      </div>
    </div>
  );
};

export default SelfieGlobe;
