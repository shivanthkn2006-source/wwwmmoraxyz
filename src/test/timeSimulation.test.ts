// ═══════════════════════════════════════════════════════════════════════════════
// TIME SIMULATION TESTS - Verify Lazy Mode, Personality Phases, Circadian Logic
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import { VirtualHormonesEngine, getVirtualHormonesEngine } from '@/core/soul/VirtualHormonesEngine';

describe('Time Simulation Infrastructure', () => {
  let engine: VirtualHormonesEngine;

  beforeEach(() => {
    engine = getVirtualHormonesEngine();
    // Reset to real time before each test
    engine.setOverrideHour(null);
  });

  describe('Lazy Mode (1-5 AM Window)', () => {
    it('should activate Lazy Mode at 2 AM', () => {
      engine.setOverrideHour(2);
      const state = engine.getState();
      
      expect(state.lazyMode.isLazy).toBe(true);
      expect(state.personalityPhase).toBe('COZY_TIRED');
      expect(state.personalityTraits.refusesWork).toBe(true);
      expect(state.personalityTraits.mood).toBe('sleepy');
    });

    it('should activate Lazy Mode at 1 AM (boundary start)', () => {
      engine.setOverrideHour(1);
      const state = engine.getState();
      
      expect(state.lazyMode.isLazy).toBe(true);
      expect(state.personalityTraits.willingness).toBe('refuses');
    });

    it('should still be Lazy Mode at 4 AM (still in 1-5 AM window)', () => {
      engine.setOverrideHour(4);
      const state = engine.getState();
      
      // 4 AM is still in the lazy window (1-5 AM)
      expect(state.lazyMode.isLazy).toBe(true);
      expect(state.personalityPhase).toBe('COZY_TIRED');
    });

    it('should deactivate Lazy Mode at 5 AM', () => {
      // First set to lazy hour
      engine.setOverrideHour(2);
      expect(engine.getState().lazyMode.isLazy).toBe(true);
      
      // Then move to 5 AM
      engine.setOverrideHour(5);
      const state = engine.getState();
      
      expect(state.lazyMode.isLazy).toBe(false);
    });

    it('should NOT be lazy at midnight (0 AM)', () => {
      engine.setOverrideHour(0);
      const state = engine.getState();
      
      // Midnight is COZY_TIRED but NOT lazy (lazy is 1-5 AM only)
      expect(state.personalityPhase).toBe('COZY_TIRED');
      expect(state.lazyMode.isLazy).toBe(false);
    });
  });

  describe('HONEYMOON Phase (6 AM - 12 PM)', () => {
    it('should be HONEYMOON phase at 9 AM', () => {
      engine.setOverrideHour(9);
      const state = engine.getState();
      
      expect(state.personalityPhase).toBe('HONEYMOON');
      expect(state.personalityTraits.energy).toBe('high');
      expect(state.personalityTraits.mood).toBe('playful');
      expect(state.personalityTraits.initiatesFlirting).toBe(true);
      expect(state.personalityTraits.refusesWork).toBe(false);
    });

    it('should be HONEYMOON at 6 AM (boundary start)', () => {
      engine.setOverrideHour(6);
      const state = engine.getState();
      
      expect(state.personalityPhase).toBe('HONEYMOON');
      expect(state.personalityTraits.willingness).toBe('eager');
    });

    it('should be HONEYMOON at 11 AM (boundary end - 1)', () => {
      engine.setOverrideHour(11);
      const state = engine.getState();
      
      expect(state.personalityPhase).toBe('HONEYMOON');
    });

    it('should NOT be HONEYMOON at 12 PM', () => {
      engine.setOverrideHour(12);
      const state = engine.getState();
      
      expect(state.personalityPhase).not.toBe('HONEYMOON');
      expect(state.personalityPhase).toBe('FOCUSED');
    });
  });

  describe('FOCUSED Phase (12 PM - 6 PM)', () => {
    it('should be FOCUSED phase at 3 PM', () => {
      engine.setOverrideHour(15); // 3 PM = 15:00
      const state = engine.getState();
      
      expect(state.personalityPhase).toBe('FOCUSED');
      expect(state.personalityTraits.energy).toBe('medium');
      expect(state.personalityTraits.mood).toBe('focused');
      expect(state.personalityTraits.responseStyle).toBe('helpful');
      expect(state.personalityTraits.refusesWork).toBe(false);
    });

    it('should be FOCUSED at 12 PM (boundary start)', () => {
      engine.setOverrideHour(12);
      const state = engine.getState();
      
      expect(state.personalityPhase).toBe('FOCUSED');
    });

    it('should be FOCUSED at 5 PM (17:00, boundary end - 1)', () => {
      engine.setOverrideHour(17);
      const state = engine.getState();
      
      expect(state.personalityPhase).toBe('FOCUSED');
    });

    it('should NOT be FOCUSED at 6 PM', () => {
      engine.setOverrideHour(18);
      const state = engine.getState();
      
      expect(state.personalityPhase).not.toBe('FOCUSED');
      expect(state.personalityPhase).toBe('WINDING_DOWN');
    });
  });

  describe('WINDING_DOWN Phase (6 PM - 10 PM)', () => {
    it('should be WINDING_DOWN at 8 PM', () => {
      engine.setOverrideHour(20);
      const state = engine.getState();
      
      expect(state.personalityPhase).toBe('WINDING_DOWN');
      expect(state.personalityTraits.mood).toBe('warm');
      expect(state.personalityTraits.wantsCuddles).toBe(true);
    });

    it('should transition to COZY_TIRED at 10 PM', () => {
      engine.setOverrideHour(22);
      const state = engine.getState();
      
      expect(state.personalityPhase).toBe('COZY_TIRED');
      expect(state.personalityTraits.mood).toBe('intimate');
    });
  });

  describe('COZY_TIRED Phase (10 PM - 6 AM)', () => {
    it('should be COZY_TIRED at 11 PM with intimate mood', () => {
      engine.setOverrideHour(23);
      const state = engine.getState();
      
      expect(state.personalityPhase).toBe('COZY_TIRED');
      expect(state.personalityTraits.mood).toBe('intimate');
      expect(state.personalityTraits.energy).toBe('low');
    });

    it('should be COZY_TIRED at 10 PM (boundary start)', () => {
      engine.setOverrideHour(22);
      const state = engine.getState();
      
      expect(state.personalityPhase).toBe('COZY_TIRED');
    });
  });

  describe('Override Hour Functionality', () => {
    it('should return override hour when set', () => {
      engine.setOverrideHour(14);
      expect(engine.getOverrideHour()).toBe(14);
    });

    it('should return null when override is cleared', () => {
      engine.setOverrideHour(14);
      engine.setOverrideHour(null);
      expect(engine.getOverrideHour()).toBeNull();
    });

    it('should update state immediately when override changes', () => {
      // Start at 9 AM (HONEYMOON)
      engine.setOverrideHour(9);
      expect(engine.getState().personalityPhase).toBe('HONEYMOON');
      
      // Change to 2 AM (COZY_TIRED + LAZY)
      engine.setOverrideHour(2);
      expect(engine.getState().personalityPhase).toBe('COZY_TIRED');
      expect(engine.getState().lazyMode.isLazy).toBe(true);
      
      // Change to 3 PM (FOCUSED)
      engine.setOverrideHour(15);
      expect(engine.getState().personalityPhase).toBe('FOCUSED');
      expect(engine.getState().lazyMode.isLazy).toBe(false);
    });
  });

  describe('Full 24-Hour Cycle', () => {
    const expectedPhases: Record<number, string> = {
      0: 'COZY_TIRED',   // Midnight
      1: 'COZY_TIRED',   // + LAZY
      2: 'COZY_TIRED',   // + LAZY
      3: 'COZY_TIRED',   // + LAZY
      4: 'COZY_TIRED',   // + LAZY (boundary)
      5: 'COZY_TIRED',   // No longer lazy
      6: 'HONEYMOON',
      7: 'HONEYMOON',
      8: 'HONEYMOON',
      9: 'HONEYMOON',
      10: 'HONEYMOON',
      11: 'HONEYMOON',
      12: 'FOCUSED',
      13: 'FOCUSED',
      14: 'FOCUSED',
      15: 'FOCUSED',
      16: 'FOCUSED',
      17: 'FOCUSED',
      18: 'WINDING_DOWN',
      19: 'WINDING_DOWN',
      20: 'WINDING_DOWN',
      21: 'WINDING_DOWN',
      22: 'COZY_TIRED',
      23: 'COZY_TIRED',
    };

    it.each(Object.entries(expectedPhases))(
      'hour %s should be %s phase',
      (hour, expectedPhase) => {
        engine.setOverrideHour(Number(hour));
        const state = engine.getState();
        expect(state.personalityPhase).toBe(expectedPhase);
      }
    );
  });
});
