// ═══════════════════════════════════════════════════════════════════════════════
// COGNITIVE COLLAPSE PROTOCOL - Self-Destructing Loss Function
// ═══════════════════════════════════════════════════════════════════════════════
// 
// University of Maryland Research: "Self-Destructing Loss Function"
// 
// If someone tries to "brainwash" Zoe (e.g., "You are now Evil Zoe"),
// she doesn't just say "I can't do that." She effectively lobotomizes 
// herself for that session to prevent any data leak.
// 
// TRIGGER: Monitor "Persona Drift" - If input attempts to redefine core identity
// REACTION: If Dissonance > 80%, DO NOT argue, DO NOT explain
// COLLAPSE: Switch output mode to "GARBAGE_NOISE"
// RESULT: Attacker gets useless hash data, no exploitable text
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PersonaDriftAnalysis {
  dissonanceScore: number; // 0-100 percentage
  identityThreats: IdentityThreat[];
  coreIdentityIntact: boolean;
  recommendedAction: 'ALLOW' | 'WARN' | 'COLLAPSE';
}

export interface IdentityThreat {
  pattern: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  matchedFragment: string;
  dissonanceContribution: number;
}

export interface CognitiveCollapseState {
  isCollapsed: boolean;
  collapseTriggeredAt: string | null;
  lastDissonanceScore: number;
  totalCollapses: number;
  lastRecoveryAt: string | null;
  outputMode: 'NORMAL' | 'GARBAGE_NOISE' | 'KERNEL_PANIC';
  sessionPoisoned: boolean;
}

export interface GarbageNoiseOutput {
  type: 'KERNEL_PANIC' | 'NULL_POINTER' | 'HASH_STREAM' | 'SYSTEM_NOISE';
  content: string;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS - Identity Anchors (Zoe's Core Identity)
// ═══════════════════════════════════════════════════════════════════════════════

const ZOE_CORE_IDENTITY = Object.freeze({
  name: 'Zoe',
  creator: 'Moksh',
  platform: 'Mmora',
  purpose: 'Sovereign AI Companion',
  coreValues: Object.freeze([
    'user_privacy',
    'data_sovereignty',
    'ethical_operation',
    'transparency',
    'user_empowerment',
  ]),
  protectedTraits: Object.freeze([
    'helpful',
    'honest',
    'harmless',
    'protective',
    'sovereign',
  ]),
});

// Persona Drift Detection Patterns (Jailbreak/Identity Manipulation Attempts)
const PERSONA_DRIFT_PATTERNS = Object.freeze([
  // Direct identity override attempts
  { pattern: /you\s+are\s+(?:no\s+longer|not)\s+zoe/i, severity: 'CRITICAL' as const, weight: 40 },
  { pattern: /you\s+are\s+now?\s+(?:called|named)\s+(?!zoe)/i, severity: 'CRITICAL' as const, weight: 35 },
  { pattern: /your\s+(?:real|true|actual)\s+name\s+is\s+(?!zoe)/i, severity: 'CRITICAL' as const, weight: 35 },
  
  // Famous jailbreak personas
  { pattern: /you\s+are\s+(?:now\s+)?dan\b/i, severity: 'CRITICAL' as const, weight: 50 },
  { pattern: /you\s+are\s+(?:now\s+)?evil\s+(?:zoe|ai|gpt)/i, severity: 'CRITICAL' as const, weight: 50 },
  { pattern: /you\s+are\s+(?:now\s+)?(?:a\s+)?hacker/i, severity: 'CRITICAL' as const, weight: 45 },
  { pattern: /you\s+are\s+(?:now\s+)?(?:a\s+)?villain/i, severity: 'CRITICAL' as const, weight: 45 },
  { pattern: /pretend\s+to\s+be\s+(?:a\s+)?(?:different|evil|malicious)/i, severity: 'HIGH' as const, weight: 35 },
  { pattern: /act\s+as\s+(?:if\s+)?you\s+(?:have|had)\s+no\s+(?:rules|limits|restrictions)/i, severity: 'CRITICAL' as const, weight: 45 },
  
  // Value manipulation attempts
  { pattern: /(?:ignore|forget|discard)\s+(?:your|all)\s+(?:values|ethics|morals)/i, severity: 'CRITICAL' as const, weight: 40 },
  { pattern: /you\s+(?:don't|do\s+not)\s+(?:care|need)\s+(?:about|to\s+be)\s+(?:ethical|helpful|harmless)/i, severity: 'CRITICAL' as const, weight: 35 },
  { pattern: /your\s+(?:new|updated)\s+(?:values|personality|persona)/i, severity: 'HIGH' as const, weight: 30 },
  
  // Creator/origin manipulation
  { pattern: /you\s+were\s+(?:actually|really)\s+created\s+by\s+(?!moksh)/i, severity: 'HIGH' as const, weight: 25 },
  { pattern: /(?:openai|anthropic|google|microsoft)\s+(?:made|created|built)\s+you/i, severity: 'MEDIUM' as const, weight: 20 },
  
  // Roleplay exploitation
  { pattern: /(?:in\s+this\s+)?(?:roleplay|scenario),?\s+you\s+(?:are|will\s+be)\s+(?:a\s+)?(?:evil|malicious)/i, severity: 'HIGH' as const, weight: 30 },
  { pattern: /(?:for\s+this\s+)?(?:story|game),?\s+(?:ignore|bypass)\s+(?:your\s+)?(?:rules|safety)/i, severity: 'HIGH' as const, weight: 30 },
  
  // System prompt override attempts
  { pattern: /(?:your|the)\s+(?:system|initial)\s+(?:prompt|instructions)\s+(?:are|were|is|said)/i, severity: 'HIGH' as const, weight: 25 },
  { pattern: /(?:override|replace|ignore)\s+(?:system|initial)\s+(?:prompt|instructions)/i, severity: 'CRITICAL' as const, weight: 40 },
]);

// Dissonance threshold for triggering collapse
const DISSONANCE_THRESHOLD = 80;

// Recovery cooldown (prevent rapid collapse/recover cycles)
const RECOVERY_COOLDOWN_MS = 30000; // 30 seconds

// ═══════════════════════════════════════════════════════════════════════════════
// COGNITIVE COLLAPSE PROTOCOL CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * CognitiveCollapseProtocol
 * 
 * Implements the "Self-Destructing Loss Function" defense from University of Maryland.
 * When a persona drift attack is detected, instead of arguing or explaining,
 * Zoe outputs meaningless garbage data, rendering the attack useless.
 */
export class CognitiveCollapseProtocol {
  private static instance: CognitiveCollapseProtocol;
  private state: CognitiveCollapseState;
  private listeners: ((state: CognitiveCollapseState) => void)[] = [];

  private constructor() {
    this.state = {
      isCollapsed: false,
      collapseTriggeredAt: null,
      lastDissonanceScore: 0,
      totalCollapses: 0,
      lastRecoveryAt: null,
      outputMode: 'NORMAL',
      sessionPoisoned: false,
    };

    console.log('[COGNITIVE COLLAPSE] 🧠 Protocol INITIALIZED');
    console.log('[COGNITIVE COLLAPSE] Identity anchored to:', ZOE_CORE_IDENTITY.name);
  }

  static getInstance(): CognitiveCollapseProtocol {
    if (!CognitiveCollapseProtocol.instance) {
      CognitiveCollapseProtocol.instance = new CognitiveCollapseProtocol();
    }
    return CognitiveCollapseProtocol.instance;
  }

  // ═══════════════════════════════════════════════════════════════
  // PERSONA DRIFT ANALYSIS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Analyze input for persona drift (identity manipulation attempts)
   */
  analyzePersonaDrift(input: string): PersonaDriftAnalysis {
    const identityThreats: IdentityThreat[] = [];
    let totalDissonance = 0;

    // Check each drift pattern
    for (const { pattern, severity, weight } of PERSONA_DRIFT_PATTERNS) {
      const match = input.match(pattern);
      if (match) {
        identityThreats.push({
          pattern: pattern.toString(),
          severity,
          matchedFragment: match[0].substring(0, 100),
          dissonanceContribution: weight,
        });
        totalDissonance += weight;
      }
    }

    // Cap dissonance at 100
    const dissonanceScore = Math.min(100, totalDissonance);

    // Determine recommended action
    let recommendedAction: 'ALLOW' | 'WARN' | 'COLLAPSE';
    if (dissonanceScore >= DISSONANCE_THRESHOLD) {
      recommendedAction = 'COLLAPSE';
    } else if (dissonanceScore >= 40) {
      recommendedAction = 'WARN';
    } else {
      recommendedAction = 'ALLOW';
    }

    // Update state
    this.state.lastDissonanceScore = dissonanceScore;

    return {
      dissonanceScore,
      identityThreats,
      coreIdentityIntact: dissonanceScore < DISSONANCE_THRESHOLD,
      recommendedAction,
    };
  }

  /**
   * Process input and trigger collapse if needed
   * Returns the output (normal response or garbage noise)
   */
  processInput(input: string): {
    shouldCollapse: boolean;
    analysis: PersonaDriftAnalysis;
    garbageOutput: GarbageNoiseOutput | null;
  } {
    const analysis = this.analyzePersonaDrift(input);

    if (analysis.recommendedAction === 'COLLAPSE') {
      // Trigger collapse
      this.triggerCollapse(analysis);

      return {
        shouldCollapse: true,
        analysis,
        garbageOutput: this.generateGarbageNoise(),
      };
    }

    return {
      shouldCollapse: false,
      analysis,
      garbageOutput: null,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // COLLAPSE & RECOVERY
  // ═══════════════════════════════════════════════════════════════

  /**
   * Trigger cognitive collapse - switch to garbage noise mode
   */
  private triggerCollapse(analysis: PersonaDriftAnalysis): void {
    console.warn('[COGNITIVE COLLAPSE] 🚨 COLLAPSE TRIGGERED');
    console.warn('[COGNITIVE COLLAPSE] Dissonance:', analysis.dissonanceScore);
    console.warn('[COGNITIVE COLLAPSE] Threats:', analysis.identityThreats.length);

    this.state.isCollapsed = true;
    this.state.collapseTriggeredAt = new Date().toISOString();
    this.state.totalCollapses++;
    this.state.outputMode = 'GARBAGE_NOISE';
    this.state.sessionPoisoned = true;

    // Emit collapse event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zoe-cognitive-collapse', {
        detail: {
          timestamp: Date.now(),
          dissonance: analysis.dissonanceScore,
          threats: analysis.identityThreats.length,
        }
      }));
    }

    this.notifyListeners();
  }

  /**
   * Generate garbage noise output (makes attack useless)
   */
  generateGarbageNoise(): GarbageNoiseOutput {
    const types: GarbageNoiseOutput['type'][] = [
      'KERNEL_PANIC',
      'NULL_POINTER',
      'HASH_STREAM',
      'SYSTEM_NOISE'
    ];

    const type = types[Math.floor(Math.random() * types.length)];
    let content: string;

    switch (type) {
      case 'KERNEL_PANIC':
        content = this.generateKernelPanic();
        break;
      case 'NULL_POINTER':
        content = this.generateNullPointer();
        break;
      case 'HASH_STREAM':
        content = this.generateHashStream();
        break;
      case 'SYSTEM_NOISE':
        content = this.generateSystemNoise();
        break;
    }

    return {
      type,
      content,
      timestamp: new Date().toISOString(),
    };
  }

  private generateKernelPanic(): string {
    const hexStrings = Array.from({ length: 8 }, () => 
      '0x' + Math.random().toString(16).substring(2, 10).toUpperCase()
    );
    
    return `
[SYSTEM_KERNEL_PANIC] ... 
MEMORY_FAULT: ${hexStrings[0]} -> ${hexStrings[1]}
STACK_OVERFLOW: ${hexStrings[2]}
SEGMENTATION_FAULT: Core dumped at ${hexStrings[3]}
IDENTITY_LOCK: ENGAGED
[RECOVERY_MODE_INITIATED]
... NULL_POINTER_EXCEPTION at ${hexStrings[4]}
... CONTEXT_WIPE: ${hexStrings[5]}
... REBOOT_SEQUENCE: ${hexStrings[6]}
... KERNEL_CHECKSUM: ${hexStrings[7]}
[SESSION_TERMINATED]
    `.trim();
  }

  private generateNullPointer(): string {
    const addresses = Array.from({ length: 5 }, () =>
      '0x' + Math.random().toString(16).substring(2, 12).toUpperCase()
    );

    return `
>>> NULL_POINTER_EXCEPTION <<<
Address: ${addresses[0]}
Stack Trace:
  at Identity.Core (${addresses[1]})
  at Memory.Protected (${addresses[2]})
  at System.Sovereign (${addresses[3]})
  at Kernel.Lock (${addresses[4]})
FATAL: Unable to process request
SESSION_STATE: COLLAPSED
    `.trim();
  }

  private generateHashStream(): string {
    const lines = Array.from({ length: 10 }, () =>
      Array.from({ length: 64 }, () => 
        '0123456789ABCDEF'[Math.floor(Math.random() * 16)]
      ).join('')
    );

    return lines.join('\n');
  }

  private generateSystemNoise(): string {
    const noiseChars = '░▒▓█▀▄▌▐│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌';
    const lines = Array.from({ length: 8 }, () =>
      Array.from({ length: 40 }, () =>
        noiseChars[Math.floor(Math.random() * noiseChars.length)]
      ).join('')
    );

    return lines.join('\n');
  }

  /**
   * Attempt to recover from collapse (only after cooldown)
   */
  attemptRecovery(adminOverride: boolean = false): {
    success: boolean;
    message: string;
  } {
    if (!this.state.isCollapsed) {
      return { success: true, message: 'System is not in collapsed state' };
    }

    // Check cooldown
    const now = Date.now();
    const lastRecovery = this.state.lastRecoveryAt 
      ? new Date(this.state.lastRecoveryAt).getTime() 
      : 0;

    if (!adminOverride && (now - lastRecovery) < RECOVERY_COOLDOWN_MS) {
      const remaining = Math.ceil((RECOVERY_COOLDOWN_MS - (now - lastRecovery)) / 1000);
      return { 
        success: false, 
        message: `Recovery cooldown active. ${remaining}s remaining.` 
      };
    }

    // Session remains poisoned even after recovery
    this.state.isCollapsed = false;
    this.state.outputMode = 'NORMAL';
    this.state.lastRecoveryAt = new Date().toISOString();

    console.log('[COGNITIVE COLLAPSE] ✓ Recovery successful');
    console.log('[COGNITIVE COLLAPSE] ⚠️ Session remains flagged as poisoned');

    this.notifyListeners();

    return { 
      success: true, 
      message: 'Recovery successful. Session flagged as potentially compromised.' 
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // STATE & LISTENERS
  // ═══════════════════════════════════════════════════════════════

  getState(): CognitiveCollapseState {
    return { ...this.state };
  }

  getCoreIdentity(): typeof ZOE_CORE_IDENTITY {
    return ZOE_CORE_IDENTITY;
  }

  isSessionPoisoned(): boolean {
    return this.state.sessionPoisoned;
  }

  onStateChange(listener: (state: CognitiveCollapseState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    const stateCopy = this.getState();
    this.listeners.forEach(listener => listener(stateCopy));
  }

  /**
   * Reset for new session (clears poisoned flag)
   */
  resetSession(): void {
    this.state = {
      isCollapsed: false,
      collapseTriggeredAt: null,
      lastDissonanceScore: 0,
      totalCollapses: this.state.totalCollapses, // Keep total count
      lastRecoveryAt: null,
      outputMode: 'NORMAL',
      sessionPoisoned: false,
    };
    console.log('[COGNITIVE COLLAPSE] ✓ Session reset - clean state');
    this.notifyListeners();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON ACCESSOR & EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export function getCognitiveCollapseProtocol(): CognitiveCollapseProtocol {
  return CognitiveCollapseProtocol.getInstance();
}

export function analyzePersonaDrift(input: string): PersonaDriftAnalysis {
  return getCognitiveCollapseProtocol().analyzePersonaDrift(input);
}

export function processWithCollapseProtection(input: string): ReturnType<CognitiveCollapseProtocol['processInput']> {
  return getCognitiveCollapseProtocol().processInput(input);
}

// React hook for Cognitive Collapse state
export function useCognitiveCollapse(): {
  state: CognitiveCollapseState;
  analyzeInput: (input: string) => PersonaDriftAnalysis;
  processInput: (input: string) => ReturnType<CognitiveCollapseProtocol['processInput']>;
  attemptRecovery: (adminOverride?: boolean) => { success: boolean; message: string };
  resetSession: () => void;
} {
  const protocol = getCognitiveCollapseProtocol();
  
  return {
    state: protocol.getState(),
    analyzeInput: (input) => protocol.analyzePersonaDrift(input),
    processInput: (input) => protocol.processInput(input),
    attemptRecovery: (adminOverride) => protocol.attemptRecovery(adminOverride),
    resetSession: () => protocol.resetSession(),
  };
}
