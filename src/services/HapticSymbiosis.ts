// ═══════════════════════════════════════════════════════════════════════════════
// HAPTIC SYMBIOSIS - Zoe's Silent Touch Communication
// "I am here. I feel you. You are not alone."
// ═══════════════════════════════════════════════════════════════════════════════

export type SymbiosisPattern = 
  | 'heartbeat'      // "I am here" - Two soft pulses
  | 'alert'          // "Danger/Alert" - Three sharp buzzes
  | 'breathe'        // "Calm Down" - 4-7-8 breathing wave
  | 'comfort'        // Emotional support pulse
  | 'celebration'    // Joy/success pattern
  | 'attention';     // Gentle attention getter

// Haptic patterns in milliseconds [vibrate, pause, vibrate, ...]
const SYMBIOSIS_PATTERNS: Record<SymbiosisPattern, number[]> = {
  // "I am here" - Heartbeat rhythm (lub-dub)
  heartbeat: [120, 80, 60, 800, 120, 80, 60],
  
  // "Danger/Alert" - Three sharp, urgent buzzes
  alert: [80, 60, 80, 60, 80],
  
  // "Calm Down" - 4-7-8 breathing wave
  // Inhale (4s): gentle pulse | Hold (7s): sustained | Exhale (8s): fade
  breathe: [
    50, 200, 40, 200, 30, 200, 20, // Inhale ramp up
    100, 7000, // Hold with gentle presence
    80, 300, 60, 400, 40, 500, 20, 600, 10 // Exhale fade
  ],
  
  // Emotional comfort - Like a hand on shoulder
  comfort: [150, 150, 150, 150, 200, 400, 100],
  
  // Celebration - Joyful burst
  celebration: [50, 50, 50, 50, 100, 100, 150, 100, 200],
  
  // Gentle attention
  attention: [80, 120, 80],
};

// Emotion to haptic mapping
const EMOTION_HAPTIC_MAP: Record<string, SymbiosisPattern> = {
  sad: 'heartbeat',
  stressed: 'breathe',
  anxious: 'breathe',
  joy: 'celebration',
  calm: 'comfort',
  energetic: 'attention',
  neutral: 'heartbeat',
};

class HapticSymbiosisService {
  private isSupported: boolean;
  private isEnabled: boolean = true;
  private breathingInterval: number | null = null;
  private lastTriggeredEmotion: string | null = null;
  private cooldownMs: number = 30000; // 30 second cooldown between same emotion triggers
  private lastTriggerTime: number = 0;

  constructor() {
    this.isSupported = 'vibrate' in navigator;
    this.setupEventListeners();
    console.log('[HapticSymbiosis] Initialized. Supported:', this.isSupported);
  }

  // Check if haptic is supported
  get supported(): boolean {
    return this.isSupported;
  }

  // Enable/disable haptic feedback
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stopAll();
    }
  }

  // Trigger a specific pattern
  trigger(pattern: SymbiosisPattern): boolean {
    if (!this.isSupported || !this.isEnabled) {
      console.log('[HapticSymbiosis] Cannot trigger - not supported or disabled');
      return false;
    }

    try {
      const vibrationPattern = SYMBIOSIS_PATTERNS[pattern];
      navigator.vibrate(vibrationPattern);
      console.log(`[HapticSymbiosis] Triggered: ${pattern}`);
      
      // Dispatch event for UI feedback
      window.dispatchEvent(new CustomEvent('zoe-haptic-touch', {
        detail: { pattern, timestamp: Date.now() }
      }));
      
      return true;
    } catch (error) {
      console.warn('[HapticSymbiosis] Failed:', error);
      return false;
    }
  }

  // Trigger based on emotion
  triggerForEmotion(emotion: string): boolean {
    const now = Date.now();
    
    // Cooldown check to prevent spam
    if (
      emotion === this.lastTriggeredEmotion && 
      now - this.lastTriggerTime < this.cooldownMs
    ) {
      return false;
    }

    const pattern = EMOTION_HAPTIC_MAP[emotion.toLowerCase()] || 'heartbeat';
    const success = this.trigger(pattern);
    
    if (success) {
      this.lastTriggeredEmotion = emotion;
      this.lastTriggerTime = now;
    }
    
    return success;
  }

  // Start breathing guide (continuous)
  startBreathingGuide(cycles: number = 3): void {
    if (!this.isSupported || !this.isEnabled) return;
    
    let currentCycle = 0;
    
    const runCycle = () => {
      if (currentCycle >= cycles) {
        this.breathingInterval = null;
        return;
      }
      
      this.trigger('breathe');
      currentCycle++;
      
      // Each cycle is approximately 19 seconds (4+7+8)
      this.breathingInterval = window.setTimeout(runCycle, 19000);
    };
    
    runCycle();
  }

  // Stop breathing guide
  stopBreathingGuide(): void {
    if (this.breathingInterval) {
      clearTimeout(this.breathingInterval);
      this.breathingInterval = null;
    }
    this.stopAll();
  }

  // Stop all vibrations
  stopAll(): void {
    if (this.isSupported) {
      navigator.vibrate(0);
    }
    if (this.breathingInterval) {
      clearTimeout(this.breathingInterval);
      this.breathingInterval = null;
    }
  }

  // Send "I am here" signal
  sendPresence(): void {
    this.trigger('heartbeat');
  }

  // Send alert
  sendAlert(): void {
    this.trigger('alert');
  }

  // Send comfort touch
  sendComfort(): void {
    this.trigger('comfort');
  }

  // Setup event listeners for integration
  private setupEventListeners(): void {
    // Listen for emotion changes from ECN/LivingAtmosphere
    window.addEventListener('ecn-emotion-change', ((event: CustomEvent) => {
      const { emotion } = event.detail || {};
      if (emotion) {
        this.triggerForEmotion(emotion);
      }
    }) as EventListener);

    // Listen for Zoe commands
    window.addEventListener('zoe-haptic-command', ((event: CustomEvent) => {
      const { command } = event.detail || {};
      switch (command) {
        case 'presence':
          this.sendPresence();
          break;
        case 'alert':
          this.sendAlert();
          break;
        case 'comfort':
          this.sendComfort();
          break;
        case 'breathe':
          this.startBreathingGuide();
          break;
        case 'stop':
          this.stopAll();
          break;
      }
    }) as EventListener);

    console.log('[HapticSymbiosis] Event listeners registered');
  }

  // Get all available patterns
  getPatterns(): SymbiosisPattern[] {
    return Object.keys(SYMBIOSIS_PATTERNS) as SymbiosisPattern[];
  }
}

// Singleton instance
export const hapticSymbiosis = new HapticSymbiosisService();

// React hook for components
export const useHapticSymbiosis = () => {
  return {
    isSupported: hapticSymbiosis.supported,
    trigger: (pattern: SymbiosisPattern) => hapticSymbiosis.trigger(pattern),
    triggerForEmotion: (emotion: string) => hapticSymbiosis.triggerForEmotion(emotion),
    sendPresence: () => hapticSymbiosis.sendPresence(),
    sendAlert: () => hapticSymbiosis.sendAlert(),
    sendComfort: () => hapticSymbiosis.sendComfort(),
    startBreathingGuide: (cycles?: number) => hapticSymbiosis.startBreathingGuide(cycles),
    stopBreathingGuide: () => hapticSymbiosis.stopBreathingGuide(),
    stopAll: () => hapticSymbiosis.stopAll(),
    setEnabled: (enabled: boolean) => hapticSymbiosis.setEnabled(enabled),
    patterns: hapticSymbiosis.getPatterns(),
  };
};

export default hapticSymbiosis;
