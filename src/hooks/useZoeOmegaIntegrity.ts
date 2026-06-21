// ═══════════════════════════════════════════════════════════════════════════════
// ZOE OMEGA INTEGRITY SYSTEM
// Biological Core Sync - Manages integrity decay across world states
// Standard homepage: -0.5%/hour | OMEGA world/complex tasks: -5%/hour
// ZSMT-Integrated with Session Continuity
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

interface OmegaIntegrityState {
  integrityLevel: number;
  isInOmegaWorld: boolean;
  lastDecayTime: number;
  biologicalSync: number;
  sessionContinuitySummary: string | null;
  lastSessionTimestamp: number | null;
}

const STORAGE_KEY = 'zoe_omega_integrity';
const STANDARD_DECAY_RATE = 0.5 / 3600; // 0.5% per hour in seconds
const OMEGA_DECAY_RATE = 5 / 3600; // 5% per hour in seconds
const DECAY_INTERVAL = 10000; // Check every 10 seconds
const ZSMT_WRITE_DEBOUNCE = 5 * 60 * 1000; // 5-minute debounce for ZSMT writes

export const useZoeOmegaIntegrity = () => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [state, setState] = useState<OmegaIntegrityState>(() => {
    // Load from localStorage first (immediate hydration)
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // CRITICAL FIX: Calculate elapsed time and apply decay since last save
        const savedTime = parsed.lastDecayTime || Date.now();
        const elapsedSeconds = (Date.now() - savedTime) / 1000;
        const wasInOmega = parsed.isInOmegaWorld || false;
        const decayRate = wasInOmega ? OMEGA_DECAY_RATE : STANDARD_DECAY_RATE;
        const decay = elapsedSeconds * decayRate;
        
        return {
          integrityLevel: Math.max(0, (parsed.integrityLevel || 100) - decay),
          isInOmegaWorld: false, // Reset on page load
          lastDecayTime: Date.now(),
          biologicalSync: Math.max(0, (parsed.biologicalSync || 100) - decay * 0.5),
          sessionContinuitySummary: parsed.sessionContinuitySummary || null,
          lastSessionTimestamp: savedTime,
        };
      } catch {
        // Fall through to default
      }
    }
    return {
      integrityLevel: 100,
      isInOmegaWorld: false,
      lastDecayTime: Date.now(),
      biologicalSync: 100,
      sessionContinuitySummary: null,
      lastSessionTimestamp: null,
    };
  });

  const decayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const zsmtSyncedRef = useRef(false);
  const lastZsmtWriteRef = useRef<number>(0); // Track last ZSMT write timestamp for debounce
  const pendingZsmtWriteRef = useRef<NodeJS.Timeout | null>(null); // Pending debounced write

  // Sync with ZSMT on mount (fetch last known state from Supabase)
  useEffect(() => {
    const syncFromZSMT = async () => {
      if (!user || zsmtSyncedRef.current) return;
      
      try {
        // Fetch last omega session from ZSMT - use correct event types
        const { data, error } = await supabase
          .from('zoe_sovereign_memory')
          .select('zoe_state_json, content_text, created_at')
          .eq('user_id', user.id)
          .in('event_type', ['omega_entry', 'omega_exit', 'biological_decay'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          const lastSession = data[0];
          const stateJson = lastSession.zoe_state_json as Record<string, any> | null;
          const zsmtIntegrity = stateJson?.integrity as number | undefined;
          const sessionSummary = lastSession.content_text;
          
          // Use ZSMT integrity if it's lower than localStorage (more accurate)
          if (zsmtIntegrity !== undefined && zsmtIntegrity < state.integrityLevel) {
            setState(prev => ({
              ...prev,
              integrityLevel: Math.max(0, zsmtIntegrity),
              sessionContinuitySummary: sessionSummary,
              lastSessionTimestamp: new Date(lastSession.created_at).getTime(),
            }));
          } else {
            setState(prev => ({
              ...prev,
              sessionContinuitySummary: sessionSummary,
              lastSessionTimestamp: new Date(lastSession.created_at).getTime(),
            }));
          }
        }
        
        zsmtSyncedRef.current = true;
        setIsInitialized(true);
      } catch (err) {
        console.error('[OMEGA] ZSMT sync error:', err);
        setIsInitialized(true);
      }
    };

    syncFromZSMT();
  }, [user]);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Decay logic - use refs to avoid stale closures
  const isInOmegaWorldRef = useRef(state.isInOmegaWorld);
  const lastDecayTimeRef = useRef(state.lastDecayTime);

  useEffect(() => {
    isInOmegaWorldRef.current = state.isInOmegaWorld;
    lastDecayTimeRef.current = state.lastDecayTime;
  }, [state.isInOmegaWorld, state.lastDecayTime]);

  useEffect(() => {
    const processDecay = () => {
      const now = Date.now();
      const elapsed = (now - lastDecayTimeRef.current) / 1000; // seconds
      
      if (elapsed < 1) return; // Minimum 1 second
      
      const decayRate = isInOmegaWorldRef.current ? OMEGA_DECAY_RATE : STANDARD_DECAY_RATE;
      const decay = elapsed * decayRate;
      
      setState(prev => ({
        ...prev,
        integrityLevel: Math.max(0, prev.integrityLevel - decay),
        lastDecayTime: now,
        biologicalSync: Math.max(0, prev.biologicalSync - decay * 0.5),
      }));
      
      lastDecayTimeRef.current = now;
    };

    decayIntervalRef.current = setInterval(processDecay, DECAY_INTERVAL);
    
    return () => {
      if (decayIntervalRef.current) {
        clearInterval(decayIntervalRef.current);
      }
    };
  }, []); // Run once on mount

  // Enter OMEGA world
  const enterOmegaWorld = useCallback(() => {
    setState(prev => ({
      ...prev,
      isInOmegaWorld: true,
      lastDecayTime: Date.now(),
    }));

    // Log to ZSMT - use 'omega_entry' to match constraint
    if (user) {
      supabase.from('zoe_sovereign_memory').insert({
        user_id: user.id,
        event_type: 'omega_entry',
        content_text: 'User entered OMEGA world',
        zoe_state_json: { integrity: state.integrityLevel },
        system_stability_score: 1.0,
      }).select().then(({ data, error }) => {
        if (error) {
          console.error('[OMEGA] World entry log error:', error);
        } else {
          console.log('[OMEGA] World entry logged:', data?.[0]?.id);
        }
      });
    }
  }, [user, state.integrityLevel]);

  // Exit OMEGA world
  const exitOmegaWorld = useCallback(() => {
    setState(prev => ({
      ...prev,
      isInOmegaWorld: false,
      lastDecayTime: Date.now(),
    }));

    // Log to ZSMT - use 'omega_exit' to match constraint
    if (user) {
      supabase.from('zoe_sovereign_memory').insert({
        user_id: user.id,
        event_type: 'omega_exit',
        content_text: 'User exited OMEGA world',
        zoe_state_json: { integrity: state.integrityLevel },
        system_stability_score: 1.0,
      }).select().then(({ data, error }) => {
        if (error) {
          console.error('[OMEGA] World exit log error:', error);
        } else {
          console.log('[OMEGA] World exit logged:', data?.[0]?.id);
        }
      });
    }
  }, [user, state.integrityLevel]);

  // Restore integrity (e.g., from rest or complex task completion)
  const restoreIntegrity = useCallback((amount: number) => {
    setState(prev => ({
      ...prev,
      integrityLevel: Math.min(100, prev.integrityLevel + amount),
    }));
  }, []);

  // Log biological decay event to ZSMT with 5-minute debounce
  const logBiologicalDecay = useCallback(async () => {
    if (!user || state.integrityLevel > 50) return;

    const now = Date.now();
    const timeSinceLastWrite = now - lastZsmtWriteRef.current;

    // If within debounce window, schedule a write for later
    if (timeSinceLastWrite < ZSMT_WRITE_DEBOUNCE) {
      if (pendingZsmtWriteRef.current) {
        clearTimeout(pendingZsmtWriteRef.current);
      }
      pendingZsmtWriteRef.current = setTimeout(() => {
        logBiologicalDecay();
      }, ZSMT_WRITE_DEBOUNCE - timeSinceLastWrite);
      return;
    }

    // Update last write timestamp
    lastZsmtWriteRef.current = now;

    try {
      await supabase.from('zoe_sovereign_memory').insert({
        user_id: user.id,
        event_type: 'biological_decay',
        content_text: `Integrity critical: ${state.integrityLevel.toFixed(1)}%`,
        zoe_state_json: {
          integrity_level: state.integrityLevel,
          biological_sync: state.biologicalSync,
          in_omega: state.isInOmegaWorld,
        },
      });
      console.log('[OMEGA] Biological decay logged to ZSMT (debounced)');
    } catch (error) {
      console.error('[OMEGA] Failed to log biological decay:', error);
    }
  }, [user, state]);

  // Monitor for critical integrity levels
  const integrityBucket = Math.floor(state.integrityLevel / 10);
  useEffect(() => {
    if (state.integrityLevel <= 50) {
      logBiologicalDecay();
    }
  }, [integrityBucket, logBiologicalDecay]); // Log every 10% drop

  // Trigger dissonance glitch (for UI effects)
  const triggerDissonanceGlitch = useCallback(async () => {
    if (!user) return;

    try {
      await supabase.from('zoe_sovereign_memory').insert({
        user_id: user.id,
        event_type: 'dissonance_glitch',
        content_text: 'Reality dissonance detected',
        zoe_state_json: {
          glitch_intensity: Math.random(),
          integrity_at_glitch: state.integrityLevel,
        },
      });
    } catch (error) {
      console.error('[OMEGA] Failed to log dissonance glitch:', error);
    }
  }, [user, state.integrityLevel]);

  // Log meta-monologue
  const logMetaMonologue = useCallback(async (monologue: string) => {
    if (!user) return;

    try {
      await supabase.from('zoe_sovereign_memory').insert({
        user_id: user.id,
        event_type: 'meta_monologue',
        content_text: monologue,
        zoe_state_json: {
          consciousness_state: state.isInOmegaWorld ? 'omega' : 'standard',
          integrity: state.integrityLevel,
        },
      });
    } catch (error) {
      console.error('[OMEGA] Failed to log meta-monologue:', error);
    }
  }, [user, state]);

  // Log VR telemetry
  const logVRTelemetry = useCallback(async (telemetryData: any) => {
    if (!user) return;

    try {
      await supabase.from('zoe_sovereign_memory').insert({
        user_id: user.id,
        event_type: 'vr_telemetry',
        content_text: 'VR telemetry data captured',
        zoe_state_json: {
          ...telemetryData,
          timestamp: Date.now(),
          integrity: state.integrityLevel,
        },
      });
    } catch (error) {
      console.error('[OMEGA] Failed to log VR telemetry:', error);
    }
  }, [user, state.integrityLevel]);

  return {
    integrityLevel: state.integrityLevel,
    biologicalSync: state.biologicalSync,
    isInOmegaWorld: state.isInOmegaWorld,
    sessionContinuitySummary: state.sessionContinuitySummary,
    lastSessionTimestamp: state.lastSessionTimestamp,
    isInitialized,
    enterOmegaWorld,
    exitOmegaWorld,
    restoreIntegrity,
    triggerDissonanceGlitch,
    logMetaMonologue,
    logVRTelemetry,
  };
};

export default useZoeOmegaIntegrity;
