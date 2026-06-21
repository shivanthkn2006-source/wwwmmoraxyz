// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY COMPONENTS INDEX - Black Box Protocol
// Complete security layer for Zoe DHF Platform
// ═══════════════════════════════════════════════════════════════════════════════

// Core Configuration - centralized security settings
export * from './securityConfig';

// Developer Mode - Admin bypass controls
export { DevModeProvider, useDevMode } from './DevModeContext';
export { AdminToolbar } from './AdminToolbar';

// Layer 0: Quantum Gatekeeper - Invite-Only Access
export { QuantumGatekeeper } from './QuantumGatekeeper';
export { AccessDeniedScreen } from './AccessDeniedScreen';

// Layer 1: Frontend Hardening
export { VoidShellProtection } from './VoidShellProtection';
export { FortressWatermark } from './FortressWatermark';
export { ScreenBlackout } from './ScreenBlackout';
export { CameraSecuritySentinel } from './CameraSecuritySentinel';

// Layer 2: DevTools Defense
export { ScorchedEarthScreen } from './ScorchedEarthScreen';
export { DevToolsTrapActivator } from './DevToolsTrapActivator';

// Layer 3: Admin Access
export { SovereignCodeVault } from './SovereignCodeVault';

// Layer 4: Shadow Ban System
export { ShadowBanProvider } from './ShadowBanProvider';

// Layer 5: Shadow Sentinel AI Immune System
export { ShadowSentinelProvider, useSentinel } from './ShadowSentinelProvider';

// Layer 6: Protocol 0 - Zero Knowledge Defense
export { default as Protocol0Modal } from './Protocol0Modal';

// Combined Security Shell - wraps all layers
export { SecurityShell } from './SecurityShell';

// Layer 7: God Mode Sovereign (Earth's Core Security)
export { GodModeSovereignProvider, useGodModeSovereign } from './GodModeSovereignProvider';
export { EMPLockdownOverlay } from './EMPLockdownOverlay';

// Layer 8: Protocol Iceberg - Tier 6 Feature Hiding
export { IcebergGate } from './IcebergGate';
export { useIcebergProtocol } from '@/hooks/useIcebergProtocol';
export * from '@/core/security/ProtocolIceberg';

// Session Heartbeat Hook for online tracking
export { useSessionHeartbeat } from '@/hooks/useSessionHeartbeat';
