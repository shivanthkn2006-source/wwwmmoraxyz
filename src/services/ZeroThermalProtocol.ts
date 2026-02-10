// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL ZERO-THERMAL - Permanent Thermal Management Architecture
// THE 3 LAWS OF MOBILE: 30 FPS Cap, Particle Ban, Idle Sleep
// Prevents battery drain and UI freezing on ALL mobile devices permanently
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback, useState } from 'react';

// ═══ THERMAL PROTOCOL TYPES ═══
export interface ThermalProtocolState {
  isLowPowerMode: boolean;
  is30FPSCapped: boolean;
  particlesBanned: boolean;
  isIdleSleeping: boolean;
  lastInteractionTime: number;
  thermalLevel: 'cool' | 'warm' | 'hot' | 'critical';
  activeAnimationCount: number;
}

export interface AnimationRegistration {
  id: string;
  type: '3d' | 'particle' | 'canvas' | 'raf';
  pause: () => void;
  resume: () => void;
  isActive: boolean;
}

// ═══ CONSTANTS - THE 3 LAWS ═══
const IDLE_SLEEP_TIMEOUT_MS = 5000; // 5 seconds of no interaction
const MOBILE_FPS_CAP = 30;
const DESKTOP_FPS_CAP = 60;
const FRAME_SKIP_INTERVAL = 2; // Skip every 2nd frame on mobile

// ═══ GLOBAL STATE ═══
class ZeroThermalProtocolService {
  private static instance: ZeroThermalProtocolService;
  private state: ThermalProtocolState;
  private registeredAnimations: Map<string, AnimationRegistration> = new Map();
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private frameCount = 0;
  private listeners: Set<(state: ThermalProtocolState) => void> = new Set();

  private constructor() {
    this.state = {
      isLowPowerMode: this.detectLowPowerDevice(),
      is30FPSCapped: this.detectLowPowerDevice(),
      particlesBanned: this.detectLowPowerDevice(),
      isIdleSleeping: false,
      lastInteractionTime: Date.now(),
      thermalLevel: 'cool',
      activeAnimationCount: 0,
    };

    this.initializeProtocol();
    console.log('[ZeroThermal] ⚡ Protocol Initialized:', this.state);
  }

  static getInstance(): ZeroThermalProtocolService {
    if (!ZeroThermalProtocolService.instance) {
      ZeroThermalProtocolService.instance = new ZeroThermalProtocolService();
    }
    return ZeroThermalProtocolService.instance;
  }

  // ═══ LAW #1: THE 30 FPS CAP ═══
  // IF deviceTier === 'low', ALL requestAnimationFrame loops must skip every second frame
  shouldSkipFrame(): boolean {
    if (!this.state.is30FPSCapped) return false;
    this.frameCount++;
    return this.frameCount % FRAME_SKIP_INTERVAL !== 0;
  }

  getMaxFPS(): number {
    return this.state.is30FPSCapped ? MOBILE_FPS_CAP : DESKTOP_FPS_CAP;
  }

  getFrameInterval(): number {
    return 1000 / this.getMaxFPS();
  }

  // ═══ LAW #2: THE PARTICLE BAN ═══
  // Mobile devices get CSS Gradients, NEVER JS Particles
  areParticlesBanned(): boolean {
    return this.state.particlesBanned;
  }

  getAlternativeBackground(): string {
    // Return CSS gradient fallback for banned particles
    return `
      radial-gradient(ellipse at 30% 20%, hsl(var(--omega-cyan) / 0.03) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 80%, hsl(var(--omega-magenta) / 0.02) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 50%, hsl(var(--omega-violet) / 0.015) 0%, transparent 60%)
    `;
  }

  // ═══ LAW #3: THE IDLE SLEEP ═══
  // IF user interaction stops for 5 seconds, PAUSE all 3D renders
  recordInteraction(): void {
    this.state.lastInteractionTime = Date.now();
    
    // Wake up if sleeping
    if (this.state.isIdleSleeping) {
      this.wakeFromIdleSleep();
    }
    
    // Reset idle timer
    this.resetIdleTimer();
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      this.enterIdleSleep();
    }, IDLE_SLEEP_TIMEOUT_MS);
  }

  private enterIdleSleep(): void {
    if (this.state.isIdleSleeping) return;

    console.log('[ZeroThermal] 😴 Entering Idle Sleep - Pausing all animations');
    this.state.isIdleSleeping = true;

    // Pause all registered animations
    this.registeredAnimations.forEach((animation) => {
      if (animation.isActive) {
        animation.pause();
        animation.isActive = false;
      }
    });

    this.notifyListeners();
  }

  private wakeFromIdleSleep(): void {
    console.log('[ZeroThermal] ☀️ Waking from Idle Sleep - Resuming animations');
    this.state.isIdleSleeping = false;

    // Resume all registered animations
    this.registeredAnimations.forEach((animation) => {
      if (!animation.isActive) {
        animation.resume();
        animation.isActive = true;
      }
    });

    this.notifyListeners();
  }

  // ═══ ANIMATION REGISTRATION ═══
  registerAnimation(registration: AnimationRegistration): () => void {
    this.registeredAnimations.set(registration.id, registration);
    this.state.activeAnimationCount = this.registeredAnimations.size;

    // If already sleeping, pause immediately
    if (this.state.isIdleSleeping) {
      registration.pause();
      registration.isActive = false;
    }

    console.log(`[ZeroThermal] Registered animation: ${registration.id} (${registration.type})`);

    // Return unregister function
    return () => {
      this.registeredAnimations.delete(registration.id);
      this.state.activeAnimationCount = this.registeredAnimations.size;
      console.log(`[ZeroThermal] Unregistered animation: ${registration.id}`);
    };
  }

  // ═══ THERMAL MONITORING ═══
  reportThermalLevel(level: 'cool' | 'warm' | 'hot' | 'critical'): void {
    this.state.thermalLevel = level;
    
    // Auto-upgrade restrictions if thermal is critical
    if (level === 'critical' || level === 'hot') {
      this.state.is30FPSCapped = true;
      this.state.particlesBanned = true;
      console.log(`[ZeroThermal] 🔥 THERMAL ${level.toUpperCase()} - Enforcing restrictions`);
    }
    
    this.notifyListeners();
  }

  // ═══ DEVICE DETECTION ═══
  private detectLowPowerDevice(): boolean {
    if (typeof window === 'undefined') return false;

    const ua = navigator.userAgent.toLowerCase();
    const coreCount = navigator.hardwareConcurrency || 4;
    const isMobile = /iphone|ipad|ipod|android/.test(ua);

    // iPhone 11 and older
    if (/iphone/.test(ua)) {
      const oldModels = ['iphone 11', 'iphone x', 'iphone 8', 'iphone 7', 'iphone 6', 'iphone se'];
      if (oldModels.some(model => ua.includes(model))) {
        return true;
      }
      // 6 or fewer cores indicates older device
      if (coreCount <= 6 && !ua.includes('pro')) {
        return true;
      }
    }

    // Android low-memory devices
    if (/android/.test(ua)) {
      const deviceMemory = (navigator as any).deviceMemory;
      if (deviceMemory && deviceMemory <= 4) {
        return true;
      }
    }

    // Samsung M-series, J-series (budget phones)
    if (ua.includes('sm-m') || ua.includes('sm-j') || ua.includes('sm-a0')) {
      return true;
    }

    // General mobile with low cores
    if (isMobile && coreCount <= 4) {
      return true;
    }

    return false;
  }

  // ═══ INITIALIZATION ═══
  private initializeProtocol(): void {
    if (typeof window === 'undefined') return;

    // Start idle timer
    this.resetIdleTimer();

    // Listen for user interactions
    const interactionEvents = ['mousedown', 'mousemove', 'touchstart', 'touchmove', 'keydown', 'scroll', 'wheel'];
    interactionEvents.forEach(event => {
      window.addEventListener(event, () => this.recordInteraction(), { passive: true });
    });

    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.enterIdleSleep();
      } else {
        this.recordInteraction();
      }
    });

    console.log('[ZeroThermal] 🛡️ THE 3 LAWS ACTIVE:');
    console.log(`  LAW 1: 30 FPS Cap = ${this.state.is30FPSCapped}`);
    console.log(`  LAW 2: Particle Ban = ${this.state.particlesBanned}`);
    console.log(`  LAW 3: Idle Sleep = ${IDLE_SLEEP_TIMEOUT_MS}ms timeout`);
  }

  // ═══ STATE ACCESS ═══
  getState(): ThermalProtocolState {
    return { ...this.state };
  }

  subscribe(listener: (state: ThermalProtocolState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // ═══ FORCE OVERRIDE (for debugging) ═══
  forceMode(mode: 'lite' | 'standard' | 'performance'): void {
    switch (mode) {
      case 'lite':
        this.state.is30FPSCapped = true;
        this.state.particlesBanned = true;
        break;
      case 'standard':
        this.state.is30FPSCapped = false;
        this.state.particlesBanned = false;
        break;
      case 'performance':
        this.state.is30FPSCapped = false;
        this.state.particlesBanned = false;
        break;
    }
    console.log(`[ZeroThermal] Mode forced to: ${mode}`);
    this.notifyListeners();
  }
}

// ═══ SINGLETON EXPORT ═══
export const zeroThermalProtocol = ZeroThermalProtocolService.getInstance();

// ═══ REACT HOOK ═══
export const useZeroThermalProtocol = () => {
  const [state, setState] = useState<ThermalProtocolState>(zeroThermalProtocol.getState());

  useEffect(() => {
    const unsubscribe = zeroThermalProtocol.subscribe(setState);
    return unsubscribe;
  }, []);

  const registerAnimation = useCallback((
    id: string,
    type: AnimationRegistration['type'],
    pause: () => void,
    resume: () => void
  ) => {
    return zeroThermalProtocol.registerAnimation({
      id,
      type,
      pause,
      resume,
      isActive: true,
    });
  }, []);

  return {
    ...state,
    shouldSkipFrame: () => zeroThermalProtocol.shouldSkipFrame(),
    getMaxFPS: () => zeroThermalProtocol.getMaxFPS(),
    getFrameInterval: () => zeroThermalProtocol.getFrameInterval(),
    areParticlesBanned: () => zeroThermalProtocol.areParticlesBanned(),
    getAlternativeBackground: () => zeroThermalProtocol.getAlternativeBackground(),
    registerAnimation,
    recordInteraction: () => zeroThermalProtocol.recordInteraction(),
    reportThermalLevel: (level: ThermalProtocolState['thermalLevel']) => 
      zeroThermalProtocol.reportThermalLevel(level),
    forceMode: (mode: 'lite' | 'standard' | 'performance') => 
      zeroThermalProtocol.forceMode(mode),
  };
};

// ═══ UTILITY: Throttled RAF Hook ═══
export const useThrottledRAF = (
  callback: (deltaTime: number) => void,
  animationId: string,
  enabled: boolean = true
) => {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const isPausedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const frameInterval = zeroThermalProtocol.getFrameInterval();
    
    const animate = (currentTime: number) => {
      if (isPausedRef.current) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      // Enforce 30 FPS cap on low-power devices
      if (zeroThermalProtocol.shouldSkipFrame()) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const deltaTime = currentTime - lastTimeRef.current;
      
      if (deltaTime >= frameInterval) {
        lastTimeRef.current = currentTime;
        callback(deltaTime);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    // Register with Zero Thermal Protocol
    const unregister = zeroThermalProtocol.registerAnimation({
      id: animationId,
      type: 'raf',
      pause: () => { isPausedRef.current = true; },
      resume: () => { isPausedRef.current = false; },
      isActive: true,
    });

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      unregister();
    };
  }, [callback, animationId, enabled]);
};

export default zeroThermalProtocol;
