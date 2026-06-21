// ═══════════════════════════════════════════════════════════════════════════════
// DIGITAL THERMAL GOVERNOR - Hardware Integrity Protection
// iPhone SE to iPhone 17 Pro Max Adaptive Performance
// Prevents overheating, battery drain, and RAM crashes for 500+ concurrent users
// Connected to Zoe Core for sovereign monitoring
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDeviceTierContext } from '@/contexts/DeviceTierContext';
import { supabase } from '@/integrations/supabase/client';

// ═══ THERMAL THRESHOLDS ═══
type ThermalState = 'cool' | 'warm' | 'hot' | 'critical';
type PowerMode = 'performance' | 'balanced' | 'powersave' | 'emergency';

interface ThermalMetrics {
  cpuLoad: number;          // 0-1 estimated from FPS drops
  memoryPressure: number;   // 0-1 estimated from available memory
  batteryLevel: number;     // 0-1 from Battery API
  isCharging: boolean;
  frameDrops: number;       // Count of frames below target
  thermalState: ThermalState;
  powerMode: PowerMode;
}

interface FeatureFlags {
  enableWebGL: boolean;
  enableTrinityFilters: boolean;
  enableSatelliteShield: boolean;
  enableLiveAudit: boolean;
  enableAudioAnalysis: boolean;
  enableDisplacement: boolean;
  maxShaderComplexity: 'full' | 'reduced' | 'minimal' | 'disabled';
  targetFPS: number;
  pixelRatio: number;
  particleReduction: number; // 0-1, how much to reduce particles
}

// Tier-based feature presets
const TIER_FEATURE_PRESETS: Record<string, FeatureFlags> = {
  // Tier C - iPhone SE, old Android (3-4GB RAM)
  C_COOL: {
    enableWebGL: true,
    enableTrinityFilters: false, // Disabled by default for C
    enableSatelliteShield: false,
    enableLiveAudit: false,
    enableAudioAnalysis: true,
    enableDisplacement: false,
    maxShaderComplexity: 'minimal',
    targetFPS: 30,
    pixelRatio: 1,
    particleReduction: 0.8,
  },
  C_WARM: {
    enableWebGL: true,
    enableTrinityFilters: false,
    enableSatelliteShield: false,
    enableLiveAudit: false,
    enableAudioAnalysis: false,
    enableDisplacement: false,
    maxShaderComplexity: 'disabled',
    targetFPS: 24,
    pixelRatio: 1,
    particleReduction: 1,
  },
  C_HOT: {
    enableWebGL: false, // Kill WebGL entirely
    enableTrinityFilters: false,
    enableSatelliteShield: false,
    enableLiveAudit: false,
    enableAudioAnalysis: false,
    enableDisplacement: false,
    maxShaderComplexity: 'disabled',
    targetFPS: 15,
    pixelRatio: 1,
    particleReduction: 1,
  },
  
  // Tier B - iPhone 12/13, mid Android (6-8GB RAM)
  B_COOL: {
    enableWebGL: true,
    enableTrinityFilters: true,
    enableSatelliteShield: true,
    enableLiveAudit: true,
    enableAudioAnalysis: true,
    enableDisplacement: true,
    maxShaderComplexity: 'reduced',
    targetFPS: 60,
    pixelRatio: 1.5,
    particleReduction: 0.5,
  },
  B_WARM: {
    enableWebGL: true,
    enableTrinityFilters: true,
    enableSatelliteShield: false,
    enableLiveAudit: false,
    enableAudioAnalysis: true,
    enableDisplacement: true,
    maxShaderComplexity: 'minimal',
    targetFPS: 45,
    pixelRatio: 1,
    particleReduction: 0.7,
  },
  B_HOT: {
    enableWebGL: true,
    enableTrinityFilters: false,
    enableSatelliteShield: false,
    enableLiveAudit: false,
    enableAudioAnalysis: false,
    enableDisplacement: false,
    maxShaderComplexity: 'minimal',
    targetFPS: 30,
    pixelRatio: 1,
    particleReduction: 0.9,
  },
  
  // Tier A - iPhone 14/15 Pro, flagship Android (8-12GB RAM)
  A_COOL: {
    enableWebGL: true,
    enableTrinityFilters: true,
    enableSatelliteShield: true,
    enableLiveAudit: true,
    enableAudioAnalysis: true,
    enableDisplacement: true,
    maxShaderComplexity: 'full',
    targetFPS: 120,
    pixelRatio: 2,
    particleReduction: 0,
  },
  A_WARM: {
    enableWebGL: true,
    enableTrinityFilters: true,
    enableSatelliteShield: true,
    enableLiveAudit: true,
    enableAudioAnalysis: true,
    enableDisplacement: true,
    maxShaderComplexity: 'reduced',
    targetFPS: 60,
    pixelRatio: 1.5,
    particleReduction: 0.3,
  },
  A_HOT: {
    enableWebGL: true,
    enableTrinityFilters: true,
    enableSatelliteShield: false,
    enableLiveAudit: false,
    enableAudioAnalysis: true,
    enableDisplacement: true,
    maxShaderComplexity: 'minimal',
    targetFPS: 45,
    pixelRatio: 1,
    particleReduction: 0.5,
  },
  
  // Tier S - iPhone 16+ Pro Max (12GB+ RAM)
  S_COOL: {
    enableWebGL: true,
    enableTrinityFilters: true,
    enableSatelliteShield: true,
    enableLiveAudit: true,
    enableAudioAnalysis: true,
    enableDisplacement: true,
    maxShaderComplexity: 'full',
    targetFPS: 120,
    pixelRatio: 3,
    particleReduction: 0,
  },
  S_WARM: {
    enableWebGL: true,
    enableTrinityFilters: true,
    enableSatelliteShield: true,
    enableLiveAudit: true,
    enableAudioAnalysis: true,
    enableDisplacement: true,
    maxShaderComplexity: 'full',
    targetFPS: 90,
    pixelRatio: 2,
    particleReduction: 0.1,
  },
  S_HOT: {
    enableWebGL: true,
    enableTrinityFilters: true,
    enableSatelliteShield: true,
    enableLiveAudit: false,
    enableAudioAnalysis: true,
    enableDisplacement: true,
    maxShaderComplexity: 'reduced',
    targetFPS: 60,
    pixelRatio: 1.5,
    particleReduction: 0.3,
  },
};

// Get preset key
const getPresetKey = (tier: string, thermal: ThermalState): string => {
  const thermalSuffix = thermal === 'critical' ? 'HOT' : thermal.toUpperCase();
  return `${tier}_${thermalSuffix}`;
};

// Default emergency preset (kill everything)
const EMERGENCY_PRESET: FeatureFlags = {
  enableWebGL: false,
  enableTrinityFilters: false,
  enableSatelliteShield: false,
  enableLiveAudit: false,
  enableAudioAnalysis: false,
  enableDisplacement: false,
  maxShaderComplexity: 'disabled',
  targetFPS: 10,
  pixelRatio: 1,
  particleReduction: 1,
};

export const useThermalGovernor = () => {
  const { tier, capabilities } = useDeviceTierContext();
  
  const [metrics, setMetrics] = useState<ThermalMetrics>({
    cpuLoad: 0,
    memoryPressure: 0,
    batteryLevel: 1,
    isCharging: false,
    frameDrops: 0,
    thermalState: 'cool',
    powerMode: 'balanced',
  });
  
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(
    TIER_FEATURE_PRESETS[`${tier}_COOL`] || TIER_FEATURE_PRESETS['B_COOL']
  );
  
  const [isActive, setIsActive] = useState(false);
  const [governorEvents, setGovernorEvents] = useState<string[]>([]);
  
  const fpsHistoryRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const monitorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // ═══ BATTERY API ═══
  useEffect(() => {
    const checkBattery = async () => {
      try {
        if ('getBattery' in navigator) {
          const battery = await (navigator as any).getBattery();
          
          const updateBattery = () => {
            setMetrics(prev => ({
              ...prev,
              batteryLevel: battery.level,
              isCharging: battery.charging,
            }));
          };
          
          updateBattery();
          battery.addEventListener('levelchange', updateBattery);
          battery.addEventListener('chargingchange', updateBattery);
          
          return () => {
            battery.removeEventListener('levelchange', updateBattery);
            battery.removeEventListener('chargingchange', updateBattery);
          };
        }
      } catch (e) {
        console.warn('[ThermalGovernor] Battery API not available');
      }
    };
    
    checkBattery();
  }, []);
  
  // ═══ MEMORY PRESSURE ESTIMATION ═══
  const estimateMemoryPressure = useCallback((): number => {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      if (memInfo && memInfo.jsHeapSizeLimit) {
        return memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
      }
    }
    // Fallback: estimate from FPS drops
    return fpsHistoryRef.current.length > 0
      ? Math.min(1, fpsHistoryRef.current.filter(f => f < 30).length / fpsHistoryRef.current.length)
      : 0;
  }, []);
  
  // ═══ FPS MONITORING ═══
  const measureFPS = useCallback(() => {
    const now = performance.now();
    const delta = now - lastFrameTimeRef.current;
    
    if (delta >= 1000) {
      const fps = (frameCountRef.current / delta) * 1000;
      fpsHistoryRef.current.push(fps);
      
      if (fpsHistoryRef.current.length > 10) {
        fpsHistoryRef.current.shift();
      }
      
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
      
      const avgFps = fpsHistoryRef.current.reduce((a, b) => a + b, 0) / fpsHistoryRef.current.length;
      const targetFps = featureFlags.targetFPS;
      const cpuLoad = Math.max(0, Math.min(1, 1 - (avgFps / targetFps)));
      
      return { fps: avgFps, cpuLoad };
    }
    
    frameCountRef.current++;
    return null;
  }, [featureFlags.targetFPS]);
  
  // ═══ THERMAL STATE CALCULATION ═══
  const calculateThermalState = useCallback((
    cpuLoad: number,
    memoryPressure: number,
    batteryLevel: number,
    isCharging: boolean
  ): ThermalState => {
    // Weight factors
    const cpuWeight = 0.4;
    const memWeight = 0.3;
    const batteryWeight = 0.3;
    
    // Calculate thermal score (0-1)
    const batteryFactor = isCharging ? 0 : (1 - batteryLevel);
    const thermalScore = (cpuLoad * cpuWeight) + (memoryPressure * memWeight) + (batteryFactor * batteryWeight);
    
    if (thermalScore > 0.85 || cpuLoad > 0.9 || memoryPressure > 0.9) return 'critical';
    if (thermalScore > 0.65 || cpuLoad > 0.75 || memoryPressure > 0.75) return 'hot';
    if (thermalScore > 0.4 || cpuLoad > 0.5) return 'warm';
    return 'cool';
  }, []);
  
  // ═══ POWER MODE DETERMINATION ═══
  const determinePowerMode = useCallback((
    thermalState: ThermalState,
    batteryLevel: number,
    isCharging: boolean
  ): PowerMode => {
    if (thermalState === 'critical') return 'emergency';
    if (thermalState === 'hot' || (batteryLevel < 0.15 && !isCharging)) return 'powersave';
    if (thermalState === 'warm' || (batteryLevel < 0.3 && !isCharging)) return 'balanced';
    return 'performance';
  }, []);
  
  // ═══ FEATURE FLAG UPDATE ═══
  const updateFeatureFlags = useCallback((thermalState: ThermalState, powerMode: PowerMode) => {
    if (powerMode === 'emergency') {
      setFeatureFlags(EMERGENCY_PRESET);
      return;
    }
    
    const presetKey = getPresetKey(tier, thermalState);
    const preset = TIER_FEATURE_PRESETS[presetKey] || TIER_FEATURE_PRESETS['B_COOL'];
    
    setFeatureFlags(preset);
  }, [tier]);
  
  // ═══ LOG TO ZOE CORE ═══
  const logThermalEvent = useCallback(async (
    eventType: 'thermal_warning' | 'thermal_critical' | 'thermal_recovery' | 'power_mode_change',
    details: Record<string, any>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: eventType,
        event_category: 'thermal_governor',
        context_snippet: `${eventType}: ${details.thermalState || details.powerMode}`,
        metadata: {
          ...details,
          tier,
          deviceModel: capabilities?.deviceModel,
          timestamp: new Date().toISOString(),
        },
        dhf_logged: true,
      });
      
      setGovernorEvents(prev => [...prev.slice(-9), `${eventType}: ${JSON.stringify(details)}`]);
    } catch (e) {
      console.warn('[ThermalGovernor] Failed to log event:', e);
    }
  }, [tier, capabilities?.deviceModel]);
  
  // ═══ MAIN MONITORING LOOP ═══
  const startMonitoring = useCallback(() => {
    if (monitorIntervalRef.current) return;
    
    setIsActive(true);
    console.log(`[ThermalGovernor] Started monitoring for Tier ${tier}`);
    
    // Monitor every 2 seconds
    monitorIntervalRef.current = setInterval(() => {
      const fpsResult = measureFPS();
      if (!fpsResult) return;
      
      const memoryPressure = estimateMemoryPressure();
      
      setMetrics(prev => {
        const newThermalState = calculateThermalState(
          fpsResult.cpuLoad,
          memoryPressure,
          prev.batteryLevel,
          prev.isCharging
        );
        
        const newPowerMode = determinePowerMode(
          newThermalState,
          prev.batteryLevel,
          prev.isCharging
        );
        
        // Log state changes
        if (newThermalState !== prev.thermalState) {
          if (newThermalState === 'critical') {
            logThermalEvent('thermal_critical', { thermalState: newThermalState, ...fpsResult });
          } else if (newThermalState === 'hot') {
            logThermalEvent('thermal_warning', { thermalState: newThermalState, ...fpsResult });
          } else if (prev.thermalState === 'hot' || prev.thermalState === 'critical') {
            logThermalEvent('thermal_recovery', { thermalState: newThermalState, ...fpsResult });
          }
        }
        
        if (newPowerMode !== prev.powerMode) {
          logThermalEvent('power_mode_change', { powerMode: newPowerMode, thermalState: newThermalState });
        }
        
        // Update feature flags
        updateFeatureFlags(newThermalState, newPowerMode);
        
        return {
          cpuLoad: fpsResult.cpuLoad,
          memoryPressure,
          batteryLevel: prev.batteryLevel,
          isCharging: prev.isCharging,
          frameDrops: fpsResult.fps < 30 ? prev.frameDrops + 1 : prev.frameDrops,
          thermalState: newThermalState,
          powerMode: newPowerMode,
        };
      });
    }, 2000);
    
    return () => stopMonitoring();
  }, [tier, measureFPS, estimateMemoryPressure, calculateThermalState, determinePowerMode, updateFeatureFlags, logThermalEvent]);
  
  const stopMonitoring = useCallback(() => {
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = null;
    }
    setIsActive(false);
    console.log('[ThermalGovernor] Stopped monitoring');
  }, []);
  
  // ═══ MANUAL FRAME TICK (for WebGL scenes) ═══
  const tick = useCallback(() => {
    frameCountRef.current++;
  }, []);
  
  // ═══ FORCE COOLDOWN ═══
  const forceCooldown = useCallback(() => {
    setFeatureFlags(TIER_FEATURE_PRESETS[`${tier}_HOT`] || EMERGENCY_PRESET);
    logThermalEvent('thermal_warning', { 
      reason: 'forced_cooldown', 
      thermalState: 'hot' 
    });
    
    // Auto-recover after 30 seconds
    setTimeout(() => {
      setMetrics(prev => ({ ...prev, thermalState: 'warm' }));
      updateFeatureFlags('warm', 'balanced');
    }, 30000);
  }, [tier, updateFeatureFlags, logThermalEvent]);
  
  return {
    // State
    metrics,
    featureFlags,
    isActive,
    governorEvents,
    
    // Actions
    startMonitoring,
    stopMonitoring,
    tick, // Call this every frame in WebGL
    forceCooldown,
    
    // Quick checks
    isCritical: metrics.thermalState === 'critical',
    isOverheating: metrics.thermalState === 'hot' || metrics.thermalState === 'critical',
    isLowBattery: metrics.batteryLevel < 0.2 && !metrics.isCharging,
    canEnableWebGL: featureFlags.enableWebGL,
    canEnableTrinity: featureFlags.enableTrinityFilters,
  };
};

export type { ThermalMetrics, FeatureFlags, ThermalState, PowerMode };
