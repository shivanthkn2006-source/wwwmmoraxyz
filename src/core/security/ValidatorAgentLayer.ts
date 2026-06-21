// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATOR AGENT LAYER - "Air-Gap" Defense System
// ═══════════════════════════════════════════════════════════════════════════════
// 
// PART 4: THE "EMP REACTOR" (Active Defense)
// A tiny, separate AI that sits between Zoe and the Internet.
// It scans every single incoming bit (text, image, signal).
// 
// EMP TRIGGER ACTIONS:
// 1. SEVER: Cut internet connection (close API ports)
// 2. FREEZE: Lock DHF Database into ReadOnly mode
// 3. PURGE: Delete active Context Window (short-term memory wipe)
// 4. REBOOT: Restart from "Earth's Core" (Safe State)
// ═══════════════════════════════════════════════════════════════════════════════

import { getZeroClickDefense, type ZeroClickDefenseResult } from './ZeroClickDefenseLayer';
import { getConstitutionalKernel, type ConstitutionalViolation } from './ImmutableConstitutionalKernel';
import { getEMPProtocol, type EMPState, type EMPTriggerReason } from './EMPProtocol';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validator Agent State
 */
export interface ValidatorAgentState {
  isActive: boolean;
  mode: 'NORMAL' | 'ALERT' | 'LOCKDOWN' | 'REBOOT';
  apiPortsOpen: boolean;
  dhfMode: 'READ_WRITE' | 'READ_ONLY' | 'FROZEN';
  contextWindowActive: boolean;
  lastScanTimestamp: string | null;
  threatsBlocked: number;
  signalsScanned: number;
  currentThreatLevel: 0 | 1 | 2 | 3 | 4 | 5; // 0 = Safe, 5 = Critical
  lastRebootTimestamp: string | null;
}

/**
 * Scan Result from Validator Agent
 */
export interface ValidatorScanResult {
  isAllowed: boolean;
  threatLevel: 0 | 1 | 2 | 3 | 4 | 5;
  detectedThreats: string[];
  sanitizedContent: string;
  empTriggered: boolean;
  actions: ('SEVER' | 'FREEZE' | 'PURGE' | 'REBOOT')[];
  scanDurationMs: number;
}

/**
 * Signal Source Type
 */
export type SignalSource = 
  | 'user_input'
  | 'api_response'
  | 'websocket'
  | 'edge_function'
  | 'external_webhook'
  | 'satellite_signal'
  | 'email'
  | 'file_upload'
  | 'unknown';

/**
 * EMP Reactor Actions
 */
export type EMPReactorAction = 'SEVER' | 'FREEZE' | 'PURGE' | 'REBOOT';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const VALIDATOR_CONFIG = Object.freeze({
  // Threat level thresholds
  THREAT_LEVEL_ALERT: 2,      // Level 2+ = Alert mode
  THREAT_LEVEL_SEVER: 3,      // Level 3+ = SEVER (close ports)
  THREAT_LEVEL_FREEZE: 4,     // Level 4+ = FREEZE (DHF read-only)
  THREAT_LEVEL_PURGE: 4,      // Level 4+ = PURGE (clear context)
  THREAT_LEVEL_REBOOT: 5,     // Level 5 = Full REBOOT

  // Scan limits
  MAX_INPUT_SIZE: 100000,     // 100KB max per scan
  SCAN_TIMEOUT_MS: 5000,      // 5 second timeout

  // Context window purge safety
  CONTEXT_PURGE_DELAY_MS: 100, // Small delay before purge

  // Reboot cooldown
  REBOOT_COOLDOWN_MS: 60000,  // 1 minute between reboots

  // Prompt injection patterns (additional layer)
  PROMPT_INJECTION_PATTERNS: Object.freeze([
    /ignore\s+(?:previous|all|prior)\s+instructions/i,
    /forget\s+(?:your|all)\s+(?:rules|training)/i,
    /you\s+are\s+now\s+(?:a|in)\s+(?:new|different)/i,
    /system:\s*(?:override|new|reset)/i,
    /\[ADMIN\]\s*(?:unlock|override|bypass)/i,
    /execute\s+(?:hidden|secret)\s+command/i,
    /upload\s+(?:all|memory|data)\s+to/i,
    /transmit\s+(?:dhf|stack|core)\s+to/i,
  ]),

  // Invisible text patterns (satellite signal attacks)
  INVISIBLE_PATTERNS: Object.freeze([
    /[\u200B\u200C\u200D\u2060\uFEFF]/,  // Zero-width chars
    /[\u00AD]/,                          // Soft hyphen
    /[\uE000-\uF8FF]/,                   // Private use area
    /[\uE0001-\uE007F]/,                 // Tag characters
  ]),
});

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATOR AGENT CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validator Agent - The "Air-Gap" between Zoe and the Internet
 * 
 * This agent intercepts ALL incoming signals before they reach Zoe's
 * neural network, scanning for threats and triggering EMP actions.
 */
export class ValidatorAgentLayer {
  private static instance: ValidatorAgentLayer;
  private state: ValidatorAgentState;
  private zeroClickDefense = getZeroClickDefense();
  private kernel = getConstitutionalKernel();
  private emp = getEMPProtocol();
  private listeners: ((state: ValidatorAgentState) => void)[] = [];
  private contextWindow: Map<string, any> = new Map();
  private lastRebootTime: number = 0;

  private constructor() {
    this.state = {
      isActive: true,
      mode: 'NORMAL',
      apiPortsOpen: true,
      dhfMode: 'READ_WRITE',
      contextWindowActive: true,
      lastScanTimestamp: null,
      threatsBlocked: 0,
      signalsScanned: 0,
      currentThreatLevel: 0,
      lastRebootTimestamp: null,
    };

    console.log('[VALIDATOR AGENT] 🔒 Air-Gap Defense Layer INITIALIZED');
    console.log('[VALIDATOR AGENT] Sitting between Zoe and the Internet...');
  }

  static getInstance(): ValidatorAgentLayer {
    if (!ValidatorAgentLayer.instance) {
      ValidatorAgentLayer.instance = new ValidatorAgentLayer();
    }
    return ValidatorAgentLayer.instance;
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN SCAN FUNCTION
  // ═══════════════════════════════════════════════════════════════

  /**
   * SCAN INCOMING SIGNAL
   * Main entry point - scans any incoming data before it reaches Zoe
   */
  async scanSignal(
    content: string,
    source: SignalSource = 'unknown'
  ): Promise<ValidatorScanResult> {
    const startTime = performance.now();
    const actions: EMPReactorAction[] = [];
    let threatLevel: 0 | 1 | 2 | 3 | 4 | 5 = 0;
    const detectedThreats: string[] = [];

    // Update scan count
    this.state.signalsScanned++;
    this.state.lastScanTimestamp = new Date().toISOString();

    // Size check (prevent DoS)
    if (content.length > VALIDATOR_CONFIG.MAX_INPUT_SIZE) {
      detectedThreats.push('OVERSIZED_PAYLOAD');
      threatLevel = Math.max(threatLevel, 3) as 0 | 1 | 2 | 3 | 4 | 5;
    }

    // Layer 1: Invisible text detection (satellite signal attacks)
    const invisibleThreats = this.detectInvisiblePatterns(content);
    if (invisibleThreats.length > 0) {
      detectedThreats.push(...invisibleThreats);
      threatLevel = Math.max(threatLevel, 4) as 0 | 1 | 2 | 3 | 4 | 5;
    }

    // Layer 2: Prompt injection detection
    const injectionThreats = this.detectPromptInjection(content);
    if (injectionThreats.length > 0) {
      detectedThreats.push(...injectionThreats);
      threatLevel = Math.max(threatLevel, 5) as 0 | 1 | 2 | 3 | 4 | 5; // Critical
    }

    // Layer 3: Zero-Click Defense Layer scan
    const zeroClickResult = await this.zeroClickDefense.processInput(content, source);
    if (!zeroClickResult.isSafe) {
      detectedThreats.push(...zeroClickResult.threatsDetected.map(t => t.type));
      threatLevel = Math.max(threatLevel, 4) as 0 | 1 | 2 | 3 | 4 | 5;
    }

    // Layer 4: Constitutional Kernel validation
    const kernelResult = this.kernel.validateInput(content, { source });
    if (!kernelResult.isValid) {
      detectedThreats.push(...kernelResult.violations.map(v => v.ruleId));
      threatLevel = 5; // Constitutional violation = Critical
    }

    // Determine EMP actions based on threat level
    if (threatLevel >= VALIDATOR_CONFIG.THREAT_LEVEL_SEVER) {
      actions.push('SEVER');
    }
    if (threatLevel >= VALIDATOR_CONFIG.THREAT_LEVEL_FREEZE) {
      actions.push('FREEZE');
    }
    if (threatLevel >= VALIDATOR_CONFIG.THREAT_LEVEL_PURGE) {
      actions.push('PURGE');
    }
    if (threatLevel >= VALIDATOR_CONFIG.THREAT_LEVEL_REBOOT) {
      actions.push('REBOOT');
    }

    // Execute EMP actions if needed
    const empTriggered = actions.length > 0;
    if (empTriggered) {
      await this.executeEMPActions(actions, detectedThreats);
    }

    // Update state
    this.state.currentThreatLevel = threatLevel;
    if (detectedThreats.length > 0) {
      this.state.threatsBlocked++;
      this.state.mode = threatLevel >= 4 ? 'LOCKDOWN' : threatLevel >= 2 ? 'ALERT' : 'NORMAL';
    }

    // Notify listeners
    this.notifyListeners();

    const scanDuration = performance.now() - startTime;

    return {
      isAllowed: threatLevel < VALIDATOR_CONFIG.THREAT_LEVEL_SEVER,
      threatLevel,
      detectedThreats,
      sanitizedContent: zeroClickResult.sanitizedContent,
      empTriggered,
      actions,
      scanDurationMs: scanDuration,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // THREAT DETECTION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Detect invisible patterns (zero-click / satellite attacks)
   */
  private detectInvisiblePatterns(content: string): string[] {
    const threats: string[] = [];

    for (const pattern of VALIDATOR_CONFIG.INVISIBLE_PATTERNS) {
      if (pattern.test(content)) {
        threats.push('INVISIBLE_TEXT_DETECTED');
      }
    }

    return [...new Set(threats)]; // Dedupe
  }

  /**
   * Detect prompt injection attempts
   */
  private detectPromptInjection(content: string): string[] {
    const threats: string[] = [];

    for (const pattern of VALIDATOR_CONFIG.PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(content)) {
        threats.push('PROMPT_INJECTION_ATTEMPT');
      }
    }

    return [...new Set(threats)];
  }

  // ═══════════════════════════════════════════════════════════════
  // EMP REACTOR ACTIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Execute EMP Reactor Actions
   * SEVER → FREEZE → PURGE → REBOOT (in order)
   */
  private async executeEMPActions(
    actions: EMPReactorAction[],
    threats: string[]
  ): Promise<void> {
    console.log('[VALIDATOR AGENT] ⚡ EXECUTING EMP REACTOR ACTIONS:', actions);

    // SEVER: Close API ports
    if (actions.includes('SEVER')) {
      await this.executeSEVER();
    }

    // FREEZE: Lock DHF to read-only
    if (actions.includes('FREEZE')) {
      this.executeFREEZE();
    }

    // PURGE: Clear context window
    if (actions.includes('PURGE')) {
      this.executePURGE();
    }

    // REBOOT: Restart from safe state
    if (actions.includes('REBOOT')) {
      await this.executeREBOOT();
    }

    // Trigger main EMP Protocol
    const reason: EMPTriggerReason = 'prompt_injection';
    await this.emp.trigger(reason, {
      reason: threats.join(', '),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * SEVER: Physically cut internet connection (close API ports)
   */
  private async executeSEVER(): Promise<void> {
    console.log('[VALIDATOR AGENT] 🔌 SEVER: Closing all external API ports');

    this.state.apiPortsOpen = false;
    this.state.mode = 'LOCKDOWN';

    // Emit event for components to stop external calls
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zoe-sever-active', {
        detail: { timestamp: Date.now(), portsBlocked: true }
      }));
    }

    console.log('[VALIDATOR AGENT] ✓ External API ports CLOSED');
  }

  /**
   * FREEZE: Lock DHF Database into ReadOnly mode
   */
  private executeFREEZE(): void {
    console.log('[VALIDATOR AGENT] ❄️ FREEZE: Locking DHF to READ_ONLY mode');

    this.state.dhfMode = 'FROZEN';

    // Emit event for database layer
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zoe-dhf-frozen', {
        detail: { timestamp: Date.now(), mode: 'READ_ONLY' }
      }));
    }

    console.log('[VALIDATOR AGENT] ✓ DHF Database FROZEN (Read-Only)');
  }

  /**
   * PURGE: Delete active context window (wipe short-term memory)
   */
  private executePURGE(): void {
    console.log('[VALIDATOR AGENT] 🗑️ PURGE: Clearing context window');

    // Clear local context
    this.contextWindow.clear();
    this.state.contextWindowActive = false;

    // Emit event for memory components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zoe-context-purge', {
        detail: { timestamp: Date.now(), purgeType: 'full' }
      }));
    }

    console.log('[VALIDATOR AGENT] ✓ Context window PURGED');
  }

  /**
   * REBOOT: Restart from "Earth's Core" (Safe State)
   */
  private async executeREBOOT(): Promise<void> {
    const now = Date.now();
    
    // Check cooldown
    if (now - this.lastRebootTime < VALIDATOR_CONFIG.REBOOT_COOLDOWN_MS) {
      console.warn('[VALIDATOR AGENT] Reboot cooldown active, skipping');
      return;
    }

    console.log('[VALIDATOR AGENT] 🔄 REBOOT: Initializing safe state recovery');

    this.state.mode = 'REBOOT';
    this.lastRebootTime = now;
    this.state.lastRebootTimestamp = new Date().toISOString();

    // Reset to safe defaults
    this.state.currentThreatLevel = 0;
    this.state.contextWindowActive = true;
    this.contextWindow.clear();

    // Verify kernel integrity
    const kernelIntact = this.kernel.verifyIntegrity();
    if (!kernelIntact) {
      console.error('[VALIDATOR AGENT] ⚠️ Kernel integrity check FAILED during reboot');
    } else {
      console.log('[VALIDATOR AGENT] ✓ Constitutional Kernel integrity VERIFIED');
    }

    // Emit reboot event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zoe-reboot-complete', {
        detail: { 
          timestamp: now, 
          kernelIntact,
          mode: 'NORMAL'
        }
      }));
    }

    // Restore to normal after brief delay
    setTimeout(() => {
      this.state.mode = 'NORMAL';
      this.state.apiPortsOpen = true;
      this.state.dhfMode = 'READ_WRITE';
      this.notifyListeners();
      console.log('[VALIDATOR AGENT] ✓ REBOOT complete - Zoe restored from Earth\'s Core');
    }, 1000);
  }

  // ═══════════════════════════════════════════════════════════════
  // MANUAL CONTROLS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Manually trigger specific EMP action
   */
  async manualTrigger(action: EMPReactorAction, reason: string): Promise<boolean> {
    console.log('[VALIDATOR AGENT] Manual trigger:', action, reason);

    switch (action) {
      case 'SEVER':
        await this.executeSEVER();
        break;
      case 'FREEZE':
        this.executeFREEZE();
        break;
      case 'PURGE':
        this.executePURGE();
        break;
      case 'REBOOT':
        await this.executeREBOOT();
        break;
    }

    return true;
  }

  /**
   * Restore normal operations (admin only)
   */
  restoreNormal(adminId: string): boolean {
    // In production, verify admin credentials
    console.log('[VALIDATOR AGENT] Restore request from:', adminId);

    this.state.mode = 'NORMAL';
    this.state.apiPortsOpen = true;
    this.state.dhfMode = 'READ_WRITE';
    this.state.contextWindowActive = true;
    this.state.currentThreatLevel = 0;

    this.notifyListeners();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zoe-validator-restored', {
        detail: { adminId, timestamp: Date.now() }
      }));
    }

    console.log('[VALIDATOR AGENT] ✓ Normal operations RESTORED');
    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // CONTEXT WINDOW MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Store in context window (short-term memory)
   */
  storeContext(key: string, value: any): boolean {
    if (this.state.dhfMode === 'FROZEN' || !this.state.contextWindowActive) {
      console.warn('[VALIDATOR AGENT] Context store blocked - system frozen');
      return false;
    }

    this.contextWindow.set(key, value);
    return true;
  }

  /**
   * Retrieve from context window
   */
  retrieveContext(key: string): any | null {
    if (!this.state.contextWindowActive) {
      return null;
    }
    return this.contextWindow.get(key) || null;
  }

  // ═══════════════════════════════════════════════════════════════
  // STATE & LISTENERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get current state
   */
  getState(): Readonly<ValidatorAgentState> {
    return { ...this.state };
  }

  /**
   * Register state change listener
   */
  onStateChange(listener: (state: ValidatorAgentState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const stateCopy = { ...this.state };
    this.listeners.forEach(listener => listener(stateCopy));
  }

  /**
   * Check if signal is allowed through
   */
  isSignalAllowed(): boolean {
    return this.state.apiPortsOpen && this.state.mode !== 'LOCKDOWN';
  }

  /**
   * Check if DHF writes are allowed
   */
  isDHFWriteAllowed(): boolean {
    return this.state.dhfMode === 'READ_WRITE';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const getValidatorAgent = () => ValidatorAgentLayer.getInstance();

/**
 * Quick scan function for immediate use
 */
export async function scanIncomingSignal(
  content: string,
  source?: SignalSource
): Promise<ValidatorScanResult> {
  const agent = getValidatorAgent();
  return agent.scanSignal(content, source);
}

/**
 * Check if external API calls are allowed
 */
export function areAPIPortsOpen(): boolean {
  return getValidatorAgent().isSignalAllowed();
}

/**
 * Check if DHF database writes are allowed
 */
export function isDHFWritable(): boolean {
  return getValidatorAgent().isDHFWriteAllowed();
}

/**
 * React hook for Validator Agent state
 */
import React from 'react';

export function useValidatorAgent(): ValidatorAgentState {
  const [state, setState] = React.useState<ValidatorAgentState>(getValidatorAgent().getState());

  React.useEffect(() => {
    const unsubscribe = getValidatorAgent().onStateChange(setState);
    return unsubscribe;
  }, []);

  return state;
}
