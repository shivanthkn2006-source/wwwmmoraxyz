// Velvet Rope Protocol - Export all components
export { default as PlanetaryIntentSelector } from './PlanetaryIntentSelector';
export { default as ProfileCompletionGate } from './ProfileCompletionGate';
export { default as AdvancedLifeCodexButton } from './AdvancedLifeCodexButton';
export { default as VelvetRopeTestSuite } from './VelvetRopeTestSuite';

// Re-export context
export { VelvetRopeProvider, useVelvetRope, useVelvetRopeOptional } from '@/contexts/VelvetRopeContext';

// Re-export hook
export { useMinimumViableData } from '@/hooks/useMinimumViableData';
export type { MVDScore } from '@/hooks/useMinimumViableData';
export type { PlanetaryIntent } from '@/contexts/VelvetRopeContext';
