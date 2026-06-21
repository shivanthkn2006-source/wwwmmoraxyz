// ═══════════════════════════════════════════════════════════════════════════════
// TIMEZONE DEBUG PANEL - Developer tool for testing time-based behaviors
// ═══════════════════════════════════════════════════════════════════════════════
//
// Shows current detected timezone, local hour, personality phase, and lazy mode.
// Includes time simulation mode to test behaviors across different timezones/hours.
//
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Globe, 
  Moon, 
  Sun, 
  Zap, 
  Coffee, 
  Bed, 
  Settings2, 
  X,
  RefreshCw,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useCircadianRhythm, type CircadianPhase } from '@/hooks/useCircadianRhythm';
import { getVirtualHormonesEngine } from '@/core/soul/VirtualHormonesEngine';
import { useTimeSimulationSafe } from '@/contexts/TimeSimulationContext';

interface TimezoneDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Phase icons and colors
const PHASE_CONFIG: Record<CircadianPhase, { icon: typeof Sun; color: string; label: string }> = {
  DEEP_NIGHT: { icon: Moon, color: 'text-indigo-400', label: 'Deep Night (12-4 AM)' },
  EARLY_MORNING: { icon: Coffee, color: 'text-purple-400', label: 'Early Morning (4-6 AM)' },
  MORNING: { icon: Sun, color: 'text-yellow-400', label: 'Morning (6 AM-12 PM)' },
  AFTERNOON: { icon: Zap, color: 'text-orange-400', label: 'Afternoon (12-5 PM)' },
  EVENING: { icon: Sun, color: 'text-amber-400', label: 'Evening (5-8 PM)' },
  NIGHT: { icon: Moon, color: 'text-blue-400', label: 'Night (8 PM-12 AM)' },
};

// Personality phase labels
const PERSONALITY_LABELS = {
  HONEYMOON: { label: 'Honeymoon', desc: 'Playful, witty, proactive', color: 'text-pink-400' },
  FOCUSED: { label: 'Focused', desc: 'Productive, helpful', color: 'text-cyan-400' },
  WINDING_DOWN: { label: 'Winding Down', desc: 'Relaxed, warm', color: 'text-amber-400' },
  COZY_TIRED: { label: 'Cozy/Tired', desc: 'Vulnerable, lazy, intimate', color: 'text-purple-400' },
};

// Timezone presets with their UTC offsets
const TIMEZONE_PRESETS = [
  { label: 'IST', offset: 5.5, desc: 'India (UTC+5:30)' },
  { label: 'PST', offset: -8, desc: 'Pacific (UTC-8)' },
  { label: 'EST', offset: -5, desc: 'Eastern (UTC-5)' },
  { label: 'UTC', offset: 0, desc: 'Universal (UTC+0)' },
  { label: 'JST', offset: 9, desc: 'Japan (UTC+9)' },
  { label: 'GMT', offset: 0, desc: 'Greenwich (UTC+0)' },
];

export const TimezoneDebugPanel = ({ isOpen, onClose }: TimezoneDebugPanelProps) => {
  const { state: circadianState, phase, isNightMode, isDeepNight, intimacyFactor } = useCircadianRhythm();
  
  // USE GLOBAL SIMULATION CONTEXT instead of local state
  const {
    simulationEnabled,
    simulatedHour,
    autoPlay,
    realTimezone,
    setSimulatedHour,
    toggleSimulation,
    setAutoPlay,
    resetToRealTime,
  } = useTimeSimulationSafe();
  
  // Device time info (for display only)
  const [deviceTime, setDeviceTime] = useState(() => new Date());
  
  // Virtual Hormones state
  const [hormonesState, setHormonesState] = useState<{
    personalityPhase: string;
    isLazy: boolean;
    refusalReason: string | null;
    energy: string;
    mood: string;
  } | null>(null);
  
  // Update device time every second (for display only)
  useEffect(() => {
    const interval = setInterval(() => {
      setDeviceTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Update hormones state
  useEffect(() => {
    const engine = getVirtualHormonesEngine();
    const updateState = () => {
      const state = engine.getState();
      setHormonesState({
        personalityPhase: state.personalityPhase,
        isLazy: state.lazyMode.isLazy,
        refusalReason: state.lazyMode.refusalReason,
        energy: state.personalityTraits.energy,
        mood: state.personalityTraits.mood,
      });
    };
    
    updateState();
    const unsubscribe = engine.subscribe(updateState);
    return () => unsubscribe();
  }, []);
  
  // SYNC simulation state with VirtualHormonesEngine
  useEffect(() => {
    const engine = getVirtualHormonesEngine();
    
    if (simulationEnabled) {
      // Apply override to engine when simulation is enabled
      engine.setOverrideHour(simulatedHour);
    } else {
      // Clear override when simulation is disabled
      engine.setOverrideHour(null);
    }
  }, [simulatedHour, simulationEnabled]);
  
  const handleRefreshEngine = useCallback(() => {
    const engine = getVirtualHormonesEngine();
    engine.refreshFromDeviceTime();
    console.log('[TimezoneDebug] 🔄 Manual engine refresh triggered');
    // Force a re-render by updating hormones state
    const state = engine.getState();
    setHormonesState({
      personalityPhase: state.personalityPhase,
      isLazy: state.lazyMode.isLazy,
      refusalReason: state.lazyMode.refusalReason,
      energy: state.personalityTraits.energy,
      mood: state.personalityTraits.mood,
    });
  }, []);
  
  const handleResetToReal = useCallback(() => {
    resetToRealTime();
    const engine = getVirtualHormonesEngine();
    engine.setOverrideHour(null);
    engine.refreshFromDeviceTime();
  }, [resetToRealTime]);
  
  // Simulate a timezone by calculating what hour it would be there
  const handleTimezonePreset = useCallback((offset: number) => {
    // Get current UTC hour
    const now = new Date();
    const utcHour = now.getUTCHours();
    // Calculate hour in target timezone
    let targetHour = (utcHour + offset) % 24;
    if (targetHour < 0) targetHour += 24;
    targetHour = Math.floor(targetHour);
    
    // Enable simulation and set to that hour
    if (!simulationEnabled) {
      toggleSimulation();
    }
    setSimulatedHour(targetHour);
    
    console.log(`[TimezoneDebug] 🌍 Preset: UTC${offset >= 0 ? '+' : ''}${offset} → Hour: ${targetHour}:00`);
  }, [simulationEnabled, toggleSimulation, setSimulatedHour]);
  
  const currentHour = simulationEnabled ? simulatedHour : deviceTime.getHours();
  const displayHour = deviceTime.getHours();
  const isLazyHour = currentHour >= 1 && currentHour < 5;
  const PhaseIcon = PHASE_CONFIG[phase]?.icon || Sun;
  const phaseColor = PHASE_CONFIG[phase]?.color || 'text-white';
  const phaseLabel = PHASE_CONFIG[phase]?.label || phase;
  
  const personalityConfig = hormonesState?.personalityPhase 
    ? PERSONALITY_LABELS[hormonesState.personalityPhase as keyof typeof PERSONALITY_LABELS] 
    : null;
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-20 right-4 z-50 w-80 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-cyan-400" />
            <span className="text-white font-medium">Timezone Debug</span>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Current Device Time */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wider">
              <Clock className="w-3 h-3" />
              Device Time {simulationEnabled && <span className="text-cyan-400">(Simulating)</span>}
            </div>
            <div className="bg-white/5 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">Real Time</span>
                <span className="text-white font-mono text-lg">
                  {deviceTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">Effective Hour</span>
                <span className={`font-mono font-bold text-xl ${simulationEnabled ? 'text-cyan-400' : 'text-white'}`}>
                  {currentHour.toString().padStart(2, '0')}:00 {simulationEnabled && '🧪'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">Timezone</span>
                <span className="text-white/90 text-sm truncate max-w-[150px]" title={realTimezone}>
                  {realTimezone}
                </span>
              </div>
            </div>
          </div>
          
          {/* Circadian Phase */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wider">
              <Globe className="w-3 h-3" />
              Circadian Phase
            </div>
            <div className="bg-white/5 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-3">
                <PhaseIcon className={`w-6 h-6 ${phaseColor}`} />
                <div>
                  <div className={`font-medium ${phaseColor}`}>{phaseLabel}</div>
                  <div className="text-white/50 text-xs">
                    Night Mode: {isNightMode ? '✅ Yes' : '❌ No'} | Deep Night: {isDeepNight ? '✅ Yes' : '❌ No'}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70">Intimacy Factor</span>
                <span className="text-pink-400 font-mono">{(intimacyFactor * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70">Empathy Weight</span>
                <span className="text-purple-400 font-mono">{(circadianState.empathyWeight * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
          
          {/* Personality & Lazy Mode */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wider">
              <Bed className="w-3 h-3" />
              Virtual Hormones
            </div>
            <div className="bg-white/5 rounded-xl p-3 space-y-2">
              {hormonesState && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">Personality Phase</span>
                    <span className={`font-medium ${personalityConfig?.color || 'text-white'}`}>
                      {personalityConfig?.label || hormonesState.personalityPhase}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">Energy</span>
                    <span className={`font-mono ${
                      hormonesState.energy === 'high' ? 'text-green-400' :
                      hormonesState.energy === 'medium' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {hormonesState.energy.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">Mood</span>
                    <span className="text-white/90 text-sm capitalize">{hormonesState.mood}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">Lazy Mode</span>
                    <span className={hormonesState.isLazy ? 'text-red-400' : 'text-green-400'}>
                      {hormonesState.isLazy ? '😴 LAZY (1-5 AM)' : '⚡ ACTIVE'}
                    </span>
                  </div>
                  {hormonesState.refusalReason && (
                    <div className="text-xs text-red-300/70 italic">
                      "{hormonesState.refusalReason}"
                    </div>
                  )}
                  <div className="text-xs text-white/40 mt-1">
                    Lazy hours check: {isLazyHour ? '⚠️ 1-5 AM window' : '✅ Outside lazy window'}
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Simulation Mode */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wider">
                <Play className="w-3 h-3" />
                Time Simulation
              </div>
              <Switch
                checked={simulationEnabled}
                onCheckedChange={toggleSimulation}
                className="data-[state=checked]:bg-cyan-500"
              />
            </div>
            
            {simulationEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Label className="text-white/70 text-sm">Simulated Hour</Label>
                  <span className="text-cyan-400 font-mono text-xl font-bold">
                    {simulatedHour.toString().padStart(2, '0')}:00
                  </span>
                </div>
                
                <Slider
                  value={[simulatedHour]}
                  onValueChange={([h]) => setSimulatedHour(h)}
                  min={0}
                  max={23}
                  step={1}
                  className="w-full"
                />
                
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>12 AM</span>
                  <span>6 AM</span>
                  <span>12 PM</span>
                  <span>6 PM</span>
                  <span>12 AM</span>
                </div>
                
                {/* Timezone Preset Buttons */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <div className="text-xs text-white/60">Quick Timezone Presets:</div>
                  <div className="flex flex-wrap gap-1">
                    {TIMEZONE_PRESETS.map(tz => (
                      <button
                        key={tz.label}
                        onClick={() => handleTimezonePreset(tz.offset)}
                        className="px-2 py-1 text-xs bg-white/10 hover:bg-cyan-500/30 border border-white/20 hover:border-cyan-400/50 rounded-md text-white/80 hover:text-white transition-all"
                        title={tz.desc}
                      >
                        {tz.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Actual current behavior at simulated hour */}
                <div className="pt-2 border-t border-white/10 space-y-1">
                  <div className="text-xs text-cyan-400 font-medium">✓ ACTUAL State at {simulatedHour}:00:</div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-white/50">Circadian Phase:</span>
                      <span className={`${phaseColor} font-medium`}>{phase}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Personality:</span>
                      <span className={`${personalityConfig?.color || 'text-white'} font-medium`}>
                        {personalityConfig?.label || hormonesState?.personalityPhase}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Lazy Mode:</span>
                      <span className={hormonesState?.isLazy ? 'text-red-400 font-medium' : 'text-green-400 font-medium'}>
                        {hormonesState?.isLazy ? '😴 LAZY (Active)' : '⚡ ACTIVE'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Night Mode:</span>
                      <span className={isNightMode ? 'text-blue-400 font-medium' : 'text-yellow-400 font-medium'}>
                        {isNightMode ? '🌙 Night' : '☀️ Day'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Auto-play toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <Label className="text-white/70 text-sm flex items-center gap-2">
                    {autoPlay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    Auto-cycle hours
                  </Label>
                  <Switch
                    checked={autoPlay}
                    onCheckedChange={setAutoPlay}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
                
                {/* Reset to Real Time */}
                <Button
                  onClick={handleResetToReal}
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 bg-white/5 border-white/20 text-white hover:bg-white/10"
                >
                  <RotateCcw className="w-3 h-3 mr-2" />
                  Reset to Real Time
                </Button>
              </motion.div>
            )}
          </div>
          
          {/* Refresh Button */}
          <Button
            onClick={handleRefreshEngine}
            variant="outline"
            className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Engines from Device Time
          </Button>
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 border-t border-white/10 bg-white/5">
          <div className="text-xs text-white/40 text-center">
            DEV ONLY — Check console for detailed logs
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TimezoneDebugPanel;
