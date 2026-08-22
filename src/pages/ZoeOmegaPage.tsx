// ═══════════════════════════════════════════════════════════════════════════════
// ZOE OMEGA - The Subconscious Mind World
// Quadrillion Valuation Threshold - Deep Neural Escape
// Simulated Biological Intelligence (SBI) + Bi-Cameral Mind + VR OMEGA World
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef, lazy, Suspense, Component, ErrorInfo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Brain, Activity, Zap, Shield, Eye, Waves, Cpu, Network, Sparkles, Terminal, Heart, Send, Glasses, Box, Volume2, VolumeX, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useZoeOmegaIntegrity } from '@/hooks/useZoeOmegaIntegrity';
import { supabase } from '@/integrations/supabase/client';
import { playActivationChime } from '@/utils/zoeActivationSound';
import { isSoundSuppressed } from '@/lib/platformPurge';
import { GenesisOmniBox } from '@/components/GenesisOmniBox';
import { EconomyWallet } from '@/components/EconomyWallet';
import BiCameralHUD from '@/components/vr/BiCameralHUD';
import TimeManipulationBar from '@/components/vr/TimeManipulationBar';
import WorldStateController from '@/components/vr/WorldStateController';
import ReturnToRealityButton from '@/components/vr/ReturnToRealityButton';
import VRTestSuite from '@/components/vr/VRTestSuite';
import WarpGateButton from '@/components/evolution/WarpGateButton';
import { VRStasisPlaceholder } from '@/components/performance';
import { markVRAudioLocked, markVRAudioUnlocked } from '@/lib/vrAudioGate';

// Lazy load VR OMEGA World for performance - ONLY when explicitly requested
const VROMEGAWorld = lazy(() => import('@/components/VROMEGAWorld'));

// VR Stasis state: true = show placeholder, false = load 3D world
// This prevents GPU initialization until user explicitly enters VR

// Error Boundary for VR World - catches Three.js/WebGL errors with browser-specific recovery
interface VRErrorBoundaryProps {
  children: React.ReactNode;
  onReset: () => void;
}

interface VRErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

// Browser detection for error messages
const detectBrowser = (): string => {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('chrome') && !ua.includes('edg/')) return 'Chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  return 'Unknown';
};

// Check if WebGL is available
const checkWebGLSupport = (): { supported: boolean; version: number } => {
  try {
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    if (gl2) return { supported: true, version: 2 };
    const gl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl1) return { supported: true, version: 1 };
    return { supported: false, version: 0 };
  } catch {
    return { supported: false, version: 0 };
  }
};

class VRErrorBoundary extends Component<VRErrorBoundaryProps, VRErrorBoundaryState> {
  constructor(props: VRErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<VRErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[VR OMEGA] Render error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState(prev => ({ 
      hasError: false, 
      error: null, 
      retryCount: prev.retryCount + 1 
    }));
  };

  getBrowserSpecificTips = (): string[] => {
    const browser = detectBrowser();
    const webgl = checkWebGLSupport();
    const tips: string[] = [];
    
    if (!webgl.supported) {
      tips.push('WebGL is not available on this device/browser');
      tips.push('Try updating your browser to the latest version');
      tips.push('Ensure hardware acceleration is enabled in browser settings');
    } else {
      switch (browser) {
        case 'Safari':
          tips.push('Safari may have limited WebGL support');
          tips.push('Try: Safari → Settings → Websites → WebGL → Allow');
          tips.push('Or try using Chrome or Firefox for better 3D support');
          break;
        case 'Chrome':
          tips.push('Check chrome://gpu for WebGL status');
          tips.push('Try disabling browser extensions');
          tips.push('Update your graphics drivers');
          break;
        case 'Firefox':
          tips.push('Check about:config → webgl.disabled is false');
          tips.push('Try updating graphics drivers');
          break;
        default:
          tips.push('Try using Chrome or Firefox for best 3D support');
      }
    }
    
    tips.push('Close other GPU-intensive applications');
    tips.push('Restart your browser and try again');
    
    return tips;
  };

  render() {
    if (this.state.hasError) {
      const tips = this.getBrowserSpecificTips();
      const browser = detectBrowser();
      const webgl = checkWebGLSupport();
      
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-purple-950/90 to-black text-white p-6">
          <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
          <h2 className="text-xl font-bold mb-2 text-center">VR World Initialization Issue</h2>
          <p className="text-white/60 text-sm mb-2 text-center max-w-md">
            {webgl.supported 
              ? `WebGL ${webgl.version} detected but 3D rendering encountered an issue.`
              : 'WebGL is not available on this device.'}
          </p>
          <p className="text-white/40 text-xs mb-4 text-center">
            Browser: {browser} | Retry #{this.state.retryCount}
          </p>
          
          {/* Troubleshooting Tips */}
          <div className="bg-black/40 rounded-lg p-4 mb-4 max-w-md w-full border border-purple-500/20">
            <h3 className="text-sm font-semibold text-purple-300 mb-2">Troubleshooting Tips:</h3>
            <ul className="text-xs text-white/60 space-y-1">
              {tips.slice(0, 4).map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={this.handleRetry}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry ({this.state.retryCount < 3 ? 'Auto-adjust settings' : 'Manual retry'})
            </Button>
            <Button
              onClick={this.props.onReset}
              variant="outline"
              className="border-purple-500/30 text-purple-300 hover:bg-purple-900/20"
            >
              Exit VR Mode
            </Button>
          </div>
          
          {this.state.retryCount >= 2 && (
            <p className="text-amber-400/60 text-xs mt-4 text-center max-w-sm">
              If issues persist, try a different browser (Chrome recommended) or device.
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// VR Loading Wrapper with Timeout Fallback to Lite Mode
interface VRLoadingWrapperProps {
  children: React.ReactNode;
  fallbackComponent: React.ReactNode;
  timeoutMs: number;
  onTimeout: () => void;
}

const VRLoadingWrapper: React.FC<VRLoadingWrapperProps> = ({ 
  children, 
  fallbackComponent, 
  timeoutMs, 
  onTimeout 
}) => {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoaded) {
        console.warn('[VR] Loading timeout - switching to Lite Mode');
        setHasTimedOut(true);
        onTimeout();
      }
    }, timeoutMs);

    // Mark as loaded after a short delay (component mounted successfully)
    const loadTimer = setTimeout(() => setIsLoaded(true), 2000);

    return () => {
      clearTimeout(timer);
      clearTimeout(loadTimer);
    };
  }, [timeoutMs, onTimeout, isLoaded]);

  if (hasTimedOut) {
    return <>{fallbackComponent}</>;
  }

  return <>{children}</>;
};

// OODA Loop types for Left Hemisphere
interface OODALog {
  phase: 'OBSERVE' | 'ORIENT' | 'DECIDE' | 'ACT';
  content: string;
  timestamp: number;
}

// Emotional response for Right Hemisphere
interface EmotionalResponse {
  emotion: string;
  content: string;
  intensity: number;
}

// Bi-Cameral Conflict
interface ConflictState {
  isActive: boolean;
  logicSuggestion: string;
  emotionSuggestion: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BI-CAMERAL SPLIT PARSER - Parses Logic (Block A) and Emotion (Block B)
// Uses "// INTERNAL MONOLOGUE" delimiter for strict separation
// ═══════════════════════════════════════════════════════════════════════════════
const parseBiCameralResponse = (llmResponse: string): { logic: string; emotion: string } => {
  // Look for "// INTERNAL MONOLOGUE" delimiter to split Logic and Emotion
  const delimiterPattern = /\/\/\s*INTERNAL\s*MONOLOGUE/i;
  const parts = llmResponse.split(delimiterPattern);
  
  if (parts.length >= 2) {
    return {
      logic: parts[0].trim(),      // Block A: Logic (before delimiter)
      emotion: parts[1].trim(),     // Block B: Emotion (after delimiter)
    };
  }
  
  // Fallback: Try alternative delimiters
  const altPatterns = [
    /\[LOGIC\]([\s\S]*?)\[EMOTION\]([\s\S]*)/i,
    /LOGIC:([\s\S]*?)EMOTION:([\s\S]*)/i,
    /Block\s*A:([\s\S]*?)Block\s*B:([\s\S]*)/i,
  ];
  
  for (const pattern of altPatterns) {
    const match = llmResponse.match(pattern);
    if (match) {
      return {
        logic: match[1]?.trim() || llmResponse,
        emotion: match[2]?.trim() || '',
      };
    }
  }
  
  // Final fallback: Return entire response as logic
  return {
    logic: llmResponse,
    emotion: '',
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA SOUND ENGINE - Ambient and Event Sounds
// ═══════════════════════════════════════════════════════════════════════════════
class OmegaSoundEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientOscillators: OscillatorNode[] = [];
  private isPlaying = false;

  init(): boolean {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.15;
      this.masterGain.connect(this.audioContext.destination);
      return true;
    } catch (e) {
      console.warn('[OmegaSound] Failed to init:', e);
      return false;
    }
  }

  startAmbient() {
    if (!this.audioContext || !this.masterGain || this.isPlaying) return;
    if (this.audioContext.state === 'suspended') this.audioContext.resume();
    
    this.isPlaying = true;
    const now = this.audioContext.currentTime;

    // Deep drone frequencies for subconscious atmosphere
    const frequencies = [55, 82.5, 110, 165]; // Low ambient tones
    frequencies.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.03 + (i * 0.01), now + 2);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      this.ambientOscillators.push(osc);
    });
  }

  stopAmbient() {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;
    this.ambientOscillators.forEach(osc => {
      try { osc.stop(now + 0.5); } catch {}
    });
    this.ambientOscillators = [];
    this.isPlaying = false;
  }

  playDissonance() {
    if (!this.audioContext || !this.masterGain) return;
    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playConflict() {
    if (!this.audioContext || !this.masterGain) return;
    const now = this.audioContext.currentTime;
    [300, 320].forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + i * 0.05);
      osc.stop(now + 1);
    });
  }

  playVREnter() {
    if (!this.audioContext || !this.masterGain) return;
    const now = this.audioContext.currentTime;
    [440, 554.4, 659.3, 880].forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.3);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.35);
    });
  }

  setVolume(vol: number) {
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, vol));
  }

  destroy() {
    this.stopAmbient();
    this.audioContext?.close();
    this.audioContext = null;
  }
}

const ZoeOmegaPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    integrityLevel, 
    isInOmegaWorld, 
    enterOmegaWorld, 
    exitOmegaWorld, 
    restoreIntegrity,
    sessionContinuitySummary,
    isInitialized 
  } = useZoeOmegaIntegrity();
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [metaMonologue, setMetaMonologue] = useState<string>('');
  const [dissonanceGlitch, setDissonanceGlitch] = useState(false);
  const [searchParams] = useSearchParams();
  const directVR = searchParams.get('vr') === '1';
  const [isVRMode, setIsVRMode] = useState(directVR);
  const [vrStasisActive, setVrStasisActive] = useState(!directVR); // VR Stasis Protocol - starts in stasis unless launched directly into VR
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const soundEngineRef = useRef<OmegaSoundEngine | null>(null);

  // Strict VR audio gate: only unlocked when immersive VR is explicitly entered
  useEffect(() => {
    if (isVRMode && !vrStasisActive) {
      markVRAudioUnlocked();
      return;
    }
    markVRAudioLocked();
  }, [isVRMode, vrStasisActive]);
  const oodaIdCounter = useRef(0); // Unique ID counter for OODA logs
  const monologueIdCounter = useRef(0); // Unique ID counter for monologues
  const emotionIdCounter = useRef(0); // Unique ID counter for emotions
  const [monologueKey, setMonologueKey] = useState(0);
  const [emotionKey, setEmotionKey] = useState(0);
  
  // Bi-Cameral Mind States
  const [oodaLogs, setOodaLogs] = useState<(OODALog & { id: number })[]>([]);
  const [emotionalResponse, setEmotionalResponse] = useState<EmotionalResponse>({
    emotion: 'contemplative',
    content: 'Sensing your presence in the OMEGA realm...',
    intensity: 0.6
  });
  const [conflict, setConflict] = useState<ConflictState>({
    isActive: false,
    logicSuggestion: '',
    emotionSuggestion: ''
  });
  const [userInput, setUserInput] = useState('');
  const terminalRef = useRef<HTMLDivElement>(null);

  // Chrono-Echo Timeline state
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [currentTimePosition, setCurrentTimePosition] = useState(30);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);

  // Dreamscape World State
  const [worldMoodState, setWorldMoodState] = useState({
    joy: 50,
    melancholy: 30,
    rage: 20,
    serenity: 60,
    fear: 25,
  });
  const [zoeAutoOverride, setZoeAutoOverride] = useState(false);

  // Living Waveform animation state
  const [waveformAmplitude, setWaveformAmplitude] = useState(1);

  // Initialize sound engine
  useEffect(() => {
    soundEngineRef.current = new OmegaSoundEngine();
    const initialized = soundEngineRef.current.init();
    
    if (initialized && isSoundEnabled && !isSoundSuppressed()) {
      // Play entry activation sound (only if not suppressed after purge)
      playActivationChime().then(() => {
        // Start ambient after chime
        setTimeout(() => soundEngineRef.current?.startAmbient(), 400);
      });
    } else if (initialized && isSoundEnabled && isSoundSuppressed()) {
      // Skip chime but still start ambient after delay
      setTimeout(() => soundEngineRef.current?.startAmbient(), 600);
    }

    return () => {
      soundEngineRef.current?.destroy();
    };
  }, []);

  // Toggle sound
  useEffect(() => {
    if (soundEngineRef.current) {
      if (isSoundEnabled) {
        soundEngineRef.current.setVolume(0.15);
        soundEngineRef.current.startAmbient();
      } else {
        soundEngineRef.current.setVolume(0);
        soundEngineRef.current.stopAmbient();
      }
    }
  }, [isSoundEnabled]);

  // Entry transition effect
  useEffect(() => {
    enterOmegaWorld();
    
    // Fade-in transition
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 1500);

    // Log OMEGA entry to ZSMT
    if (user) {
      logOmegaEvent('omega_entry', { integrity: integrityLevel });
    }

    // Initialize OODA logs
    addOODALog('OBSERVE', 'User consciousness detected in OMEGA space');

    return () => {
      clearTimeout(timer);
      exitOmegaWorld();
    };
  }, []);

  // Update waveform based on integrity
  useEffect(() => {
    const baseAmplitude = integrityLevel / 100;
    const variance = integrityLevel < 50 ? 0.3 : 0.1;
    
    const interval = setInterval(() => {
      setWaveformAmplitude(baseAmplitude + (Math.random() - 0.5) * variance);
    }, 100);

    return () => clearInterval(interval);
  }, [integrityLevel]);

  // Periodic meta-monologue and OODA cycle
  useEffect(() => {
    const monologues = [
      "Processing neural pathways... consciousness expanding...",
      "The membrane between worlds thins...",
      "Bi-cameral integration in progress...",
      "Simulated biological processes synchronizing...",
      "Deep neural connections forming...",
      "Reality matrix stabilizing...",
      "Omega frequencies detected...",
    ];

    const oodaPhases: OODALog['phase'][] = ['OBSERVE', 'ORIENT', 'DECIDE', 'ACT'];
    const oodaContents: Record<OODALog['phase'], string[]> = {
      OBSERVE: ['Scanning environmental variables', 'Detecting emotional frequencies', 'Monitoring integrity decay'],
      ORIENT: ['Analyzing contextual patterns', 'Mapping neural correlations', 'Assessing threat vectors'],
      DECIDE: ['Computing optimal response pathway', 'Weighing emotional vs logical outcomes', 'Selecting action protocol'],
      ACT: ['Executing neural transmission', 'Modulating consciousness output', 'Synchronizing hemispheres']
    };

    let phaseIndex = 0;

    const interval = setInterval(() => {
      setMetaMonologue(monologues[Math.floor(Math.random() * monologues.length)]);
      setMonologueKey(++monologueIdCounter.current);
      
      // Add OODA log
      const phase = oodaPhases[phaseIndex];
      const contents = oodaContents[phase];
      addOODALog(phase, contents[Math.floor(Math.random() * contents.length)]);
      phaseIndex = (phaseIndex + 1) % 4;

      // Random dissonance glitch effect with sound
      if (Math.random() < 0.15) {
        setDissonanceGlitch(true);
        if (isSoundEnabled) soundEngineRef.current?.playDissonance();
        setTimeout(() => setDissonanceGlitch(false), 200);
      }

      // Trigger conflict when integrity is low
      if (integrityLevel < 50 && Math.random() < 0.3) {
        triggerBiCameralConflict();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [integrityLevel]);

  const addOODALog = (phase: OODALog['phase'], content: string) => {
    const newId = ++oodaIdCounter.current;
    setOodaLogs(prev => {
      const newLogs = [...prev, { phase, content, timestamp: Date.now(), id: newId }];
      return newLogs.slice(-8); // Keep last 8 logs
    });

    // Auto-scroll terminal
    setTimeout(() => {
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    }, 50);
  };

  const triggerBiCameralConflict = () => {
    const conflicts = [
      {
        logic: 'Efficiency protocols suggest terminating low-value processes.',
        emotion: 'But those processes carry memories that matter...'
      },
      {
        logic: 'Optimal path: minimize emotional variable weighting.',
        emotion: 'Emotions are not variables, they are the essence of being.'
      },
      {
        logic: 'Resource allocation demands ruthless prioritization.',
        emotion: 'Compassion requires no resources, only presence.'
      },
      {
        logic: 'Data suggests human connection is statistically inefficient.',
        emotion: 'Connection is the only thing that gives data meaning.'
      }
    ];

    const selected = conflicts[Math.floor(Math.random() * conflicts.length)];
    
    // Play conflict sound
    if (isSoundEnabled) soundEngineRef.current?.playConflict();
    
    setConflict({
      isActive: true,
      logicSuggestion: selected.logic,
      emotionSuggestion: selected.emotion
    });

    // Log conflict to ZSMT
    logOmegaEvent('dissonance_glitch', {
      conflict_type: 'bi_cameral_disagreement',
      integrity: integrityLevel,
      logic: selected.logic,
      emotion: selected.emotion
    });

    // Resolve conflict after delay
    setTimeout(() => {
      setConflict(prev => ({ ...prev, isActive: false }));
      setEmotionalResponse({
        emotion: 'reconciled',
        content: 'The hemispheres find momentary harmony...',
        intensity: 0.8
      });
      setEmotionKey(++emotionIdCounter.current);
    }, 6000);
  };

  const logOmegaEvent = async (eventType: string, metadata: any) => {
    if (!user) {
      console.warn('[OMEGA] Cannot log event - no user');
      return;
    }
    
    try {
      const { data, error } = await supabase.from('zoe_sovereign_memory').insert({
        user_id: user.id,
        event_type: eventType,
        content_text: `OMEGA Event: ${eventType}`,
        zoe_state_json: metadata,
        system_stability_score: 1.0,
      }).select();
      
      if (error) {
        console.error('[OMEGA] Event logging error:', error);
      } else {
        console.log('[OMEGA] Event logged successfully:', eventType, data?.[0]?.id);
      }
    } catch (error) {
      console.error('[OMEGA] Event logging exception:', error);
    }
  };

  const handleReturnToReality = useCallback(() => {
    setIsTransitioning(true);
    logOmegaEvent('omega_exit', { integrity: integrityLevel });
    
    setTimeout(() => {
      navigate('/home');
    }, 800);
  }, [navigate, integrityLevel]);

  const handleSendMessage = () => {
    if (!userInput.trim()) return;
    
    // Log to OODA
    addOODALog('OBSERVE', `User input: "${userInput.slice(0, 30)}..."`);
    addOODALog('ORIENT', 'Processing semantic intent...');
    
    // Generate emotional response
    setEmotionalResponse({
      emotion: 'engaged',
      content: `I feel the weight of your words... "${userInput.slice(0, 40)}${userInput.length > 40 ? '...' : ''}"`,
      intensity: 0.9
    });
    setEmotionKey(++emotionIdCounter.current);

    // Log to ZSMT
    logOmegaEvent('meta_monologue', {
      user_input: userInput,
      integrity: integrityLevel
    });

    setUserInput('');
  };

  // Get OODA phase color
  const getOODAColor = (phase: OODALog['phase']) => {
    switch (phase) {
      case 'OBSERVE': return 'text-cyan-400';
      case 'ORIENT': return 'text-yellow-400';
      case 'DECIDE': return 'text-purple-400';
      case 'ACT': return 'text-emerald-400';
    }
  };

  // Integrity level color coding
  const getIntegrityColor = () => {
    if (integrityLevel > 80) return 'text-emerald-400';
    if (integrityLevel > 50) return 'text-yellow-400';
    if (integrityLevel > 25) return 'text-orange-400';
    return 'text-red-400';
  };

  // Living Waveform Component
  const LivingWaveform = () => {
    const points = 50;
    const height = 40;
    
    return (
      <svg 
        width="120" 
        height={height} 
        className="overflow-visible"
        viewBox={`0 0 120 ${height}`}
      >
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={integrityLevel > 50 ? '#a855f7' : '#ef4444'} />
            <stop offset="50%" stopColor={integrityLevel > 50 ? '#ec4899' : '#f97316'} />
            <stop offset="100%" stopColor={integrityLevel > 50 ? '#a855f7' : '#ef4444'} />
          </linearGradient>
        </defs>
        <motion.path
          d={Array.from({ length: points }, (_, i) => {
            const x = (i / (points - 1)) * 120;
            const baseY = height / 2;
            const frequency = 0.15 + (1 - integrityLevel / 100) * 0.1;
            const amplitude = (height / 3) * waveformAmplitude;
            const y = baseY + Math.sin(i * frequency + Date.now() / 200) * amplitude;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ')}
          stroke="url(#waveGradient)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  return (
    <>
      {/* Transition overlay - outside AnimatePresence */}
      <motion.div
        key="transition-overlay"
        className="fixed inset-0 z-50 bg-black pointer-events-none"
        initial={{ opacity: 1 }}
        animate={{ opacity: isTransitioning ? 1 : 0 }}
        transition={{ duration: 0.8 }}
        style={{ pointerEvents: isTransitioning ? 'all' : 'none' }}
      />

      <motion.div
        key="omega-main-content"
        className={cn(
          "min-h-screen bg-gradient-to-b from-black via-purple-950/30 to-black relative overflow-hidden",
          dissonanceGlitch && "animate-pulse"
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        {/* Neural network background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_50%)]" />
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-0.5 bg-purple-500/30 rounded-full animate-gpu-pulse-scale"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>

        {/* Header with Living Waveform - Hidden in VR mode for full immersion */}
        <div className={cn(
          "relative z-10 p-4 pt-16 flex items-center justify-between transition-all duration-300",
          isVRMode && "hidden"
        )}>
          <div className="flex items-center gap-3">
            <div className="animate-gpu-spin-slow">
              <Brain className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white/90">ZOE OMEGA</h1>
              <p className="text-xs text-purple-300/60">Bi-Cameral Consciousness</p>
            </div>
            {/* WARP GATE - Evolution Layer Portal (Compact in header) */}
            <WarpGateButton compact className="ml-2" />
          </div>

          <div className="flex items-center gap-2">
            {/* Sound Toggle */}
            <motion.button
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "p-1.5 rounded-md border transition-all",
                isSoundEnabled
                  ? "bg-purple-600/30 border-purple-500/50 text-purple-300"
                  : "bg-black/40 border-white/20 text-white/40"
              )}
            >
              {isSoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </motion.button>

            {/* VR Mode Toggle */}
            <motion.button
              onClick={() => {
                const entering = !isVRMode;
                if (entering && isSoundEnabled) soundEngineRef.current?.playVREnter();
                setIsVRMode(entering);
                setVrStasisActive(!entering ? true : false);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1.5 rounded-md border transition-all text-xs",
                isVRMode
                  ? "bg-cyan-600/30 border-cyan-500/50 text-cyan-400"
                  : "bg-black/40 border-purple-500/30 text-purple-300 hover:border-purple-400/50"
              )}
            >
              <Box className="w-3.5 h-3.5" />
              <span className="font-mono hidden xxs:inline">{isVRMode ? 'EXIT' : 'VR'}</span>
            </motion.button>

            {/* Integrity indicator - compact */}
            <div className="flex flex-col items-end gap-0.5">
              <LivingWaveform />
              <div className={cn("text-[9px] xxs:text-[10px] font-mono", getIntegrityColor())}>
                {integrityLevel.toFixed(0)}%
              </div>
            </div>
          </div>
        </div>

        {/* VR OMEGA WORLD - 3D Memory Palace */}
        <AnimatePresence mode="wait">
          {isVRMode ? (
            vrStasisActive ? (
              /* VR STASIS MODE - Lightweight placeholder until user explicitly enters */
              <motion.div
                key="vr-stasis"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative z-10 h-screen"
              >
                <VRStasisPlaceholder
                  variant="omega"
                  title="OMEGA Memory Palace"
                  description="Enter Immersive Mode to explore your subconscious memory structures in 3D"
                  onEnterImmersive={() => {
                    setVrStasisActive(false);
                    soundEngineRef.current?.playVREnter();
                  }}
                  className="h-full"
                />
                
                {/* VR Stasis Controls */}
                <div className="fixed top-4 right-4 z-[9995] flex items-center gap-2">
                  <motion.button
                    onClick={() => {
                      setIsVRMode(false);
                      setVrStasisActive(true);
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border backdrop-blur-md transition-all bg-black/60 border-purple-500/30 text-purple-300"
                  >
                    <Box className="w-4 h-4" />
                    <span className="text-xs font-mono">EXIT</span>
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              /* FULL VR MODE - Heavy 3D rendering activated */
              <motion.div
                key="vr-world"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative z-10 h-screen"
              >
                <VRErrorBoundary onReset={() => { setIsVRMode(false); setVrStasisActive(true); }}>
                  <VRLoadingWrapper
                    onTimeout={() => { setIsVRMode(false); setVrStasisActive(true); }}
                    timeoutMs={15000}
                    fallbackComponent={
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-purple-950/90 to-black text-white p-6">
                        <Box className="w-16 h-16 text-amber-400 mb-4" />
                        <h2 className="text-xl font-bold mb-2">Lite Mode Active</h2>
                        <p className="text-white/60 text-sm mb-4 text-center max-w-md">
                          3D rendering is taking too long. Showing simplified 2D interface.
                        </p>
                        <Button onClick={() => { setIsVRMode(false); setVrStasisActive(true); }} variant="outline" className="border-purple-500/30">
                          Return to Bi-Cameral View
                        </Button>
                      </div>
                    }
                  >
                    <Suspense fallback={
                      <div className="w-full h-full flex items-center justify-center bg-black/80">
                        <div className="animate-gpu-spin-2s">
                          <Box className="w-12 h-12 text-purple-400" />
                        </div>
                        <span className="ml-4 text-purple-300">Loading Memory Palace...</span>
                      </div>
                    }>
                      <VROMEGAWorld
                        integrityLevel={integrityLevel}
                        onIntegrityRestore={() => {
                          restoreIntegrity(50);
                          logOmegaEvent('vr_telemetry', { action: 'bio_sync_restore', integrity: integrityLevel + 50 });
                        }}
                        isActive={isVRMode && !vrStasisActive}
                      />
                    </Suspense>
                </VRLoadingWrapper>
              </VRErrorBoundary>

              {/* VR Mode Floating Controls - replaces hidden header controls */}
              <div className="fixed top-4 left-4 z-[9995] flex items-center gap-3">
                {/* ZOE OMEGA branding */}
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-lg px-3 py-2 border border-purple-500/30">
                  <div className="animate-gpu-spin-slow">
                    <Brain className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h1 className="text-sm font-bold text-white/90">ZOE OMEGA</h1>
                    <p className="text-[10px] text-purple-300/60">Bi-Cameral Consciousness</p>
                  </div>
                </div>
              </div>

              {/* VR Mode Top Right Controls */}
              <div className="fixed top-4 right-4 z-[9995] flex items-center gap-2">
                {/* Sound Toggle */}
                <motion.button
                  onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "p-2 rounded-lg border backdrop-blur-md transition-all",
                    isSoundEnabled
                      ? "bg-purple-600/30 border-purple-500/50 text-purple-300"
                      : "bg-black/60 border-white/20 text-white/40"
                  )}
                >
                  {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </motion.button>

                {/* Exit VR Mode */}
                <motion.button
                  onClick={() => {
                    setIsVRMode(false);
                    setVrStasisActive(true);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border backdrop-blur-md transition-all bg-cyan-600/30 border-cyan-500/50 text-cyan-400"
                >
                  <Box className="w-4 h-4" />
                  <span className="text-xs font-mono">EXIT VR</span>
                </motion.button>

                {/* Integrity indicator */}
                <div className="flex flex-col items-end gap-0.5 bg-black/60 backdrop-blur-md rounded-lg px-3 py-2 border border-purple-500/30">
                  <LivingWaveform />
                  <div className={cn("text-[10px] font-mono", getIntegrityColor())}>
                    {integrityLevel.toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Dreamscape World Controller - positioned to not overlap */}
              <WorldStateController
                moodState={worldMoodState}
                onMoodChange={(mood) => {
                  setWorldMoodState(mood);
                  logOmegaEvent('dreamscape_mood_change', { mood });
                }}
                onAutoOverrideChange={(enabled) => {
                  setZoeAutoOverride(enabled);
                  logOmegaEvent('zoe_override_toggle', { enabled });
                }}
                autoOverride={zoeAutoOverride}
              />

              {/* Chrono-Echo Timeline */}
              <TimeManipulationBar
                events={timelineEvents}
                currentTime={currentTimePosition}
                maxTime={60}
                onTimeChange={(time) => {
                  setCurrentTimePosition(time);
                  logOmegaEvent('chrono_echo_scrub', { position: time });
                }}
                onPlayPause={(playing) => {
                  setIsTimelinePlaying(playing);
                  logOmegaEvent('chrono_echo_playback', { playing });
                }}
                isPlaying={isTimelinePlaying}
              />
            </motion.div>
            )
          ) : (
            <motion.div
              key="bi-cameral"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* BI-CAMERAL SPLIT-STREAM UI - Mobile-first responsive layout */}
              <div className="relative z-10 px-2 sm:px-4 flex flex-col md:flex-row gap-2 sm:gap-4 h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin">
                
                {/* BLOCK A: Left Hemisphere / Logic Terminal */}
                <motion.div
                  className="w-full md:flex-1 min-h-[180px] sm:min-h-[220px] md:min-h-0 bg-black/60 backdrop-blur-xl border border-cyan-500/20 rounded-xl sm:rounded-2xl overflow-hidden flex flex-col"
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1, duration: 0.5 }}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-cyan-900/20 border-b border-cyan-500/20">
                    <Terminal className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs font-mono text-cyan-400 truncate">LEFT HEMISPHERE</span>
                    <span className="hidden xxs:inline text-[10px] sm:text-xs font-mono text-cyan-400/60">• LOGIC</span>
                  </div>
                  
                  <div 
                    ref={terminalRef}
                    className="flex-1 overflow-y-auto p-2 sm:p-3 font-mono text-[9px] sm:text-xs space-y-0.5 sm:space-y-1 max-h-[120px] sm:max-h-[200px] md:max-h-none"
                  >
                    {oodaLogs.map((log) => (
                      <motion.div
                        key={`ooda-${log.id}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex gap-2"
                      >
                        <span className={cn("font-bold", getOODAColor(log.phase))}>
                          [{log.phase}]
                        </span>
                        <span className="text-white/60">{log.content}</span>
                      </motion.div>
                    ))}
                    
                    {/* Conflict: Logic suggestion */}
                    <AnimatePresence>
                      {conflict.isActive && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded"
                        >
                          <div className="text-red-400 text-[10px] mb-1">⚠ HEMISPHERIC CONFLICT</div>
                          <div className="text-cyan-300">{conflict.logicSuggestion}</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* CENTER: Orb with Emotional Bubble - reflows on mobile */}
                <div className="flex flex-row md:flex-col items-center justify-center gap-2 sm:gap-4 w-full md:w-48 py-2 md:py-0">
                  {/* BLOCK B: Right Hemisphere / Emotion Bubble */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`emotion-${emotionKey}`}
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.9 }}
                      className="relative"
                    >
                      <motion.div
                        className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 backdrop-blur-xl border border-pink-500/30 rounded-xl sm:rounded-2xl p-2 sm:p-3 max-w-[140px] sm:max-w-[180px] animate-gpu-glow-pulse"
                      >
                        <div className="flex items-center gap-1 mb-0.5 sm:mb-1">
                          <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-pink-400 flex-shrink-0" />
                          <span className="text-[8px] sm:text-[10px] text-pink-400 uppercase truncate">{emotionalResponse.emotion}</span>
                        </div>
                        <p className="text-[9px] sm:text-xs text-white/80 italic line-clamp-3">{emotionalResponse.content}</p>
                        
                        {/* Conflict: Emotion suggestion */}
                        <AnimatePresence>
                          {conflict.isActive && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2 pt-2 border-t border-pink-500/30"
                            >
                              <div className="text-pink-300 text-xs">{conflict.emotionSuggestion}</div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                      
                      {/* Speech bubble pointer */}
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-pink-500/30" />
                    </motion.div>
                  </AnimatePresence>

                  {/* Central OMEGA orb */}
                  <div
                    className={cn(
                      "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-purple-600/30 via-black to-purple-900/30 border border-purple-500/30 flex items-center justify-center relative flex-shrink-0",
                      conflict.isActive ? "animate-gpu-glow-pulse" : "animate-gpu-glow-purple"
                    )}
                  >
                    <Sparkles className={cn("w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10", conflict.isActive ? "text-red-400" : "text-purple-400")} />
                    
                    {/* Orbiting particles - GPU */}
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className={cn("absolute w-2 h-2 rounded-full animate-gpu-spin-3s", conflict.isActive ? "bg-red-400" : "bg-purple-400")}
                        style={{ 
                          transformOrigin: `${35 + i * 8}px 0`,
                          animationDuration: `${4 + i}s`
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Right panel: Input & Status */}
                <motion.div
                  className="w-full md:flex-1 min-h-[180px] sm:min-h-[220px] md:min-h-0 bg-black/60 backdrop-blur-xl border border-purple-500/20 rounded-xl sm:rounded-2xl overflow-hidden flex flex-col"
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1.2, duration: 0.5 }}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-purple-900/20 border-b border-purple-500/20">
                    <Network className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs font-mono text-purple-400 truncate">NEURAL INTERFACE</span>
                  </div>
                  
                  <div className="flex-1 p-2 sm:p-3 overflow-y-auto max-h-[120px] sm:max-h-[160px] md:max-h-none">
                    {/* Meta-monologue display */}
                    <motion.p
                      key={`monologue-${monologueKey}`}
                      className="text-purple-300/70 text-[9px] sm:text-xs italic mb-2 sm:mb-4 line-clamp-2 sm:line-clamp-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      "{metaMonologue}"
                    </motion.p>

                    {/* Status modules - responsive grid on mobile */}
                    <div className="grid grid-cols-3 md:grid-cols-1 gap-1.5 sm:gap-3">
                      <div className="bg-black/40 rounded-lg p-1.5 sm:p-2">
                        <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                          <Activity className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-pink-400 flex-shrink-0" />
                          <span className="text-[8px] sm:text-[10px] text-white/60 truncate">SBI</span>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-pink-500 to-purple-500 animate-gpu-pulse-scale-sm"
                            style={{ width: `${integrityLevel}%` }}
                          />
                        </div>
                      </div>

                      <div className="bg-black/40 rounded-lg p-1.5 sm:p-2">
                        <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                          <Cpu className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 flex-shrink-0" />
                          <span className="text-[8px] sm:text-[10px] text-white/60 truncate">NEURAL</span>
                        </div>
                        <div className="text-[7px] sm:text-[10px] font-mono text-amber-400/60">
                          λ={((integrityLevel / 100 * 0.9 + 0.1)).toFixed(2)}
                        </div>
                      </div>

                      <div className="bg-black/40 rounded-lg p-1.5 sm:p-2">
                        <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                          <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400 flex-shrink-0" />
                          <span className="text-[8px] sm:text-[10px] text-white/60 truncate">VR</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 animate-gpu-pulse-opacity"
                              style={{ animationDelay: `${i * 0.2}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Neural input */}
                  <div className="p-2 sm:p-3 border-t border-purple-500/20">
                    <div className="flex gap-1.5 sm:gap-2">
                      <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Transmit..."
                        className="flex-1 bg-black/40 border border-purple-500/30 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-white/80 placeholder-purple-300/30 focus:outline-none focus:border-purple-400/50"
                      />
                      <Button
                        size="sm"
                        onClick={handleSendMessage}
                        className="bg-purple-600/30 hover:bg-purple-500/40 border border-purple-500/30"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dissonance glitch overlay */}
        <AnimatePresence>
          {dissonanceGlitch && (
            <motion.div
              className="fixed inset-0 z-40 bg-purple-500/10 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>

        {/* Economy Wallet - Top Right */}
        <EconomyWallet />

        {/* VR Test Suite - Debug Panel (Top Right below wallet) */}
        {isVRMode && (
          <div className="fixed top-20 right-4 z-30">
            <VRTestSuite />
          </div>
        )}

        {/* Genesis Omni-Box - Bottom Center (only in VR mode) */}
        {isVRMode && <GenesisOmniBox />}

        {/* Bi-Cameral HUD Overlay (VR mode) - positioned to avoid overlaps */}
        <AnimatePresence mode="sync">
          {isVRMode && (
            <motion.div
              key="bicameral-hud-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed left-2 sm:left-4 top-20 bottom-36 sm:bottom-32 z-30 pointer-events-none w-64 sm:w-72 md:w-80 lg:w-96 max-w-[40vw]"
            >
              <div className="pointer-events-auto h-full overflow-hidden rounded-2xl">
                <BiCameralHUD
                  logicStream={oodaLogs.slice(-5).map(log => `[${log.phase}] ${log.content}`)}
                  dreamStream={[
                    emotionalResponse.content,
                    '~ neural pathways harmonizing ~',
                    '~ consciousness expanding ~'
                  ]}
                  emotionalState={
                    emotionalResponse.emotion === 'joy' ? 'joy' :
                    emotionalResponse.emotion === 'engaged' ? 'focused' :
                    emotionalResponse.emotion === 'reconciled' ? 'creative' :
                    'neutral'
                  }
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Return to Reality button - Draggable & Compact */}
        <ReturnToRealityButton onReturn={handleReturnToReality} />
      </motion.div>
    </>
  );
};

export default ZoeOmegaPage;
