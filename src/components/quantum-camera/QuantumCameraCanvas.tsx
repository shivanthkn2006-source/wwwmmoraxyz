// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT OPTIC-X: Quantum Camera Canvas
// Fullscreen WebGL layer with 2050 Cybernetic Eye Post-Processing
// ACES Filmic + Deep Void Blue + Stellar Gold + Audio-Reactive Displacement
// + TRINITY FILTER SET: Chronos Echo, DHF Soul-Ray, Quantum Flux
// + SATELLITE SHIELD: Optical Encryption & Protocol EMP
// RESPONSIVE: 4.1" mobile to 16K displays | Draggable HUD Windows
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import LiquidDisplacementMesh from './LiquidDisplacementMesh';
import TrinityFilterMesh from './TrinityFilterMesh';
import TrinityFilterSelector from './TrinityFilterSelector';
import SatelliteShieldHUD from './SatelliteShieldHUD';
import ProtocolEMPOverlay from './ProtocolEMPOverlay';
import LiveAuditHUD from './LiveAuditHUD';
import ThermalGovernorHUD from './ThermalGovernorHUD';
import PerformanceGovernorHUD from './PerformanceGovernorHUD';
import DraggableHUDWindow from './DraggableHUDWindow';
import { useQuantumCamera, QuantumCameraConfig } from '@/hooks/useQuantumCamera';
import { useTrinityFilters } from '@/hooks/useTrinityFilters';
import { useSatelliteShield } from '@/hooks/useSatelliteShield';
import { useLiveAudit } from '@/hooks/useLiveAudit';
import { useThermalGovernor } from '@/hooks/useThermalGovernor';
import { usePerformanceGovernor } from '@/hooks/usePerformanceGovernor';
import { useMemoryLeakPlumber } from '@/hooks/useMemoryLeakPlumber';
import { Camera, CameraOff, Settings, Zap, Volume2, Thermometer, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// Responsive breakpoint detection hook
const useResponsiveCompact = () => {
  const [isCompact, setIsCompact] = useState(false);
  
  useEffect(() => {
    const checkSize = () => {
      // Compact mode for screens smaller than 768px (tablets and phones)
      setIsCompact(window.innerWidth < 768);
    };
    
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);
  
  return isCompact;
};

// Frame counter component for thermal governor
const FrameCounter: React.FC<{ onTick: () => void }> = ({ onTick }) => {
  useFrame(() => onTick());
  return null;
};

interface QuantumCameraCanvasProps {
  className?: string;
  showControls?: boolean;
  initialConfig?: Partial<QuantumCameraConfig>;
  onCapture?: (imageData: string) => void;
}

const QuantumCameraCanvas: React.FC<QuantumCameraCanvasProps> = ({
  className = '',
  showControls = true,
  initialConfig = {},
  onCapture,
}) => {
  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<QuantumCameraConfig>({
    displacementIntensity: 0.4,
    colorGradeIntensity: 0.8,
    voidBlueDepth: 0.7,
    stellarGoldIntensity: 0.6,
    filmicExposure: 1.2,
    chromaticAberration: 0.005,
    vignetteStrength: 0.4,
    scanlineOpacity: 0.08,
    noiseIntensity: 0.03,
    ...initialConfig,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    videoRef,
    isActive,
    hasPermission,
    error,
    audioAnalysis,
    fps,
    startCamera,
    stopCamera,
  } = useQuantumCamera(config);

  // Trinity Filters integration
  const trinityFilters = useTrinityFilters();

  // Satellite Shield - Optical Encryption
  const satelliteShield = useSatelliteShield();

  // Live Audit - Phase 4 God Mode verification
  const liveAudit = useLiveAudit(trinityFilters.state, satelliteShield.state);

  // Thermal Governor - Digital Thermal Protection
  const thermalGovernor = useThermalGovernor();
  const [showThermalHUD, setShowThermalHUD] = useState(false);

  // Performance Governor (Project Coolant) - FPS/Memory based downgrades
  const performanceGovernor = usePerformanceGovernor();
  const [showPerformanceHUD, setShowPerformanceHUD] = useState(true); // Show by default

  // Responsive compact mode for mobile/tablet
  const isCompactMode = useResponsiveCompact();
  const [hudCompact, setHudCompact] = useState<Record<string, boolean>>({
    trinity: false,
    satellite: false,
    audit: false,
  });
  
  // Container ref for drag constraints
  const containerRef = useRef<HTMLDivElement>(null);

  // Memory Leak Plumber (Phase 3) - Aggressive garbage collection
  const memoryPlumber = useMemoryLeakPlumber({
    cleanupOnUnmount: true,
    cleanupOnRouteChange: true,
    cleanupOnVisibilityHidden: true,
    aggressiveMode: true,
    logToZoeCore: true,
  });

  // Start/stop thermal & performance monitoring with camera
  useEffect(() => {
    if (isActive) {
      thermalGovernor.startMonitoring();
      performanceGovernor.startMonitoring();
    } else {
      thermalGovernor.stopMonitoring();
      performanceGovernor.stopMonitoring();
    }
  }, [isActive]);

  // Auto-activate shield when camera starts
  useEffect(() => {
    if (isActive && !satelliteShield.isActive) {
      satelliteShield.activate();
    } else if (!isActive && satelliteShield.isActive) {
      satelliteShield.deactivate();
    }
  }, [isActive, satelliteShield.isActive]);

  // Create video texture when camera starts - with Memory Leak Plumber registration
  useEffect(() => {
    if (isActive && videoRef.current) {
      const texture = new THREE.VideoTexture(videoRef.current);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.format = THREE.RGBAFormat;
      texture.colorSpace = THREE.SRGBColorSpace;
      setVideoTexture(texture);

      // Register texture for cleanup with Memory Leak Plumber
      memoryPlumber.registerWebGL(undefined, undefined, texture);

      return () => {
        texture.dispose();
        setVideoTexture(null);
        console.log('[QuantumCamera] ✅ Memory Cleaned (video texture disposed)');
      };
    }
  }, [isActive, videoRef, memoryPlumber]);

  // Capture screenshot
  const handleCapture = () => {
    if (canvasRef.current && onCapture) {
      const imageData = canvasRef.current.toDataURL('image/png');
      onCapture(imageData);
    }
  };

  // Config update helper
  const updateConfig = (key: keyof QuantumCameraConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      {/* Protocol EMP Overlay - Highest z-index */}
      <ProtocolEMPOverlay
        isActive={satelliteShield.protocolEMPTriggered}
        reason={satelliteShield.empReason}
      />

      {/* Hidden video element */}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        autoPlay
        muted
      />

      {/* WebGL Canvas - Conditionally render based on thermal governor */}
      {thermalGovernor.canEnableWebGL ? (
        <Canvas
          ref={canvasRef as any}
          camera={{ position: [0, 0, 5], fov: 50 }}
          gl={{
            antialias: thermalGovernor.featureFlags.maxShaderComplexity === 'full',
            alpha: false,
            preserveDrawingBuffer: true,
            powerPreference: thermalGovernor.isOverheating ? 'low-power' : 'high-performance',
          }}
          dpr={Math.min(thermalGovernor.featureFlags.pixelRatio, window.devicePixelRatio)}
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #020510 0%, #0a0f1f 100%)' }}
          frameloop={thermalGovernor.isCritical ? 'demand' : 'always'}
        >
          {/* Frame counter for thermal & performance monitoring */}
          <FrameCounter onTick={() => {
            thermalGovernor.tick();
            performanceGovernor.tick();
          }} />
          
          <Suspense fallback={null}>
            {isActive && videoTexture && (
              <>
                {/* Base quantum optics layer - disable displacement if thermal critical */}
                {thermalGovernor.featureFlags.enableDisplacement && (
                  <LiquidDisplacementMesh
                    videoTexture={videoTexture}
                    config={config}
                    audioAnalysis={thermalGovernor.featureFlags.enableAudioAnalysis ? audioAnalysis : {
                      frequency: null,
                      timeDomain: null,
                      volume: 0,
                      bassLevel: 0,
                      midLevel: 0,
                      trebleLevel: 0,
                    }}
                  />
                )}
                {/* Trinity Filter overlay - only if thermal allows */}
                {thermalGovernor.canEnableTrinity && trinityFilters.activeFilter !== 'none' && (
                  <TrinityFilterMesh
                    videoTexture={videoTexture}
                    filterType={trinityFilters.activeFilter}
                    config={trinityFilters.getFilterConfig()}
                  />
                )}
              </>
            )}
          </Suspense>
        </Canvas>
      ) : (
        /* Fallback for disabled WebGL (critical thermal state) - COMPACT */
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
          <div className="text-center p-3 sm:p-4 bg-red-900/30 rounded-md border border-red-500/50 max-w-[200px] sm:max-w-[240px]">
            <Thermometer className="w-6 h-6 sm:w-8 sm:h-8 text-red-400 mx-auto mb-1.5 animate-pulse" />
            <h3 className="text-[10px] sm:text-xs font-mono text-red-300 mb-1">THERMAL PROTECTION</h3>
            <p className="text-[8px] sm:text-[9px] text-gray-400">
              Camera disabled to prevent overheating. Auto-resume when cooled.
            </p>
          </div>
        </div>
      )}

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top HUD */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-auto">
          {/* Status Display */}
          <div className="bg-black/60 backdrop-blur-md rounded-lg px-4 py-2 border border-cyan-500/30">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-xs font-mono text-cyan-300">
                {isActive ? 'QUANTUM OPTICS ONLINE' : 'STANDBY'}
              </span>
              {isActive && (
                <span className="text-xs font-mono text-amber-400">{fps} FPS</span>
              )}
            </div>
          </div>

          {/* Audio Levels */}
          {isActive && (
            <div className="bg-black/60 backdrop-blur-md rounded-lg px-4 py-2 border border-purple-500/30">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-purple-400" />
                <div className="flex gap-1">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-8 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="w-full bg-gradient-to-t from-purple-500 to-pink-500 transition-all duration-75"
                        style={{ height: `${(audioAnalysis.bassLevel || 0) * 100}%` }}
                      />
                    </div>
                    <span className="text-[8px] text-purple-300 mt-1">BASS</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-8 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="w-full bg-gradient-to-t from-cyan-500 to-blue-500 transition-all duration-75"
                        style={{ height: `${(audioAnalysis.midLevel || 0) * 100}%` }}
                      />
                    </div>
                    <span className="text-[8px] text-cyan-300 mt-1">MID</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-8 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="w-full bg-gradient-to-t from-amber-500 to-yellow-400 transition-all duration-75"
                        style={{ height: `${(audioAnalysis.trebleLevel || 0) * 100}%` }}
                      />
                    </div>
                    <span className="text-[8px] text-amber-300 mt-1">HIGH</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Trinity Filter Selector - Left Side - DRAGGABLE */}
        {isActive && (
          <DraggableHUDWindow
            id="trinity-filters"
            title="FILTERS"
            initialPosition={{ x: 16, y: 80 }}
            isCompact={isCompactMode || hudCompact.trinity}
            onCompactToggle={() => setHudCompact(prev => ({ ...prev, trinity: !prev.trinity }))}
            className="absolute pointer-events-auto"
            zIndex={41}
          >
            <div className={`space-y-2 sm:space-y-3 max-h-[40vh] sm:max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent pr-1 ${isCompactMode ? 'w-[140px]' : 'w-auto'}`}>
              <TrinityFilterSelector
                activeFilter={trinityFilters.activeFilter}
                onSelectFilter={trinityFilters.setActiveFilter}
                filterState={trinityFilters.state}
                onSimulateECN={trinityFilters.simulateECNState}
              />
            </div>
          </DraggableHUDWindow>
        )}

        {/* Satellite Shield HUD - DRAGGABLE */}
        {isActive && thermalGovernor.featureFlags.enableSatelliteShield && (
          <DraggableHUDWindow
            id="satellite-shield"
            title="SHIELD"
            initialPosition={{ x: 16, y: 280 }}
            isCompact={isCompactMode || hudCompact.satellite}
            onCompactToggle={() => setHudCompact(prev => ({ ...prev, satellite: !prev.satellite }))}
            className="absolute pointer-events-auto"
            zIndex={42}
          >
            <SatelliteShieldHUD
              state={satelliteShield.state}
              onActivate={satelliteShield.activate}
              onDeactivate={satelliteShield.deactivate}
              onResetEMP={satelliteShield.resetProtocolEMP}
            />
          </DraggableHUDWindow>
        )}
        
        {/* Thermal Governor HUD - DRAGGABLE */}
        {isActive && showThermalHUD && (
          <DraggableHUDWindow
            id="thermal-governor"
            title="THERMAL"
            initialPosition={{ x: 16, y: 420 }}
            isCompact={isCompactMode}
            className="absolute pointer-events-auto"
            zIndex={43}
          >
            <ThermalGovernorHUD
              metrics={thermalGovernor.metrics}
              featureFlags={thermalGovernor.featureFlags}
              isActive={thermalGovernor.isActive}
              onForceCooldown={thermalGovernor.forceCooldown}
            />
          </DraggableHUDWindow>
        )}

        {/* Performance Governor HUD (Project Coolant) - Top Header Slide-Down */}
        {isActive && showPerformanceHUD && (
          <PerformanceGovernorHUD
            metrics={performanceGovernor.metrics}
            coolantActions={performanceGovernor.coolantActions}
            isActive={performanceGovernor.isActive}
            logs={performanceGovernor.governorLogs}
            onForceMode={performanceGovernor.forcePowerMode}
            showLogs={false}
          />
        )}

        {/* Live Audit HUD - Right Side (Phase 4) - DRAGGABLE */}
        {isActive && trinityFilters.activeFilter !== 'none' && (
          <DraggableHUDWindow
            id="live-audit"
            title="AUDIT"
            initialPosition={{ x: typeof window !== 'undefined' ? window.innerWidth - 220 : 300, y: 80 }}
            isCompact={isCompactMode || hudCompact.audit}
            onCompactToggle={() => setHudCompact(prev => ({ ...prev, audit: !prev.audit }))}
            className="absolute pointer-events-auto"
            zIndex={44}
          >
            <div className={`${isCompactMode ? 'w-[140px]' : 'w-52'}`}>
              <LiveAuditHUD
                auditState={liveAudit.state}
                onRunAudit={liveAudit.runFullAudit}
                onSimulate={liveAudit.simulateScenario}
                isExpanded={!isCompactMode}
              />
            </div>
          </DraggableHUDWindow>
        )}

        {/* Error Message */}
        {error && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
            <div className="bg-red-900/80 backdrop-blur-md rounded-lg px-6 py-4 border border-red-500/50">
              <p className="text-red-200 text-sm">{error}</p>
              <Button 
                onClick={startCamera}
                className="mt-3 bg-red-500 hover:bg-red-600"
                size="sm"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Bottom Controls */}
        {showControls && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 pointer-events-auto">
            {/* Camera Toggle */}
            <Button
              onClick={isActive ? stopCamera : startCamera}
              className={`rounded-full w-14 h-14 ${
                isActive 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600'
              }`}
            >
              {isActive ? <CameraOff className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
            </Button>

            {/* Capture Button */}
            {isActive && onCapture && (
              <Button
                onClick={handleCapture}
                className="rounded-full w-14 h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                <Zap className="w-6 h-6" />
              </Button>
            )}

            {/* Settings Popover */}
            {isActive && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="rounded-full w-12 h-12 border-cyan-500/50 bg-black/50"
                  >
                    <Settings className="w-5 h-5 text-cyan-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-black/90 border-cyan-500/30 backdrop-blur-md">
                  <div className="space-y-4">
                    <h4 className="font-mono text-sm text-cyan-300 border-b border-cyan-500/20 pb-2">
                      QUANTUM OPTICS CONTROLS
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-400">Displacement Intensity</label>
                        <Slider
                          value={[config.displacementIntensity]}
                          onValueChange={([v]) => updateConfig('displacementIntensity', v)}
                          max={1}
                          step={0.05}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs text-gray-400">Color Grade</label>
                        <Slider
                          value={[config.colorGradeIntensity]}
                          onValueChange={([v]) => updateConfig('colorGradeIntensity', v)}
                          max={1}
                          step={0.05}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs text-gray-400">Void Blue Depth</label>
                        <Slider
                          value={[config.voidBlueDepth]}
                          onValueChange={([v]) => updateConfig('voidBlueDepth', v)}
                          max={1}
                          step={0.05}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs text-gray-400">Stellar Gold</label>
                        <Slider
                          value={[config.stellarGoldIntensity]}
                          onValueChange={([v]) => updateConfig('stellarGoldIntensity', v)}
                          max={1}
                          step={0.05}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs text-gray-400">Exposure</label>
                        <Slider
                          value={[config.filmicExposure]}
                          onValueChange={([v]) => updateConfig('filmicExposure', v)}
                          min={0.5}
                          max={2}
                          step={0.1}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs text-gray-400">Chromatic Aberration</label>
                        <Slider
                          value={[config.chromaticAberration * 1000]}
                          onValueChange={([v]) => updateConfig('chromaticAberration', v / 1000)}
                          max={20}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs text-gray-400">Vignette</label>
                        <Slider
                          value={[config.vignetteStrength]}
                          onValueChange={([v]) => updateConfig('vignetteStrength', v)}
                          max={1}
                          step={0.05}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs text-gray-400">Scanlines</label>
                        <Slider
                          value={[config.scanlineOpacity * 10]}
                          onValueChange={([v]) => updateConfig('scanlineOpacity', v / 10)}
                          max={5}
                          step={0.5}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}

        {/* Inactive State */}
        {!isActive && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 flex items-center justify-center border border-cyan-500/30">
                <Camera className="w-10 h-10 text-cyan-400" />
              </div>
              <h3 className="text-lg font-mono text-cyan-300 mb-2">QUANTUM CAMERA</h3>
              <p className="text-sm text-gray-400 max-w-xs">
                2050 Cybernetic Eye Simulation with Audio-Reactive Displacement
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Corner Decorations */}
      <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-cyan-500/50 pointer-events-none" />
      <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-cyan-500/50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-cyan-500/50 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-cyan-500/50 pointer-events-none" />
    </div>
  );
};

export default QuantumCameraCanvas;
