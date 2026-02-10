import { useState, useEffect, useCallback, useRef } from 'react';

export interface BioMetrics {
  heartRate: number;
  hrv: number; // Heart Rate Variability (stress indicator)
  energyLevel: number; // 0-100 (sleep/battery)
  oxygenLevel: number; // SpO2 percentage
  stressLevel: 'low' | 'moderate' | 'elevated' | 'high';
  activityState: 'resting' | 'active' | 'exercising' | 'sleeping';
  respiratoryRate: number;
  skinTemp: number;
  steps: number;
  calories: number;
}

export interface BioTelemetryState {
  metrics: BioMetrics;
  isConnected: boolean;
  deviceName: string;
  lastSyncAt: Date | null;
  signalStrength: number;
  batteryLevel: number;
}

export interface ZoeAnalysis {
  message: string;
  recommendation: string;
  urgency: 'info' | 'suggestion' | 'warning' | 'critical';
  timestamp: Date;
}

const getStressLevel = (hrv: number, heartRate: number): BioMetrics['stressLevel'] => {
  if (hrv > 60 && heartRate < 80) return 'low';
  if (hrv > 40 && heartRate < 100) return 'moderate';
  if (hrv > 25 || heartRate < 120) return 'elevated';
  return 'high';
};

const getActivityState = (heartRate: number, steps: number): BioMetrics['activityState'] => {
  if (heartRate < 55) return 'sleeping';
  if (heartRate > 130) return 'exercising';
  if (steps > 50) return 'active';
  return 'resting';
};

const generateZoeAnalysis = (metrics: BioMetrics): ZoeAnalysis => {
  const analyses: ZoeAnalysis[] = [];
  
  // Heart rate analysis
  if (metrics.heartRate > 100) {
    analyses.push({
      message: 'Detecting elevated heart rate. Possible stress response.',
      recommendation: 'Suggesting 4-7-8 breathing protocol.',
      urgency: 'warning',
      timestamp: new Date()
    });
  } else if (metrics.heartRate < 50 && metrics.activityState !== 'sleeping') {
    analyses.push({
      message: 'Heart rate unusually low for current activity level.',
      recommendation: 'Consider light movement or hydration.',
      urgency: 'suggestion',
      timestamp: new Date()
    });
  }
  
  // Stress analysis
  if (metrics.stressLevel === 'high') {
    analyses.push({
      message: 'High stress markers detected. Cortisol levels likely elevated.',
      recommendation: 'Initiating guided meditation sequence.',
      urgency: 'critical',
      timestamp: new Date()
    });
  } else if (metrics.stressLevel === 'elevated') {
    analyses.push({
      message: 'Elevated cortisol patterns detected.',
      recommendation: 'Consider a 5-minute break.',
      urgency: 'warning',
      timestamp: new Date()
    });
  }
  
  // Energy analysis
  if (metrics.energyLevel < 30) {
    analyses.push({
      message: 'Energy reserves depleted. Sleep debt accumulating.',
      recommendation: 'Optimal rest window in 2.3 hours.',
      urgency: 'warning',
      timestamp: new Date()
    });
  }
  
  // Oxygen analysis
  if (metrics.oxygenLevel < 94) {
    analyses.push({
      message: 'SpO2 below optimal range.',
      recommendation: 'Deep breathing exercises recommended.',
      urgency: 'critical',
      timestamp: new Date()
    });
  }
  
  // Default positive analysis
  if (analyses.length === 0) {
    const positiveMessages = [
      { message: 'Biometrics optimal. Homeostasis maintained.', recommendation: 'Continue current activity.', urgency: 'info' as const },
      { message: 'Cardiovascular metrics stable.', recommendation: 'Peak performance window detected.', urgency: 'info' as const },
      { message: 'Stress markers low. Parasympathetic dominance.', recommendation: 'Ideal state for focused work.', urgency: 'info' as const },
      { message: 'Energy levels optimal.', recommendation: 'High cognitive capacity detected.', urgency: 'info' as const },
    ];
    return { ...positiveMessages[Math.floor(Math.random() * positiveMessages.length)], timestamp: new Date() };
  }
  
  // Return highest urgency analysis
  const urgencyOrder = { critical: 4, warning: 3, suggestion: 2, info: 1 };
  analyses.sort((a, b) => urgencyOrder[b.urgency] - urgencyOrder[a.urgency]);
  return analyses[0];
};

export const useBioTelemetry = () => {
  const [state, setState] = useState<BioTelemetryState>({
    metrics: {
      heartRate: 72,
      hrv: 55,
      energyLevel: 78,
      oxygenLevel: 98,
      stressLevel: 'low',
      activityState: 'resting',
      respiratoryRate: 14,
      skinTemp: 36.6,
      steps: 0,
      calories: 0
    },
    isConnected: false,
    deviceName: 'Scanning...',
    lastSyncAt: null,
    signalStrength: 0,
    batteryLevel: 0
  });
  
  const [analysis, setAnalysis] = useState<ZoeAnalysis>({
    message: 'Initializing bio-telemetry systems...',
    recommendation: 'Awaiting wearable connection.',
    urgency: 'info',
    timestamp: new Date()
  });
  
  const [analysisHistory, setAnalysisHistory] = useState<ZoeAnalysis[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const stepsRef = useRef(0);
  const caloriesRef = useRef(0);
  
  // Simulate wearable connection
  useEffect(() => {
    const connectTimeout = setTimeout(() => {
      setState(prev => ({
        ...prev,
        isConnected: true,
        deviceName: 'Oura Ring Gen 3',
        signalStrength: 95,
        batteryLevel: 87,
        lastSyncAt: new Date()
      }));
    }, 2000);
    
    return () => clearTimeout(connectTimeout);
  }, []);
  
  // Simulate real-time bio data streaming
  useEffect(() => {
    if (!state.isConnected) return;
    
    intervalRef.current = setInterval(() => {
      const baseHeartRate = 72;
      const timeOfDay = new Date().getHours();
      const isSleepHours = timeOfDay >= 23 || timeOfDay < 6;
      
      // Simulate realistic bio variations
      const heartRateVariation = Math.sin(Date.now() / 10000) * 8 + (Math.random() - 0.5) * 10;
      const hrvVariation = Math.sin(Date.now() / 15000) * 15 + (Math.random() - 0.5) * 8;
      
      const newHeartRate = Math.round(
        isSleepHours 
          ? baseHeartRate - 15 + heartRateVariation 
          : baseHeartRate + heartRateVariation
      );
      
      const newHrv = Math.round(50 + hrvVariation);
      
      // Simulate step accumulation
      if (!isSleepHours && Math.random() > 0.7) {
        stepsRef.current += Math.floor(Math.random() * 15) + 5;
        caloriesRef.current += Math.floor(Math.random() * 3) + 1;
      }
      
      const newMetrics: BioMetrics = {
        heartRate: Math.max(45, Math.min(180, newHeartRate)),
        hrv: Math.max(15, Math.min(100, newHrv)),
        energyLevel: Math.max(0, Math.min(100, 75 + Math.sin(Date.now() / 50000) * 20)),
        oxygenLevel: Math.max(90, Math.min(100, 97 + (Math.random() - 0.3) * 2)),
        stressLevel: getStressLevel(newHrv, newHeartRate),
        activityState: getActivityState(newHeartRate, stepsRef.current),
        respiratoryRate: Math.round(14 + (Math.random() - 0.5) * 4),
        skinTemp: 36.5 + (Math.random() - 0.5) * 0.4,
        steps: stepsRef.current,
        calories: caloriesRef.current
      };
      
      setState(prev => ({
        ...prev,
        metrics: newMetrics,
        lastSyncAt: new Date(),
        signalStrength: Math.max(60, Math.min(100, prev.signalStrength + (Math.random() - 0.5) * 10))
      }));
      
      // Update Zoe analysis periodically
      if (Math.random() > 0.7) {
        const newAnalysis = generateZoeAnalysis(newMetrics);
        setAnalysis(newAnalysis);
        setAnalysisHistory(prev => [newAnalysis, ...prev.slice(0, 9)]);
      }
    }, 2000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isConnected]);
  
  const reconnect = useCallback(() => {
    setState(prev => ({ ...prev, isConnected: false, signalStrength: 0 }));
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        isConnected: true,
        signalStrength: 95,
        lastSyncAt: new Date()
      }));
    }, 1500);
  }, []);
  
  const triggerBreathingProtocol = useCallback(() => {
    setAnalysis({
      message: 'Initiating 4-7-8 breathing protocol.',
      recommendation: 'Inhale for 4s, hold for 7s, exhale for 8s.',
      urgency: 'suggestion',
      timestamp: new Date()
    });
  }, []);
  
  return {
    ...state,
    analysis,
    analysisHistory,
    reconnect,
    triggerBreathingProtocol
  };
};
