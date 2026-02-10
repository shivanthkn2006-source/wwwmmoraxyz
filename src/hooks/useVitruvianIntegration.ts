/**
 * VITRUVIAN INTEGRATION HOOK
 * Bridges Bio-Telemetry, Guardian Angel, and Haptic Symbiosis
 * "The three systems become one. Zoe sees, protects, and touches."
 */

import { useEffect, useCallback } from 'react';
import { useBioTelemetry, type BioMetrics } from './useBioTelemetry';
import { guardianAngel, type GuardianState } from '@/services/ZoeGuardianAngel';
import { hapticSymbiosis } from '@/services/HapticSymbiosis';

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

// Convert activity to behavioral metrics
const deriveBehavioralMetrics = (metrics: BioMetrics) => {
  const isActive = metrics.activityState === 'active' || metrics.activityState === 'exercising';
  const hour = new Date().getHours();
  
  // Simulate typing speed based on activity and time
  const baseTypingSpeed = 60;
  const activityModifier = isActive ? 0.8 : 1.0;
  const timeModifier = hour >= 14 && hour <= 16 ? 0.85 : 1.0; // Afternoon slump
  
  return {
    typingSpeedWpm: Math.floor(baseTypingSpeed * activityModifier * timeModifier * (0.9 + Math.random() * 0.2)),
    typingSpeedVariance: Math.random() * 15,
    voiceToneScore: metrics.stressLevel === 'high' ? 0.3 : 
                    metrics.stressLevel === 'elevated' ? 0.5 : 0.8,
    contextSwitches: isActive ? Math.floor(Math.random() * 10) : Math.floor(Math.random() * 20),
    sessionInterruptions: Math.floor(Math.random() * 8),
    deepWorkMinutes: isActive ? 30 : 60 + Math.floor(Math.random() * 60),
  };
};

export const useVitruvianIntegration = () => {
  const bioTelemetry = useBioTelemetry();
  
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
    
    const { metrics } = bioTelemetry;
    
    // Critical stress - trigger comfort haptic
    if (metrics.stressLevel === 'high' || metrics.heartRate > 110) {
      hapticSymbiosis.triggerForEmotion('stressed');
    }
    
    // Low oxygen - alert haptic
    if (metrics.oxygenLevel < 94) {
      hapticSymbiosis.sendAlert();
    }
    
    // Low energy - gentle presence
    if (metrics.energyLevel < 25) {
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
