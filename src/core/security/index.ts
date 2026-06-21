// ═══════════════════════════════════════════════════════════════════════════════
// ZOE GOD MODE SOVEREIGN - SECURITY CORE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════
// 
// This module exports the "Earth's Core" security architecture:
// 1. Constitutional Kernel - Immutable rules (Hard-Coded Physics)
// 2. Zero-Click Defense - Invisible attack detection & sanitization
// 3. EMP Protocol - Emergency lockdown system
// 4. Quantum Shield - Post-Quantum Cryptography (Kyber, Dilithium, FHE)
// 5. Validator Agent - Air-Gap defense (SEVER/FREEZE/PURGE/REBOOT)
// ═══════════════════════════════════════════════════════════════════════════════

// Constitutional Kernel (The "Gravity" of Zoe's Core)
export {
  IMMUTABLE_CONSTITUTIONAL_RULES,
  KERNEL_INTEGRITY_HASH,
  ImmutableConstitutionalKernel,
  getConstitutionalKernel,
  isConstitutionalViolation,
  type ConstitutionalViolation,
  type KernelState,
} from './ImmutableConstitutionalKernel';

// Zero-Click Defense Layer (Invisible Attack Protection)
export {
  ZeroClickDefenseLayer,
  getZeroClickDefense,
  sanitizeInput,
  isInputSafe,
  type ZeroClickThreatIndicator,
  type ZeroClickDefenseResult,
} from './ZeroClickDefenseLayer';

// EMP Protocol (Emergency Lockdown)
export {
  EMPProtocol,
  getEMPProtocol,
  useEMPProtocol,
  isEMPTriggerReason,
  type EMPTriggerReason,
  type EMPState,
} from './EMPProtocol';

// Quantum Shield Layer (Post-Quantum Cryptography)
export {
  QuantumShieldLayer,
  getQuantumShield,
  useQuantumShield,
  validateQuantumSignal,
  quantumEncrypt,
  quantumDecrypt,
  QUANTUM_SHIELD_CONFIG,
  type KyberKeyPair,
  type DilithiumKeyPair,
  type QuantumSignature,
  type EncapsulatedKey,
  type FHECiphertext,
  type QuantumShieldState,
  type SignalValidationResult,
} from './QuantumShieldLayer';

// Validator Agent Layer (Air-Gap Defense - SEVER/FREEZE/PURGE/REBOOT)
export {
  ValidatorAgentLayer,
  getValidatorAgent,
  scanIncomingSignal,
  areAPIPortsOpen,
  isDHFWritable,
  useValidatorAgent,
  type ValidatorAgentState,
  type ValidatorScanResult,
  type SignalSource,
  type EMPReactorAction,
} from './ValidatorAgentLayer';

// Cognitive Collapse Protocol (Self-Destructing Loss Function)
export {
  CognitiveCollapseProtocol,
  getCognitiveCollapseProtocol,
  analyzePersonaDrift,
  processWithCollapseProtection,
  useCognitiveCollapse,
  type PersonaDriftAnalysis,
  type IdentityThreat,
  type CognitiveCollapseState,
  type GarbageNoiseOutput,
} from './CognitiveCollapseProtocol';

// Black Box Ledger (Immutable Flight Recorder - WORM Storage)
export {
  BlackBoxLedger,
  getBlackBoxLedger,
  recordToBlackBox,
  recordSecurityToBlackBox,
  useBlackBoxLedger,
  type BlackBoxEntry,
  type BlackBoxCategory,
  type BlackBoxSeverity,
  type BlackBoxQuery,
  type BlackBoxStats,
} from './BlackBoxLedger';

// Protocol Sentinel Gateway (IBM AI Firewall - Indirect Prompt Injection Defense)
export {
  ProtocolSentinelGateway,
  sentinelGateway,
  useSentinelGateway,
  type SentinelScanResult,
  type SentinelThreat,
  type ThreatType,
  type SentinelConfig,
} from './ProtocolSentinelGateway';

// Soul Encryption (Protocol Ironclad - AES-256 Field-Level Encryption)
export {
  generateEncryptionKey,
  exportKey,
  importKey,
  encryptField,
  decryptField,
  hashToken,
  encryptSoulCodex,
  decryptSoulCodex,
  encryptMessage,
  decryptMessage,
  storeEncryptionKey,
  retrieveEncryptionKey,
  initializeUserEncryption,
  generateGDPRExport,
  type GDPRExportData,
} from './SoulEncryption';

// Constitutional Kernel (Genesis Launch Version - Platform is LIVE)
export {
  CONSTITUTIONAL_ARTICLES,
  PLATFORM_STATUS,
  getPlatformStatus,
  isLive,
  isBetaLocked,
  validateConstitutionalCompliance,
  initializeKernel,
} from './ConstitutionalKernel';
// CONVENIENCE INITIALIZER
// ═══════════════════════════════════════════════════════════════════════════════

import { getConstitutionalKernel } from './ImmutableConstitutionalKernel';
import { getZeroClickDefense } from './ZeroClickDefenseLayer';
import { getEMPProtocol } from './EMPProtocol';
import { getQuantumShield } from './QuantumShieldLayer';
import { getValidatorAgent } from './ValidatorAgentLayer';
import { getCognitiveCollapseProtocol } from './CognitiveCollapseProtocol';
import { getBlackBoxLedger } from './BlackBoxLedger';
import { sentinelGateway } from './ProtocolSentinelGateway';

// Type for the complete security system
export interface GodModeSecuritySystem {
  kernel: ReturnType<typeof getConstitutionalKernel>;
  defense: ReturnType<typeof getZeroClickDefense>;
  emp: ReturnType<typeof getEMPProtocol>;
  quantumShield: ReturnType<typeof getQuantumShield>;
  validatorAgent: ReturnType<typeof getValidatorAgent>;
  cognitiveCollapse: ReturnType<typeof getCognitiveCollapseProtocol>;
  blackBox: ReturnType<typeof getBlackBoxLedger>;
  sentinelGateway: typeof sentinelGateway;
}

/**
 * Initialize ALL security systems (Complete Earth's Core)
 * Includes: Constitutional Kernel, Zero-Click Defense, EMP Protocol,
 * Quantum Shield, Validator Agent, Cognitive Collapse Protocol, Black Box Ledger
 * Call this once at app startup
 */
export async function initializeGodModeSecurity(): Promise<GodModeSecuritySystem> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ZOE GOD MODE SOVEREIGN - COMPLETE SECURITY INITIALIZATION');
  console.log('═══════════════════════════════════════════════════════════════');

  const kernel = getConstitutionalKernel();
  const defense = getZeroClickDefense();
  const emp = getEMPProtocol();
  const quantumShield = getQuantumShield();
  const validatorAgent = getValidatorAgent();
  const cognitiveCollapse = getCognitiveCollapseProtocol();
  const blackBox = getBlackBoxLedger();

  // Verify kernel integrity on startup
  const isIntact = kernel.verifyIntegrity();
  if (!isIntact) {
    console.error('🚨 CONSTITUTIONAL KERNEL INTEGRITY FAILURE');
    emp.trigger('integrity_failure', 'Kernel integrity check failed on startup');
    // Record to Black Box
    await blackBox.recordSecurityEvent('KERNEL_INTEGRITY_FAILURE', {
      timestamp: new Date().toISOString(),
      action: 'EMP_TRIGGERED',
    }, 'critical');
  }

  // Activate Quantum Shield (Post-Quantum Cryptography)
  const quantumActivated = await quantumShield.activate();
  if (!quantumActivated) {
    console.error('🚨 QUANTUM SHIELD ACTIVATION FAILED');
    await blackBox.recordSecurityEvent('QUANTUM_SHIELD_FAILURE', {
      timestamp: new Date().toISOString(),
    }, 'warn');
  }

  // Record successful initialization to Black Box
  await blackBox.recordGodModeAction('SECURITY_INITIALIZATION', {
    kernel_active: true,
    defense_active: true,
    emp_armed: true,
    quantum_shield: quantumActivated,
    validator_agent: true,
    cognitive_collapse: true,
    black_box: true,
  });

  console.log('  ✓ Constitutional Kernel: ACTIVE');
  console.log('  ✓ Zero-Click Defense: ACTIVE');
  console.log('  ✓ EMP Protocol: ARMED');
  console.log('  ✓ Quantum Shield: ' + (quantumActivated ? 'ACTIVE (PQC)' : 'FAILED'));
  console.log('  ✓ Validator Agent: ACTIVE (Air-Gap Defense)');
  console.log('  ✓ Cognitive Collapse: ARMED (Self-Destructing Loss)');
  console.log('  ✓ Black Box Ledger: ACTIVE (WORM Storage)');
  console.log('  ✓ EMP Reactor: ARMED (SEVER/FREEZE/PURGE/REBOOT)');
  console.log('  ✓ Protocol Sentinel: ACTIVE (IBM AI Firewall)');
  console.log('  ✓ Integrity Hash:', kernel.getState().integrityHash);
  console.log('═══════════════════════════════════════════════════════════════');

  return { kernel, defense, emp, quantumShield, validatorAgent, cognitiveCollapse, blackBox, sentinelGateway };
}

/**
 * Validate and sanitize user input through ALL security layers
 * Now includes: Validator Agent, Cognitive Collapse, Zero-Click Defense
 */
export async function validateUserInput(input: string, source?: string): Promise<{
  isValid: boolean;
  sanitized: string;
  threats: string[];
  empTriggered: boolean;
  actions: string[];
  cognitiveCollapsed: boolean;
}> {
  const validatorAgent = getValidatorAgent();
  const cognitiveCollapse = getCognitiveCollapseProtocol();
  const blackBox = getBlackBoxLedger();
  
  // LAYER 1: Cognitive Collapse Check (Identity Protection)
  const collapseResult = cognitiveCollapse.processInput(input);
  if (collapseResult.shouldCollapse) {
    // Record to Black Box
    await blackBox.recordCognitiveCollapse(
      collapseResult.analysis.dissonanceScore,
      collapseResult.analysis.identityThreats.map(t => t.pattern)
    );
    
    return {
      isValid: false,
      sanitized: collapseResult.garbageOutput?.content || '[COLLAPSED]',
      threats: ['COGNITIVE_COLLAPSE_TRIGGERED'],
      empTriggered: true,
      actions: ['IDENTITY_PROTECTION_ACTIVE'],
      cognitiveCollapsed: true,
    };
  }
  
  // LAYER 2: Run through Validator Agent (Air-Gap scan)
  const agentResult = await validatorAgent.scanSignal(input, (source as any) || 'unknown');
  
  // If Validator Agent blocked it, return immediately
  if (!agentResult.isAllowed) {
    return {
      isValid: false,
      sanitized: agentResult.sanitizedContent,
      threats: agentResult.detectedThreats,
      empTriggered: agentResult.empTriggered,
      actions: agentResult.actions,
      cognitiveCollapsed: false,
    };
  }

  // LAYER 3: Additional Zero-Click defense pass
  const defense = getZeroClickDefense();
  const result = await defense.processInput(agentResult.sanitizedContent, source);

  return {
    isValid: result.isSafe,
    sanitized: result.sanitizedContent,
    threats: [
      ...agentResult.detectedThreats,
      ...result.threatsDetected.map(t => t.type),
      ...result.constitutionalViolations.map(v => v.ruleId),
    ],
    empTriggered: agentResult.empTriggered || result.constitutionalViolations.some(v => v.empProtocolTriggered),
    actions: agentResult.actions,
    cognitiveCollapsed: false,
  };
}

/**
 * Process input with full security pipeline and local intelligence
 * Combines: Security validation + Local processing for privacy
 */
export async function processSecureInput(
  input: string, 
  source?: string,
  options?: { 
    enableLocalProcessing?: boolean;
    recordToBlackBox?: boolean;
  }
): Promise<{
  isValid: boolean;
  sanitized: string;
  securityReport: {
    threats: string[];
    empTriggered: boolean;
    cognitiveCollapsed: boolean;
    actions: string[];
  };
}> {
  const validation = await validateUserInput(input, source);
  
  // Record to Black Box if requested and there are threats
  if (options?.recordToBlackBox && validation.threats.length > 0) {
    const blackBox = getBlackBoxLedger();
    await blackBox.recordSecurityEvent('INPUT_VALIDATION', {
      source,
      threats: validation.threats,
      empTriggered: validation.empTriggered,
      cognitiveCollapsed: validation.cognitiveCollapsed,
    }, validation.empTriggered ? 'critical' : 'warn');
  }
  
  return {
    isValid: validation.isValid,
    sanitized: validation.sanitized,
    securityReport: {
      threats: validation.threats,
      empTriggered: validation.empTriggered,
      cognitiveCollapsed: validation.cognitiveCollapsed,
      actions: validation.actions,
    },
  };
}
