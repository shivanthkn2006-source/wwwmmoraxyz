// ═══════════════════════════════════════════════════════════════════════════════
// ZOE GUARDIAN ANGEL - Predictive Health Protection System
// "I see the storm before it arrives. I shield you before you fall."
// ═══════════════════════════════════════════════════════════════════════════════

import { hapticSymbiosis } from './HapticSymbiosis';

// Health prediction types
export type HealthPrediction = {
  type: 'cognitive_fatigue' | 'stress_critical' | 'energy_crash' | 'focus_decline' | 'burnout_warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timeToOnset: number; // minutes
  confidence: number; // 0-1
  message: string;
  suggestedAction: string;
};

export type InterventionLevel = 'suggest' | 'notify' | 'gentle' | 'override';

export type GuardianState = {
  isMonitoring: boolean;
  currentPredictions: HealthPrediction[];
  lastAnalysis: Date | null;
  interventionActive: boolean;
  interventionType: string | null;
};

// Behavioral metrics from DHF
interface BehavioralMetrics {
  typingSpeedWpm: number;
  typingSpeedVariance: number;
  voiceToneScore: number; // 0-1, lower = stressed
  contextSwitches: number;
  sessionInterruptions: number;
  deepWorkMinutes: number;
}

// Bio telemetry from Vitruvian
interface BioMetrics {
  heartRate: number;
  heartRateVariability: number;
  stressLevel: number; // 0-1
  energyLevel: number; // 0-100
  sleepQuality: number; // 0-100 (last night)
  oxygenLevel: number;
}

// Thresholds for predictions
const THRESHOLDS = {
  typingSpeedDrop: 0.7, // 30% drop from baseline
  sleepQualityLow: 60,
  stressCritical: 0.8,
  heartRateElevated: 100,
  hrvLow: 30,
  energyLow: 30,
  contextSwitchesHigh: 15,
};

class ZoeGuardianAngelService {
  private state: GuardianState = {
    isMonitoring: false,
    currentPredictions: [],
    lastAnalysis: null,
    interventionActive: false,
    interventionType: null,
  };

  private baselineTypingSpeed: number = 60; // WPM baseline
  private analysisInterval: number | null = null;
  private listeners: Set<(state: GuardianState) => void> = new Set();

  constructor() {
    console.log('[GuardianAngel] Initialized - Watching over you');
  }

  // Subscribe to state changes
  subscribe(listener: (state: GuardianState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Start monitoring
  startMonitoring(): void {
    if (this.state.isMonitoring) return;
    
    this.state.isMonitoring = true;
    this.notifyListeners();
    
    // Run analysis every 5 minutes
    this.analysisInterval = window.setInterval(() => {
      this.runPredictiveAnalysis();
    }, 5 * 60 * 1000);

    // Initial analysis
    this.runPredictiveAnalysis();
    
    console.log('[GuardianAngel] Monitoring started');
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    this.state.isMonitoring = false;
    this.notifyListeners();
    
    console.log('[GuardianAngel] Monitoring stopped');
  }

  // Main predictive analysis engine
  runPredictiveAnalysis(
    behavioral?: Partial<BehavioralMetrics>,
    bio?: Partial<BioMetrics>
  ): HealthPrediction[] {
    const predictions: HealthPrediction[] = [];
    
    // Get current metrics (simulated if not provided)
    const behavioralData: BehavioralMetrics = {
      typingSpeedWpm: behavioral?.typingSpeedWpm ?? this.getSimulatedTypingSpeed(),
      typingSpeedVariance: behavioral?.typingSpeedVariance ?? Math.random() * 20,
      voiceToneScore: behavioral?.voiceToneScore ?? 0.5 + Math.random() * 0.5,
      contextSwitches: behavioral?.contextSwitches ?? Math.floor(Math.random() * 20),
      sessionInterruptions: behavioral?.sessionInterruptions ?? Math.floor(Math.random() * 10),
      deepWorkMinutes: behavioral?.deepWorkMinutes ?? Math.floor(Math.random() * 120),
    };

    const bioData: BioMetrics = {
      heartRate: bio?.heartRate ?? 60 + Math.floor(Math.random() * 40),
      heartRateVariability: bio?.heartRateVariability ?? 30 + Math.floor(Math.random() * 40),
      stressLevel: bio?.stressLevel ?? Math.random(),
      energyLevel: bio?.energyLevel ?? Math.floor(Math.random() * 100),
      sleepQuality: bio?.sleepQuality ?? Math.floor(Math.random() * 100),
      oxygenLevel: bio?.oxygenLevel ?? 95 + Math.floor(Math.random() * 5),
    };

    // PREDICTION 1: Cognitive Fatigue
    const typingSpeedRatio = behavioralData.typingSpeedWpm / this.baselineTypingSpeed;
    if (typingSpeedRatio < THRESHOLDS.typingSpeedDrop && bioData.sleepQuality < THRESHOLDS.sleepQualityLow) {
      predictions.push({
        type: 'cognitive_fatigue',
        severity: typingSpeedRatio < 0.5 ? 'high' : 'medium',
        timeToOnset: Math.floor(120 * typingSpeedRatio), // Faster onset with worse metrics
        confidence: 0.85,
        message: `Cognitive fatigue imminent in ${Math.floor(120 * typingSpeedRatio)} minutes.`,
        suggestedAction: 'Consider a 15-minute power rest. I\'ll guard your notifications.',
      });
    }

    // PREDICTION 2: Stress Critical
    if (bioData.stressLevel > THRESHOLDS.stressCritical || bioData.heartRate > THRESHOLDS.heartRateElevated) {
      const severity = bioData.stressLevel > 0.9 ? 'critical' : 'high';
      predictions.push({
        type: 'stress_critical',
        severity,
        timeToOnset: 0, // Immediate
        confidence: 0.92,
        message: 'System overheat detected. Stress levels critical.',
        suggestedAction: severity === 'critical' 
          ? 'Initiating cooldown protocol. Close your eyes.'
          : 'Recommending breathing exercise. I\'m here with you.',
      });
    }

    // PREDICTION 3: Energy Crash
    if (bioData.energyLevel < THRESHOLDS.energyLow && behavioralData.deepWorkMinutes > 90) {
      predictions.push({
        type: 'energy_crash',
        severity: bioData.energyLevel < 20 ? 'high' : 'medium',
        timeToOnset: 30,
        confidence: 0.78,
        message: 'Energy reserves depleting. Crash predicted in 30 minutes.',
        suggestedAction: 'Time for a strategic break. Hydration and movement recommended.',
      });
    }

    // PREDICTION 4: Focus Decline
    if (behavioralData.contextSwitches > THRESHOLDS.contextSwitchesHigh) {
      predictions.push({
        type: 'focus_decline',
        severity: behavioralData.contextSwitches > 25 ? 'high' : 'medium',
        timeToOnset: 15,
        confidence: 0.72,
        message: 'Focus fragmentation detected. Deep work capacity compromised.',
        suggestedAction: 'Entering focus shield mode. Non-essential notifications paused.',
      });
    }

    // PREDICTION 5: Burnout Warning (long-term pattern)
    if (
      bioData.sleepQuality < 50 && 
      bioData.stressLevel > 0.6 && 
      behavioralData.deepWorkMinutes < 30
    ) {
      predictions.push({
        type: 'burnout_warning',
        severity: 'high',
        timeToOnset: 24 * 60, // 24 hours pattern
        confidence: 0.65,
        message: 'Burnout pattern emerging. Recovery protocol advised.',
        suggestedAction: 'Extended rest cycle recommended. I\'ll manage what I can while you recover.',
      });
    }

    // Update state
    this.state.currentPredictions = predictions;
    this.state.lastAnalysis = new Date();
    this.notifyListeners();

    // Trigger interventions if needed
    this.processInterventions(predictions, bioData);

    console.log('[GuardianAngel] Analysis complete:', predictions.length, 'predictions');
    return predictions;
  }

  // Process and trigger interventions
  private processInterventions(predictions: HealthPrediction[], bio: BioMetrics): void {
    const criticalPrediction = predictions.find(p => p.severity === 'critical');
    
    if (criticalPrediction) {
      this.triggerIntervention('override', criticalPrediction, bio);
    } else {
      const highPrediction = predictions.find(p => p.severity === 'high');
      if (highPrediction) {
        this.triggerIntervention('gentle', highPrediction, bio);
      }
    }

    // Cancel low-priority notifications for cognitive fatigue
    const fatiguePrediction = predictions.find(p => p.type === 'cognitive_fatigue');
    if (fatiguePrediction) {
      this.suppressNotifications();
    }
  }

  // Trigger intervention
  triggerIntervention(level: InterventionLevel, prediction: HealthPrediction, bio: BioMetrics): void {
    this.state.interventionActive = true;
    this.state.interventionType = prediction.type;
    this.notifyListeners();

    // Dispatch intervention event for UI
    window.dispatchEvent(new CustomEvent('guardian-intervention', {
      detail: {
        level,
        prediction,
        bio,
        timestamp: Date.now(),
      }
    }));

    // Trigger haptic based on intervention type
    if (level === 'override') {
      hapticSymbiosis.startBreathingGuide(5);
    } else if (level === 'gentle') {
      hapticSymbiosis.sendComfort();
    }

    console.log('[GuardianAngel] Intervention triggered:', level, prediction.type);
  }

  // End intervention
  endIntervention(): void {
    this.state.interventionActive = false;
    this.state.interventionType = null;
    hapticSymbiosis.stopBreathingGuide();
    this.notifyListeners();

    window.dispatchEvent(new CustomEvent('guardian-intervention-end'));
    
    console.log('[GuardianAngel] Intervention ended');
  }

  // Suppress low-priority notifications
  private suppressNotifications(): void {
    window.dispatchEvent(new CustomEvent('guardian-suppress-notifications', {
      detail: { duration: 30 * 60 * 1000 } // 30 minutes
    }));
    console.log('[GuardianAngel] Low-priority notifications suppressed');
  }

  // Simulated typing speed (would connect to real behavioral tracking)
  private getSimulatedTypingSpeed(): number {
    const hour = new Date().getHours();
    // Simulate natural energy curve
    const energyCurve = hour >= 9 && hour <= 11 ? 1.1 : 
                        hour >= 14 && hour <= 15 ? 0.7 : 
                        hour >= 21 ? 0.6 : 1.0;
    return Math.floor(this.baselineTypingSpeed * energyCurve * (0.9 + Math.random() * 0.2));
  }

  // Set baseline typing speed
  setBaselineTypingSpeed(wpm: number): void {
    this.baselineTypingSpeed = wpm;
  }

  // Get current state
  getState(): GuardianState {
    return { ...this.state };
  }

  // Manual trigger for testing
  simulateCriticalStress(): void {
    this.runPredictiveAnalysis(
      { typingSpeedWpm: 30, contextSwitches: 30 },
      { stressLevel: 0.95, heartRate: 110, sleepQuality: 40, energyLevel: 20 }
    );
  }
}

// Singleton instance
export const guardianAngel = new ZoeGuardianAngelService();

// React hook
export const useGuardianAngel = () => {
  return {
    startMonitoring: () => guardianAngel.startMonitoring(),
    stopMonitoring: () => guardianAngel.stopMonitoring(),
    runAnalysis: (behavioral?: Partial<BehavioralMetrics>, bio?: Partial<BioMetrics>) => 
      guardianAngel.runPredictiveAnalysis(behavioral, bio),
    endIntervention: () => guardianAngel.endIntervention(),
    getState: () => guardianAngel.getState(),
    subscribe: (listener: (state: GuardianState) => void) => guardianAngel.subscribe(listener),
    simulateCriticalStress: () => guardianAngel.simulateCriticalStress(),
  };
};

export default guardianAngel;
