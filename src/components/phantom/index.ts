// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL PHANTOM - The Green Touch + Phantom Brain (SSM)
// Battery-saving visibility toggle for low-end devices
// WAVE 1: Orb & Particles | WAVE 2: Lazy Loading | WAVE 3: Auto-Ghost
// WAVE 4: State Space Model (SSM) - Zero-Cost Local AI Processing
// ═══════════════════════════════════════════════════════════════════════════════

// Store
export { default as usePhantomStore, usePhantomVisible, usePhantomToggle, usePhantomStats } from '@/stores/usePhantomStore';
export type { PhantomState } from '@/stores/usePhantomStore';

// Components
export { default as GreenTouchTrigger } from './GreenTouchTrigger';
export { default as AutoPhantomProvider } from './AutoPhantomProvider';
export { default as PhantomBrainIndicator } from './PhantomBrainIndicator';

// Guards
export { 
  default as PhantomGuard,
  Phantom3DGuard,
  PhantomAnimationGuard,
  PhantomUIGuard,
  PhantomVoiceGuard,
  usePhantomRender,
} from './PhantomGuard';

// Hooks
export { default as useAutoPhantom } from '@/hooks/useAutoPhantom';
export { default as usePhantomBrain } from '@/hooks/usePhantomBrain';

// SSM Core
export { 
  StateSpaceEngine,
  initializePhantomBrain,
  processLocalQuery,
  getPhantomBrainState,
  getSoulStateVector,
} from '@/core/ssm/StateSpaceEngine';
export type { 
  StateVector,
  SSMConfig,
  SSMObservation,
  PhantomBrainState,
} from '@/core/ssm/StateSpaceEngine';
