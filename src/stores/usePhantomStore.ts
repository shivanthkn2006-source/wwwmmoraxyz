// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL PHANTOM - The Green Touch
// Global Visibility Toggle for Low-End Device Survival (iPhone 11 / M05)
// "Touch Green One Touch" - Manual Visibility Control
// ═══════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PhantomState {
  // Core visibility state
  isVisible: boolean;
  
  // Ghost mode metadata
  ghostModeActivatedAt: number | null;
  manualOverride: boolean; // User explicitly toggled
  
  // Statistics
  totalGhostModeSessions: number;
  batteryPreservedMinutes: number; // Estimated
  
  // Actions
  toggle: () => void;
  hide: () => void;
  show: () => void;
  
  // Advanced
  setManualOverride: (override: boolean) => void;
  resetStats: () => void;
}

// Sound effects for ghost mode transitions
const playPhantomSound = (type: 'powerDown' | 'powerUp') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'powerDown') {
      // Descending tone for power down
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    } else {
      // Ascending tone for power up
      oscillator.frequency.setValueAtTime(300, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    }
    
    oscillator.type = 'sine';
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.35);
    
    // Cleanup
    setTimeout(() => ctx.close(), 500);
  } catch (err) {
    console.debug('[Phantom] Sound unavailable');
  }
};

export const usePhantomStore = create<PhantomState>()(
  persist(
    (set, get) => ({
      // Initial state - START HIDDEN, user must tap to show orb
      isVisible: false,
      ghostModeActivatedAt: Date.now(),
      manualOverride: false,
      totalGhostModeSessions: 0,
      batteryPreservedMinutes: 0,
      
      // Toggle visibility
      toggle: () => {
        const current = get().isVisible;
        const newValue = !current;
        
        if (newValue) {
          // Waking up
          playPhantomSound('powerUp');
          
          // Calculate time spent in ghost mode
          const activatedAt = get().ghostModeActivatedAt;
          if (activatedAt) {
            const minutesSaved = Math.floor((Date.now() - activatedAt) / 60000);
            set(state => ({
              isVisible: true,
              ghostModeActivatedAt: null,
              manualOverride: true,
              batteryPreservedMinutes: state.batteryPreservedMinutes + minutesSaved,
            }));
          } else {
            set({ isVisible: true, ghostModeActivatedAt: null, manualOverride: true });
          }
          
          console.log('[Phantom] 👻 → 🟢 WAKE UP - Components re-mounted');
        } else {
          // Going to sleep
          playPhantomSound('powerDown');
          set(state => ({
            isVisible: false,
            ghostModeActivatedAt: Date.now(),
            manualOverride: true,
            totalGhostModeSessions: state.totalGhostModeSessions + 1,
          }));
          
          console.log('[Phantom] 🟢 → 👻 GHOST MODE - Heavy components unmounted');
        }
        
        // Dispatch custom event for other systems to listen
        window.dispatchEvent(new CustomEvent('phantom-mode-change', { 
          detail: { isVisible: newValue } 
        }));
      },
      
      // Force hide (ghost mode)
      hide: () => {
        if (get().isVisible) {
          playPhantomSound('powerDown');
          set(state => ({
            isVisible: false,
            ghostModeActivatedAt: Date.now(),
            manualOverride: true,
            totalGhostModeSessions: state.totalGhostModeSessions + 1,
          }));
          
          console.log('[Phantom] 👻 GHOST MODE ACTIVATED');
          window.dispatchEvent(new CustomEvent('phantom-mode-change', { 
            detail: { isVisible: false } 
          }));
        }
      },
      
      // Force show (wake up)
      show: () => {
        if (!get().isVisible) {
          playPhantomSound('powerUp');
          
          const activatedAt = get().ghostModeActivatedAt;
          if (activatedAt) {
            const minutesSaved = Math.floor((Date.now() - activatedAt) / 60000);
            set(state => ({
              isVisible: true,
              ghostModeActivatedAt: null,
              manualOverride: true,
              batteryPreservedMinutes: state.batteryPreservedMinutes + minutesSaved,
            }));
          } else {
            set({ isVisible: true, ghostModeActivatedAt: null, manualOverride: true });
          }
          
          console.log('[Phantom] 🟢 VISIBLE MODE ACTIVATED');
          window.dispatchEvent(new CustomEvent('phantom-mode-change', { 
            detail: { isVisible: true } 
          }));
        }
      },
      
      // Advanced controls
      setManualOverride: (override) => set({ manualOverride: override }),
      
      resetStats: () => set({
        totalGhostModeSessions: 0,
        batteryPreservedMinutes: 0,
      }),
    }),
    {
      name: 'mmora-phantom-state',
      partialize: (state) => ({
        totalGhostModeSessions: state.totalGhostModeSessions,
        batteryPreservedMinutes: state.batteryPreservedMinutes,
      }),
    }
  )
);

// Selector hooks for performance
export const usePhantomVisible = () => usePhantomStore(state => state.isVisible);
export const usePhantomToggle = () => usePhantomStore(state => state.toggle);
export const usePhantomStats = () => usePhantomStore(state => ({
  sessions: state.totalGhostModeSessions,
  minutesSaved: state.batteryPreservedMinutes,
}));

export default usePhantomStore;
