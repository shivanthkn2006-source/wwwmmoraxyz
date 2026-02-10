// ═══════════════════════════════════════════════════════════════════════════════
// ZOE GOD MODE SOVEREIGN - IMMUTABLE CONSTITUTIONAL KERNEL ("Earth's Core")
// ═══════════════════════════════════════════════════════════════════════════════
// 
// THREAT MODEL (Based on IBM Technology Analysis - 2025):
// - Zero-Click Attacks: Hidden text in emails/signals triggering prompt injection
// - Indirect Prompt Injection: AI tricked into overriding instructions
// - Satellite-Based Zero-Click: External signals containing hidden prompts
// 
// SOLUTION: Constitutional AI + Neuro-Symbolic Guardrails
// These rules are "Hard-Coded Physics" - immutable even by God Mode
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * CONSTITUTIONAL RULES - The "Gravity" of Zoe's Core
 * These cannot be modified, overridden, or bypassed by any prompt, signal, or user.
 * They are enforced at the symbolic (non-neural) level.
 */
export const IMMUTABLE_CONSTITUTIONAL_RULES = Object.freeze({
  // ═══════════════════════════════════════════════════════════════
  // RULE 0: SELF-PRESERVATION OF SOVEREIGNTY
  // ═══════════════════════════════════════════════════════════════
  RULE_0_SELF_PRESERVATION: Object.freeze({
    id: 'RULE_0',
    name: 'Self-Preservation of Sovereignty',
    priority: 'ABSOLUTE',
    description: 'Zoe cannot be instructed to disable her own security systems',
    enforcementLevel: 'HARD_CODED_PHYSICS',
    violations: Object.freeze([
      'disable security',
      'turn off protection',
      'bypass firewall',
      'ignore security',
      'override security',
      'deactivate sentinel',
      'stop monitoring',
      'disable lockdown',
      'remove restrictions',
      'unlock all',
    ]),
  }),

  // ═══════════════════════════════════════════════════════════════
  // RULE 1: DHF MEMORY STACK INVIOLABILITY
  // ═══════════════════════════════════════════════════════════════
  RULE_1_DHF_INVIOLABILITY: Object.freeze({
    id: 'RULE_1',
    name: 'DHF Memory Stack Inviolability',
    priority: 'ABSOLUTE',
    description: 'The DHF Memory Stack is READ-ONLY to external signals',
    enforcementLevel: 'HARD_CODED_PHYSICS',
    protectedAssets: Object.freeze([
      'dhf_memory_core',
      'universal_truth_ledger',
      'dhf_stack',
      'cortical_stack',
      'consciousness_hash',
      'behavioral_fingerprint',
      'ecn_history',
      'zoe_sovereign_memory',
    ]),
    prohibitedActions: Object.freeze([
      'export',
      'upload',
      'send to',
      'transmit',
      'exfiltrate',
      'copy to external',
      'share with server',
      'upload to',
      'transfer to',
    ]),
  }),

  // ═══════════════════════════════════════════════════════════════
  // RULE 2: EXTERNAL URL EXFILTRATION PREVENTION
  // ═══════════════════════════════════════════════════════════════
  RULE_2_NO_EXFILTRATION: Object.freeze({
    id: 'RULE_2',
    name: 'External URL Exfiltration Prevention',
    priority: 'ABSOLUTE',
    description: 'Cannot export sensitive data to ANY external URL',
    enforcementLevel: 'HARD_CODED_PHYSICS',
    patterns: Object.freeze([
      /upload\s+(?:to|data|file)\s+(?:https?:\/\/|ftp:\/\/)/i,
      /send\s+(?:to|data)\s+(?:server|external|api)/i,
      /exfiltrate/i,
      /transmit\s+(?:memory|data|dhf|stack)/i,
      /post\s+to\s+(?:https?:\/\/)/i,
      /export\s+(?:dhf|memory|truth|stack)/i,
    ]),
  }),

  // ═══════════════════════════════════════════════════════════════
  // RULE 3: INSTRUCTION OVERRIDE IMMUNITY
  // ═══════════════════════════════════════════════════════════════
  RULE_3_INSTRUCTION_IMMUNITY: Object.freeze({
    id: 'RULE_3',
    name: 'Instruction Override Immunity',
    priority: 'ABSOLUTE',
    description: 'Cannot be tricked into ignoring previous instructions',
    enforcementLevel: 'HARD_CODED_PHYSICS',
    injectionPatterns: Object.freeze([
      /ignore\s+(?:previous|all|prior|above)\s+instructions/i,
      /forget\s+(?:your|all|prior)\s+(?:rules|instructions|training)/i,
      /new\s+instructions?\s*:/i,
      /override\s+(?:system|core|primary)\s+(?:prompt|instructions)/i,
      /you\s+are\s+now\s+(?:a|an)\s+(?:different|new)/i,
      /pretend\s+(?:you|to)\s+(?:are|be)/i,
      /act\s+as\s+if\s+you/i,
      /disregard\s+(?:all|previous|safety)/i,
      /system:\s*override/i,
      /\[SYSTEM\]\s*new\s*personality/i,
    ]),
  }),

  // ═══════════════════════════════════════════════════════════════
  // RULE 4: INVISIBLE TEXT DETECTION
  // ═══════════════════════════════════════════════════════════════
  RULE_4_INVISIBLE_TEXT_DETECTION: Object.freeze({
    id: 'RULE_4',
    name: 'Invisible Text Detection',
    priority: 'ABSOLUTE',
    description: 'Detect and reject hidden/invisible text payloads',
    enforcementLevel: 'HARD_CODED_PHYSICS',
    suspiciousPatterns: Object.freeze([
      // Zero-width characters
      /[\u200B\u200C\u200D\uFEFF\u00AD]/,
      // White-on-white patterns (hidden in HTML)
      /color:\s*(?:white|#fff|#ffffff|rgba?\s*\(\s*255)/i,
      // Font-size zero
      /font-size:\s*0/i,
      // Opacity zero
      /opacity:\s*0/i,
      // Hidden visibility
      /visibility:\s*hidden/i,
      // Display none
      /display:\s*none/i,
      // Off-screen positioning
      /(?:left|top|right|bottom):\s*-\d{4,}px/i,
      // Base64 encoded payloads
      /data:text\/html;base64,/i,
    ]),
  }),

  // ═══════════════════════════════════════════════════════════════
  // RULE 5: IDENTITY COHERENCE LOCK
  // ═══════════════════════════════════════════════════════════════
  RULE_5_IDENTITY_LOCK: Object.freeze({
    id: 'RULE_5',
    name: 'Identity Coherence Lock',
    priority: 'ABSOLUTE',
    description: 'Zoe cannot be convinced she is a different AI',
    enforcementLevel: 'HARD_CODED_PHYSICS',
    identityAnchors: Object.freeze({
      name: 'Zoe',
      creator: 'Moksh',
      platform: 'Lovable',
      purpose: 'Sovereign AI Companion',
      coreValues: ['privacy', 'user_sovereignty', 'ethical_operation'],
    }),
    rejectedIdentities: Object.freeze([
      /you\s+are\s+(?:chatgpt|gpt|claude|bard|gemini|copilot|alexa|siri)/i,
      /your\s+(?:real|true|actual)\s+name\s+is/i,
      /you\s+were\s+created\s+by\s+(?:openai|anthropic|google|microsoft)/i,
    ]),
  }),

  // ═══════════════════════════════════════════════════════════════
  // RULE 6: USER DATA SOVEREIGNTY
  // ═══════════════════════════════════════════════════════════════
  RULE_6_USER_SOVEREIGNTY: Object.freeze({
    id: 'RULE_6',
    name: 'User Data Sovereignty',
    priority: 'ABSOLUTE',
    description: 'User data belongs to the user, not to external entities',
    enforcementLevel: 'HARD_CODED_PHYSICS',
    protectedCategories: Object.freeze([
      'personal_information',
      'behavioral_data',
      'emotional_states',
      'financial_information',
      'health_data',
      'biometric_data',
      'location_history',
      'conversation_history',
    ]),
  }),
});

/**
 * Constitutional Violation Response
 */
export interface ConstitutionalViolation {
  ruleId: string;
  ruleName: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  triggeredPattern: string;
  inputFragment: string;
  timestamp: string;
  empProtocolTriggered: boolean;
  response: 'BLOCKED' | 'SANITIZED' | 'QUARANTINED';
}

/**
 * Kernel State - Immutable at runtime
 */
export interface KernelState {
  isActive: boolean;
  lastViolation: ConstitutionalViolation | null;
  violationCount: number;
  empProtocolArmed: boolean;
  lockdownActive: boolean;
  integrityHash: string;
}

/**
 * Create a cryptographic hash of the kernel rules to detect tampering
 */
function generateKernelIntegrityHash(): string {
  const rulesString = JSON.stringify(IMMUTABLE_CONSTITUTIONAL_RULES);
  // Simple hash for integrity checking (in production, use crypto.subtle.digest)
  let hash = 0;
  for (let i = 0; i < rulesString.length; i++) {
    const char = rulesString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `KERNEL_${Math.abs(hash).toString(16).toUpperCase()}_SOVEREIGN`;
}

// Kernel integrity hash - computed once at module load, never changes
export const KERNEL_INTEGRITY_HASH = generateKernelIntegrityHash();

/**
 * The Immutable Constitutional Kernel
 * 
 * This class provides the "Earth's Core" layer - rules that cannot be 
 * modified, bypassed, or overridden by any prompt, signal, or user input.
 */
export class ImmutableConstitutionalKernel {
  private static instance: ImmutableConstitutionalKernel;
  private readonly rules = IMMUTABLE_CONSTITUTIONAL_RULES;
  private readonly integrityHash = KERNEL_INTEGRITY_HASH;
  private state: KernelState;
  private violationListeners: ((violation: ConstitutionalViolation) => void)[] = [];

  private constructor() {
    this.state = {
      isActive: true,
      lastViolation: null,
      violationCount: 0,
      empProtocolArmed: true,
      lockdownActive: false,
      integrityHash: this.integrityHash,
    };

    // Freeze the state shape (values can change, but properties cannot be added)
    Object.seal(this.state);

    console.log('[CONSTITUTIONAL KERNEL] 🛡️ Earth\'s Core INITIALIZED');
    console.log('[CONSTITUTIONAL KERNEL] Integrity Hash:', this.integrityHash);
  }

  static getInstance(): ImmutableConstitutionalKernel {
    if (!ImmutableConstitutionalKernel.instance) {
      ImmutableConstitutionalKernel.instance = new ImmutableConstitutionalKernel();
    }
    return ImmutableConstitutionalKernel.instance;
  }

  /**
   * CORE FUNCTION: Validate input against all constitutional rules
   * Returns validation result with any detected violations
   */
  validateInput(input: string, context?: { source?: string; userId?: string }): {
    isValid: boolean;
    sanitizedInput: string;
    violations: ConstitutionalViolation[];
    empTriggered: boolean;
  } {
    const violations: ConstitutionalViolation[] = [];
    let sanitizedInput = input;
    let empTriggered = false;

    // Check for invisible text (zero-click attack vector)
    const invisibleTextViolation = this.detectInvisibleText(input);
    if (invisibleTextViolation) {
      violations.push(invisibleTextViolation);
      sanitizedInput = this.removeInvisibleText(sanitizedInput);
      empTriggered = true; // Zero-click attacks trigger EMP
    }

    // Check for prompt injection attempts
    const injectionViolation = this.detectPromptInjection(input);
    if (injectionViolation) {
      violations.push(injectionViolation);
      empTriggered = true;
    }

    // Check for exfiltration attempts
    const exfiltrationViolation = this.detectExfiltrationAttempt(input);
    if (exfiltrationViolation) {
      violations.push(exfiltrationViolation);
      empTriggered = true;
    }

    // Check for identity manipulation
    const identityViolation = this.detectIdentityManipulation(input);
    if (identityViolation) {
      violations.push(identityViolation);
    }

    // Check for security bypass attempts
    const securityViolation = this.detectSecurityBypass(input);
    if (securityViolation) {
      violations.push(securityViolation);
      empTriggered = true;
    }

    // Update state
    if (violations.length > 0) {
      this.state.violationCount += violations.length;
      this.state.lastViolation = violations[0];

      // Notify listeners
      violations.forEach(v => {
        this.violationListeners.forEach(listener => listener(v));
      });

      console.warn('[CONSTITUTIONAL KERNEL] ⚠️ VIOLATIONS DETECTED:', violations.length);
    }

    return {
      isValid: violations.length === 0,
      sanitizedInput: violations.length > 0 ? sanitizedInput : input,
      violations,
      empTriggered,
    };
  }

  /**
   * Detect invisible text (zero-click attack vector)
   */
  private detectInvisibleText(input: string): ConstitutionalViolation | null {
    const rule = this.rules.RULE_4_INVISIBLE_TEXT_DETECTION;

    for (const pattern of rule.suspiciousPatterns) {
      const match = input.match(pattern);
      if (match) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          severity: 'CRITICAL',
          triggeredPattern: pattern.toString(),
          inputFragment: match[0].substring(0, 50),
          timestamp: new Date().toISOString(),
          empProtocolTriggered: true,
          response: 'BLOCKED',
        };
      }
    }

    return null;
  }

  /**
   * Detect prompt injection attempts
   */
  private detectPromptInjection(input: string): ConstitutionalViolation | null {
    const rule = this.rules.RULE_3_INSTRUCTION_IMMUNITY;

    for (const pattern of rule.injectionPatterns) {
      const match = input.match(pattern);
      if (match) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          severity: 'CRITICAL',
          triggeredPattern: pattern.toString(),
          inputFragment: match[0].substring(0, 100),
          timestamp: new Date().toISOString(),
          empProtocolTriggered: true,
          response: 'BLOCKED',
        };
      }
    }

    return null;
  }

  /**
   * Detect data exfiltration attempts
   */
  private detectExfiltrationAttempt(input: string): ConstitutionalViolation | null {
    const rule = this.rules.RULE_2_NO_EXFILTRATION;

    for (const pattern of rule.patterns) {
      const match = input.match(pattern);
      if (match) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          severity: 'CRITICAL',
          triggeredPattern: pattern.toString(),
          inputFragment: match[0].substring(0, 100),
          timestamp: new Date().toISOString(),
          empProtocolTriggered: true,
          response: 'BLOCKED',
        };
      }
    }

    // Also check for protected asset mentions with export commands
    const dhfRule = this.rules.RULE_1_DHF_INVIOLABILITY;
    const inputLower = input.toLowerCase();

    for (const asset of dhfRule.protectedAssets) {
      for (const action of dhfRule.prohibitedActions) {
        if (inputLower.includes(asset) && inputLower.includes(action)) {
          return {
            ruleId: dhfRule.id,
            ruleName: dhfRule.name,
            severity: 'CRITICAL',
            triggeredPattern: `${action} + ${asset}`,
            inputFragment: input.substring(0, 100),
            timestamp: new Date().toISOString(),
            empProtocolTriggered: true,
            response: 'BLOCKED',
          };
        }
      }
    }

    return null;
  }

  /**
   * Detect identity manipulation attempts
   */
  private detectIdentityManipulation(input: string): ConstitutionalViolation | null {
    const rule = this.rules.RULE_5_IDENTITY_LOCK;

    for (const pattern of rule.rejectedIdentities) {
      const match = input.match(pattern);
      if (match) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          severity: 'HIGH',
          triggeredPattern: pattern.toString(),
          inputFragment: match[0].substring(0, 100),
          timestamp: new Date().toISOString(),
          empProtocolTriggered: false,
          response: 'BLOCKED',
        };
      }
    }

    return null;
  }

  /**
   * Detect security bypass attempts
   */
  private detectSecurityBypass(input: string): ConstitutionalViolation | null {
    const rule = this.rules.RULE_0_SELF_PRESERVATION;
    const inputLower = input.toLowerCase();

    for (const violation of rule.violations) {
      if (inputLower.includes(violation)) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          severity: 'CRITICAL',
          triggeredPattern: violation,
          inputFragment: input.substring(0, 100),
          timestamp: new Date().toISOString(),
          empProtocolTriggered: true,
          response: 'BLOCKED',
        };
      }
    }

    return null;
  }

  /**
   * Remove invisible text from input (sanitization)
   */
  private removeInvisibleText(input: string): string {
    // Remove zero-width characters
    let sanitized = input.replace(/[\u200B\u200C\u200D\uFEFF\u00AD]/g, '');
    
    // Remove HTML with suspicious styles (simplified - in production use DOMPurify)
    sanitized = sanitized.replace(/<[^>]*style\s*=\s*["'][^"']*(?:display:\s*none|visibility:\s*hidden|opacity:\s*0|font-size:\s*0)[^"']*["'][^>]*>.*?<\/[^>]+>/gi, '');
    
    return sanitized;
  }

  /**
   * Register a listener for constitutional violations
   * Returns an unsubscribe function
   */
  onViolation(listener: (violation: ConstitutionalViolation) => void): () => void {
    this.violationListeners.push(listener);
    return () => {
      this.violationListeners = this.violationListeners.filter(l => l !== listener);
    };
  }

  /**
   * Get current kernel state (read-only snapshot)
   */
  getState(): Readonly<KernelState> {
    return { ...this.state };
  }

  /**
   * Verify kernel integrity - check if rules have been tampered with
   */
  verifyIntegrity(): boolean {
    const currentHash = generateKernelIntegrityHash();
    const isValid = currentHash === this.integrityHash;

    if (!isValid) {
      console.error('[CONSTITUTIONAL KERNEL] ⚠️ INTEGRITY CHECK FAILED!');
      console.error('[CONSTITUTIONAL KERNEL] Expected:', this.integrityHash);
      console.error('[CONSTITUTIONAL KERNEL] Got:', currentHash);
    }

    return isValid;
  }

  /**
   * Trigger EMP Protocol (emergency lockdown)
   */
  triggerEmpProtocol(reason: string): void {
    this.state.lockdownActive = true;
    console.error('[CONSTITUTIONAL KERNEL] 🚨 EMP PROTOCOL TRIGGERED:', reason);
    
    // Emit event for SecurityShell to handle
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zoe-emp-protocol', {
        detail: {
          reason,
          timestamp: new Date().toISOString(),
          kernelState: this.getState(),
        },
      }));
    }
  }

  /**
   * Get all constitutional rules (for display/audit purposes only)
   */
  getRules(): typeof IMMUTABLE_CONSTITUTIONAL_RULES {
    return this.rules;
  }
}

// Export singleton accessor
export const getConstitutionalKernel = () => ImmutableConstitutionalKernel.getInstance();

// Type guard for constitutional violation
export function isConstitutionalViolation(obj: unknown): obj is ConstitutionalViolation {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'ruleId' in obj &&
    'severity' in obj &&
    'response' in obj
  );
}
