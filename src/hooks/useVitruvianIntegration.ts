/**
 * VITRUVIAN INTEGRATION HOOK
 * Bridges Bio-Telemetry, Guardian Angel, and Haptic Symbiosis
 * "The three systems become one. Zoe sees, protects, and touches."
 */

import { useEffect, useCallback } from 'react';
import { useBioTelemetry, type BioMetrics } from './useBioTelemetry';
import { guardianAngel, type GuardianState } from '@/services/ZoeGuardianAngel';
import { hapticSymbiosis } from '@/services/HapticSymbiosis';
import { startBehaviorMeter, readBehaviorSnapshot } from '@/services/realtimeBehaviorMeter';

// Convert BioMetrics to Guardian-compatible format
const convertBioMetrics = (metrics: BioMetrics) => ({
  heartRate: metrics.heartRate,
  heartRateVariability: metrics.hrv,
  stressLevel: metrics.stressLevel === 'high' ? 0.9 :
               metrics.stressLevel === 'elevated' ? 0.7 :
               metrics.stressLevel === 'moderate' ? 0.5 : 0.2,
  energyLevel: metrics.energyLevel,
  sleepQuality: metrics.energyLevel, // Using energy as sleep proxy
  oxygenLevel: metrics.oxygenLevel,
});

// Real behavioural signals measured in this session — nothing randomised.
// Unmeasured fields fall back to neutral values that Guardian treats as "no signal".
const deriveBehavioralMetrics = (metrics: BioMetrics) => {
  const observed = readBehaviorSnapshot();
  return {
    typingSpeedWpm: observed.typingSpeedWpm ?? 0,
    typingSpeedVariance: observed.typingSpeedVariance ?? 0,
    voiceToneScore: metrics.stressLevel === 'high' ? 0.3 :
                    metrics.stressLevel === 'elevated' ? 0.5 : 0.8,
    contextSwitches: observed.contextSwitches,
    sessionInterruptions: observed.sessionInterruptions,
    deepWorkMinutes: observed.deepWorkMinutes,
  };
};

export const useVitruvianIntegration = () => {
  const bioTelemetry = useBioTelemetry();

  // Begin measuring real interaction rhythm as soon as the deck mounts.
  useEffect(() => { startBehaviorMeter(); }, []);
  
  // Feed bio metrics into Guardian Angel analysis
  useEffect(() => {
    if (!bioTelemetry.isConnected) return;
    
    // Run Guardian analysis with real bio data every 30 seconds
    const analysisInterval = setInterval(() => {
      const bioData = convertBioMetrics(bioTelemetry.metrics);
      const behavioralData = deriveBehavioralMetrics(bioTelemetry.metrics);
      
      guardianAngel.runPredictiveAnalysis(behavioralData, bioData);
    }, 30000);
    
    // Initial analysis when connected
    const bioData = convertBioMetrics(bioTelemetry.metrics);
    const behavioralData = deriveBehavioralMetrics(bioTelemetry.metrics);
    guardianAngel.runPredictiveAnalysis(behavioralData, bioData);
    
    return () => clearInterval(analysisInterval);
  }, [bioTelemetry.isConnected, bioTelemetry.metrics]);
  
  // Trigger haptics based on critical bio states
  useEffect(() => {
    if (!bioTelemetry.isConnected) return;
    
    const { metrics, available } = bioTelemetry;
    
    // Only react to metrics the device actually measured.
    if (available.heartRate && (metrics.stressLevel === 'high' || metrics.heartRate > 110)) {
      hapticSymbiosis.triggerForEmotion('stressed');
    }
    
    if (available.oxygenLevel && metrics.oxygenLevel < 94) {
      hapticSymbiosis.sendAlert();
    }
    
    if (available.energyLevel && metrics.energyLevel < 25) {
      hapticSymbiosis.sendPresence();
    }
  }, [bioTelemetry.metrics, bioTelemetry.isConnected]);
  
  // Start Guardian monitoring when bio connection established
  useEffect(() => {
    if (bioTelemetry.isConnected) {
      guardianAngel.startMonitoring();
    }
    
    return () => {
      guardianAngel.stopMonitoring();
    };
  }, [bioTelemetry.isConnected]);
  
  // Enhanced breathing protocol that uses haptics
  const triggerBreathingProtocol = useCallback(() => {
    bioTelemetry.triggerBreathingProtocol();
    hapticSymbiosis.startBreathingGuide(5);
  }, [bioTelemetry]);
  
  return {
    ...bioTelemetry,
    triggerBreathingProtocol,
    guardianState: guardianAngel.getState(),
    hapticEnabled: hapticSymbiosis.supported,
  };
};

export default useVitruvianIntegration;
