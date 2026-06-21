// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT COOLANT - Performance Governor System
// FPS-based downgrade detection + Device Memory enforcement
// iPhone SE (LOW_POWER) → iPhone 17 Pro Max (ULTRA)
// Connected to Zoe Core for monitoring
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDeviceTierContext } from '@/contexts/DeviceTierContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// ═══ POWER MODES ═══
export type PowerMode = 'LOW_POWER' | 'BALANCED' | 'PERFORMANCE' | 'ULTRA';

export interface PerformanceMetrics {
  currentFPS: number;
  avgFPS: number;
  lowFPSDuration: number; // seconds below 25 FPS
  deviceMemoryGB: number;
  isDowngraded: boolean;
  powerMode: PowerMode;
  voiceMode: 'continuous' | 'push-to-talk';
  downgradeTrigger: string | null;
}

export interface CoolantActions {
  // Camera/Visual
  enableQuantumShaders: boolean;
  useCSSFilters: boolean; // Fallback to sepia/contrast
  shaderComplexity: 'full' | 'reduced' | 'css-only';
  
  // Globe
  enableAtmosphereGlow: boolean;
  enableWeatherParticles: boolean;
  globeDetailLevel: 'full' | 'medium' | 'low';
  
  // Voice
  voiceMode: 'continuous' | 'push-to-talk';
  
  // General
  enableBlur: boolean;
  enableGlassmorphism: boolean;
  maxParticles: number;
  targetFPS: number;
  pixelRatio: number;
}

// ═══ MODE PRESETS ═══
const POWER_MODE_PRESETS: Record<PowerMode, CoolantActions> = {
  LOW_POWER: {
    // iPhone SE / old Android (< 4GB RAM)
    enableQuantumShaders: false,
    useCSSFilters: true,
    shaderComplexity: 'css-only',
    enableAtmosphereGlow: false,
    enableWeatherParticles: false,
    globeDetailLevel: 'low',
    voiceMode: 'push-to-talk',
    enableBlur: false,
    enableGlassmorphism: false,
    maxParticles: 50,
    targetFPS: 24,
    pixelRatio: 1,
  },
  BALANCED: {
    // Mid-range devices (4-6GB RAM)
    enableQuantumShaders: true,
    useCSSFilters: false,
    shaderComplexity: 'reduced',
    enableAtmosphereGlow: true,
    enableWeatherParticles: true,
    globeDetailLevel: 'medium',
    voiceMode: 'continuous',
    enableBlur: true,
    enableGlassmorphism: true,
    maxParticles: 300,
    targetFPS: 45,
    pixelRatio: 1.5,
  },
  PERFORMANCE: {
    // High-end devices (8GB+ RAM)
    enableQuantumShaders: true,
    useCSSFilters: false,
    shaderComplexity: 'full',
    enableAtmosphereGlow: true,
    enableWeatherParticles: true,
    globeDetailLevel: 'full',
    voiceMode: 'continuous',
    enableBlur: true,
    enableGlassmorphism: true,
    maxParticles: 800,
    targetFPS: 60,
    pixelRatio: 2,
  },
  ULTRA: {
    // iPhone 17 Pro Max / Flagship (12GB+ RAM)
    enableQuantumShaders: true,
    useCSSFilters: false,
    shaderComplexity: 'full',
    enableAtmosphereGlow: true,
    enableWeatherParticles: true,
    globeDetailLevel: 'full',
    voiceMode: 'continuous',
    enableBlur: true,
    enableGlassmorphism: true,
    maxParticles: 2000,
    targetFPS: 120,
    pixelRatio: 3,
  },
};

// ═══ CONSTANTS ═══
const FPS_THRESHOLD = 25;
const FPS_DURATION_THRESHOLD = 3; // seconds
const LOW_MEMORY_THRESHOLD = 4; // GB
const MONITORING_INTERVAL = 500; // ms

export const usePerformanceGovernor = () => {
  const { tier, capabilities } = useDeviceTierContext();
  const { toast } = useToast();
  
  const [isActive, setIsActive] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    currentFPS: 60,
    avgFPS: 60,
    lowFPSDuration: 0,
    deviceMemoryGB: 8,
    isDowngraded: false,
    powerMode: 'BALANCED',
    voiceMode: 'continuous',
    downgradeTrigger: null,
  });
  
  const [coolantActions, setCoolantActions] = useState<CoolantActions>(
    POWER_MODE_PRESETS.BALANCED
  );
  
  const [governorLogs, setGovernorLogs] = useState<string[]>([]);
  
  // Refs for monitoring
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const fpsHistoryRef = useRef<number[]>([]);
  const lowFPSStartRef = useRef<number | null>(null);
  const monitorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownDowngradeToast = useRef(false);
  
  // ═══ DEVICE MEMORY DETECTION ═══
  const detectDeviceMemory = useCallback((): number => {
    // Check navigator.deviceMemory (Chrome/Edge only)
    if ('deviceMemory' in navigator) {
      return (navigator as any).deviceMemory || 8;
    }
    
    // Fallback: Estimate from tier
    const tierMemoryMap: Record<string, number> = {
      'C': 3,
      'B': 6,
      'A': 8,
      'S': 12,
    };
    
    return tierMemoryMap[tier] || 6;
  }, [tier]);
  
  // ═══ DETERMINE POWER MODE ═══
  const determinePowerMode = useCallback((
    deviceMemoryGB: number,
    avgFPS: number,
    lowFPSDuration: number
  ): PowerMode => {
    // CRITICAL: Force LOW_POWER if memory < 4GB
    if (deviceMemoryGB < LOW_MEMORY_THRESHOLD) {
      return 'LOW_POWER';
    }
    
    // Downgrade if FPS below 25 for 3+ seconds
    if (lowFPSDuration >= FPS_DURATION_THRESHOLD) {
      if (avgFPS < 15) return 'LOW_POWER';
      if (avgFPS < 25) return 'BALANCED';
    }
    
    // Tier-based defaults
    if (tier === 'S' && avgFPS >= 90) return 'ULTRA';
    if (tier === 'A' && avgFPS >= 50) return 'PERFORMANCE';
    if (tier === 'B' && avgFPS >= 30) return 'BALANCED';
    
    // Default fallback
    return deviceMemoryGB >= 8 ? 'PERFORMANCE' : 'BALANCED';
  }, [tier]);
  
  // ═══ APPLY COOLANT ACTIONS ═══
  const applyCoolantActions = useCallback((mode: PowerMode, trigger: string | null) => {
    const actions = POWER_MODE_PRESETS[mode];
    setCoolantActions(actions);
    
    // Show toast notification on downgrade (only once per downgrade)
    if ((mode === 'LOW_POWER' || mode === 'BALANCED') && trigger && !hasShownDowngradeToast.current) {
      hasShownDowngradeToast.current = true;
      
      toast({
        title: "⚡ Optimization Active",
        description: "Adjusting visuals to save battery and prevent overheating.",
        duration: 4000,
      });
      
      addLog(`DOWNGRADE: ${trigger} → ${mode}`);
    }
    
    // Reset toast flag when upgraded
    if (mode === 'PERFORMANCE' || mode === 'ULTRA') {
      hasShownDowngradeToast.current = false;
    }
  }, [toast]);
  
  // ═══ FPS MEASUREMENT ═══
  const measureFPS = useCallback(() => {
    const now = performance.now();
    const delta = now - lastFrameTimeRef.current;
    
    if (delta >= 1000) {
      const fps = (frameCountRef.current / delta) * 1000;
      
      fpsHistoryRef.current.push(fps);
      if (fpsHistoryRef.current.length > 5) {
        fpsHistoryRef.current.shift();
      }
      
      const avgFPS = fpsHistoryRef.current.reduce((a, b) => a + b, 0) / fpsHistoryRef.current.length;
      
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
      
      return { currentFPS: fps, avgFPS };
    }
    
    frameCountRef.current++;
    return null;
  }, []);
  
  // ═══ LOW FPS DURATION TRACKING ═══
  const trackLowFPSDuration = useCallback((currentFPS: number): number => {
    if (currentFPS < FPS_THRESHOLD) {
      if (lowFPSStartRef.current === null) {
        lowFPSStartRef.current = performance.now();
      }
      return (performance.now() - lowFPSStartRef.current) / 1000;
    } else {
      lowFPSStartRef.current = null;
      return 0;
    }
  }, []);
  
  // ═══ LOGGING ═══
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setGovernorLogs(prev => [...prev.slice(-19), `[${timestamp}] ${message}`]);
    console.log(`[PerformanceGovernor] ${message}`);
  }, []);
  
  // ═══ LOG TO ZOE CORE ═══
  const logToZoeCore = useCallback(async (
    eventType: string,
    details: Record<string, any>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: `governor_${eventType}`,
        event_category: 'performance_governor',
        context_snippet: `Power Mode: ${details.powerMode}`,
        metadata: {
          ...details,
          tier,
          deviceModel: capabilities?.deviceModel,
          timestamp: new Date().toISOString(),
        },
        dhf_logged: true,
      });
    } catch (e) {
      console.warn('[PerformanceGovernor] Failed to log to Zoe:', e);
    }
  }, [tier, capabilities?.deviceModel]);
  
  // ═══ START MONITORING ═══
  const startMonitoring = useCallback(() => {
    if (monitorIntervalRef.current) return;
    
    setIsActive(true);
    
    // Detect initial memory
    const deviceMemoryGB = detectDeviceMemory();
    addLog(`Started monitoring | Memory: ${deviceMemoryGB}GB | Tier: ${tier}`);
    
    // Force LOW_POWER immediately if low memory
    if (deviceMemoryGB < LOW_MEMORY_THRESHOLD) {
      const mode = 'LOW_POWER';
      setMetrics(prev => ({
        ...prev,
        deviceMemoryGB,
        powerMode: mode,
        isDowngraded: true,
        voiceMode: 'push-to-talk',
        downgradeTrigger: `Device memory < ${LOW_MEMORY_THRESHOLD}GB`,
      }));
      applyCoolantActions(mode, `Device memory < ${LOW_MEMORY_THRESHOLD}GB`);
      logToZoeCore('low_memory_mode', { deviceMemoryGB, powerMode: mode });
    }
    
    // Monitor every 500ms
    monitorIntervalRef.current = setInterval(() => {
      const fpsResult = measureFPS();
      if (!fpsResult) return;
      
      const { currentFPS, avgFPS } = fpsResult;
      const lowFPSDuration = trackLowFPSDuration(currentFPS);
      const deviceMem = detectDeviceMemory();
      
      const newPowerMode = determinePowerMode(deviceMem, avgFPS, lowFPSDuration);
      
      setMetrics(prev => {
        const isDowngraded = newPowerMode === 'LOW_POWER' || 
          (newPowerMode === 'BALANCED' && prev.powerMode !== 'BALANCED' && prev.powerMode !== 'LOW_POWER');
        
        let downgradeTrigger = null;
        if (newPowerMode !== prev.powerMode) {
          if (deviceMem < LOW_MEMORY_THRESHOLD) {
            downgradeTrigger = `Device memory: ${deviceMem}GB`;
          } else if (lowFPSDuration >= FPS_DURATION_THRESHOLD) {
            downgradeTrigger = `FPS below ${FPS_THRESHOLD} for ${lowFPSDuration.toFixed(1)}s`;
          }
          
          applyCoolantActions(newPowerMode, downgradeTrigger);
          logToZoeCore('mode_change', {
            from: prev.powerMode,
            to: newPowerMode,
            trigger: downgradeTrigger,
            avgFPS,
          });
        }
        
        return {
          currentFPS,
          avgFPS,
          lowFPSDuration,
          deviceMemoryGB: deviceMem,
          isDowngraded,
          powerMode: newPowerMode,
          voiceMode: POWER_MODE_PRESETS[newPowerMode].voiceMode,
          downgradeTrigger,
        };
      });
    }, MONITORING_INTERVAL);
    
    return () => stopMonitoring();
  }, [
    detectDeviceMemory,
    measureFPS,
    trackLowFPSDuration,
    determinePowerMode,
    applyCoolantActions,
    logToZoeCore,
    addLog,
    tier,
  ]);
  
  // ═══ STOP MONITORING ═══
  const stopMonitoring = useCallback(() => {
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = null;
    }
    setIsActive(false);
    addLog('Stopped monitoring');
  }, [addLog]);
  
  // ═══ FRAME TICK (for manual WebGL sync) ═══
  const tick = useCallback(() => {
    frameCountRef.current++;
  }, []);
  
  // ═══ FORCE MODE ═══
  const forcePowerMode = useCallback((mode: PowerMode) => {
    setMetrics(prev => ({
      ...prev,
      powerMode: mode,
      isDowngraded: mode === 'LOW_POWER' || mode === 'BALANCED',
      voiceMode: POWER_MODE_PRESETS[mode].voiceMode,
      downgradeTrigger: 'Manual override',
    }));
    applyCoolantActions(mode, 'Manual override');
    addLog(`FORCED: ${mode}`);
  }, [applyCoolantActions, addLog]);
  
  // ═══ AUTO-RECOVERY CHECK ═══
  useEffect(() => {
    if (!isActive) return;
    
    // Check every 10 seconds if we can upgrade
    const recoveryInterval = setInterval(() => {
      if (metrics.powerMode === 'LOW_POWER' && metrics.avgFPS >= 30 && metrics.deviceMemoryGB >= LOW_MEMORY_THRESHOLD) {
        forcePowerMode('BALANCED');
        addLog('AUTO-RECOVERY: Upgraded to BALANCED');
      } else if (metrics.powerMode === 'BALANCED' && metrics.avgFPS >= 50 && metrics.deviceMemoryGB >= 6) {
        forcePowerMode('PERFORMANCE');
        addLog('AUTO-RECOVERY: Upgraded to PERFORMANCE');
      }
    }, 10000);
    
    return () => clearInterval(recoveryInterval);
  }, [isActive, metrics.powerMode, metrics.avgFPS, metrics.deviceMemoryGB, forcePowerMode, addLog]);
  
  return {
    // State
    isActive,
    metrics,
    coolantActions,
    governorLogs,
    
    // Actions
    startMonitoring,
    stopMonitoring,
    tick,
    forcePowerMode,
    
    // Quick checks
    isLowPower: metrics.powerMode === 'LOW_POWER',
    isDowngraded: metrics.isDowngraded,
    shouldUseCSSFilters: coolantActions.useCSSFilters,
    shouldUsePushToTalk: coolantActions.voiceMode === 'push-to-talk',
    canEnableQuantumShaders: coolantActions.enableQuantumShaders,
    canEnableGlobeEffects: coolantActions.enableAtmosphereGlow,
  };
};
