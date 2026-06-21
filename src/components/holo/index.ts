// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT EXODUS 2120 - HOLO-FLUID COMPONENT SYSTEM
// "The interface must feel alive. Everything floats, breathes, and reacts."
// ═══════════════════════════════════════════════════════════════════════════════

export { ZoeFloatingOrb } from './ZoeFloatingOrb';
export type { ZoeState } from './ZoeFloatingOrb';

export { AdaptiveScreenGlow, useScreenGlow } from './AdaptiveScreenGlow';
export type { GlowState } from './AdaptiveScreenGlow';

export { NeuralHUD } from './NeuralHUD';
export type { HUDItem } from './NeuralHUD';

export { HomeButton } from './HomeButton';

// Lite Mode Components - CSS-only for low-end devices
export { CSSOnlyOrb } from './CSSOnlyOrb';
export { AdaptiveHoloProvider } from './AdaptiveHoloProvider';

// Re-export for convenience
export { HoloFluidProvider, useHoloFluid } from './HoloFluidProvider';
