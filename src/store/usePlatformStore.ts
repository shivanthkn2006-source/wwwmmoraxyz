// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM STORE — centralized agent + voice command state
// Lives outside the React tree so the 28+ agent modules and the persistent
// voice layer never trigger prop-drilling re-renders across the shell.
// Select narrowly: usePlatformStore(s => s.activeAgent)
// ═══════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type AgentId = string;

export type VoiceLayerStatus = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface AgentDescriptor {
  id: AgentId;
  label: string;
  route?: string;
  /** Marks agents that mount WebGL/heavy compute — used for thermal budgeting. */
  heavy?: boolean;
}

export interface PlatformState {
  // ── Agent layer ──────────────────────────────────────────────────────────
  activeAgent: AgentId | null;
  agentHistory: AgentId[];
  degradedAgents: Record<AgentId, string>;

  // ── Voice layer ──────────────────────────────────────────────────────────
  voiceCommandActive: boolean;
  voiceStatus: VoiceLayerStatus;
  lastCommand: string | null;

  // ── Adaptive / thermal ───────────────────────────────────────────────────
  intimacyLevel: number;
  heavyModulesMounted: number;
  thermalSafeMode: boolean;

  // ── Actions ──────────────────────────────────────────────────────────────
  setActiveAgent: (agentId: AgentId | null) => void;
  markAgentDegraded: (agentId: AgentId, reason: string) => void;
  clearAgentDegraded: (agentId: AgentId) => void;
  toggleVoiceCommand: (status: boolean) => void;
  setVoiceStatus: (status: VoiceLayerStatus) => void;
  setLastCommand: (command: string | null) => void;
  setIntimacyLevel: (level: number) => void;
  acquireHeavyModule: () => void;
  releaseHeavyModule: () => void;
  setThermalSafeMode: (on: boolean) => void;
}

const HISTORY_LIMIT = 20;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const usePlatformStore = create<PlatformState>()(
  persist(
    (set) => ({
      activeAgent: null,
      agentHistory: [],
      degradedAgents: {},

      voiceCommandActive: false,
      voiceStatus: 'idle',
      lastCommand: null,

      intimacyLevel: 0,
      heavyModulesMounted: 0,
      thermalSafeMode: false,

      setActiveAgent: (agentId) =>
        set((s) => ({
          activeAgent: agentId,
          agentHistory: agentId
            ? [agentId, ...s.agentHistory.filter((a) => a !== agentId)].slice(0, HISTORY_LIMIT)
            : s.agentHistory,
        })),

      markAgentDegraded: (agentId, reason) =>
        set((s) => ({ degradedAgents: { ...s.degradedAgents, [agentId]: reason } })),

      clearAgentDegraded: (agentId) =>
        set((s) => {
          const next = { ...s.degradedAgents };
          delete next[agentId];
          return { degradedAgents: next };
        }),

      toggleVoiceCommand: (status) =>
        set({ voiceCommandActive: status, voiceStatus: status ? 'listening' : 'idle' }),

      setVoiceStatus: (voiceStatus) => set({ voiceStatus }),
      setLastCommand: (lastCommand) => set({ lastCommand }),
      setIntimacyLevel: (level) => set({ intimacyLevel: clamp(level, 0, 100) }),

      acquireHeavyModule: () => set((s) => ({ heavyModulesMounted: s.heavyModulesMounted + 1 })),
      releaseHeavyModule: () =>
        set((s) => ({ heavyModulesMounted: Math.max(0, s.heavyModulesMounted - 1) })),

      setThermalSafeMode: (thermalSafeMode) => set({ thermalSafeMode }),
    }),
    {
      name: 'mmora-platform-store',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Never persist transient runtime state — only durable user-level prefs.
      partialize: (s) => ({
        intimacyLevel: s.intimacyLevel,
        thermalSafeMode: s.thermalSafeMode,
        agentHistory: s.agentHistory,
      }),
    },
  ),
);

// Stable selectors (avoid re-renders from object identity churn)
export const selectActiveAgent = (s: PlatformState) => s.activeAgent;
export const selectVoiceActive = (s: PlatformState) => s.voiceCommandActive;
export const selectVoiceStatus = (s: PlatformState) => s.voiceStatus;
export const selectThermalSafeMode = (s: PlatformState) => s.thermalSafeMode;
