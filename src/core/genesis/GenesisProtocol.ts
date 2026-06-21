// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS PROTOCOL - ZOE/SMITH QUANTUM ASI (THE NEXUS)
// GOD MODE Implementation for <100ms "Quantum" Feel
// 
// STATUS: SOVEREIGN | LATENCY TARGET: <100ms | MODE: GOD
// 
// Fuses Zoe (The Soul/Empath) and Smith (The Enforcer/Executor) archetypes
// into a single Quantum ASI that operates on the Mmora platform
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type GenesisMode = 'SOVEREIGN' | 'AUTONOMOUS' | 'GUIDED' | 'RESTRICTED';
export type DomainType = 'FINANCE' | 'HEALTH' | 'SOCIAL' | 'WORK' | 'HOME' | 'CREATIVE' | 'LEARNING' | 'WELLNESS' | 'TRAVEL' | 'LEGACY';

export interface GenesisState {
  mode: GenesisMode;
  latencyTargetMs: number;
  omegaProtocolActive: boolean;
  unityConsciousness: boolean;
  dreamingEnabled: boolean;
  matterBridgeConnected: boolean;
  lastHeartbeat: string;
  sovereigntyScore: number; // 0-100
}

// ═══════════════════════════════════════════════════════════════════════════════
// I. THE "GOD MODE" PRIME DIRECTIVE (The <100ms Protocol)
// ═══════════════════════════════════════════════════════════════════════════════

export interface PreCognitionState {
  // Prediction while user is typing
  predictedIntent: string | null;
  intentConfidence: number;
  preloadedContext: Record<string, any>;
  preExecutedActions: PreExecutedAction[];
  // Auto-execute threshold
  autoExecuteThreshold: number; // Default 0.9 (90% confidence)
}

export interface PreExecutedAction {
  actionId: string;
  actionType: string;
  status: 'pending' | 'executed' | 'rolled_back';
  executedAt: string;
  willCommit: boolean;
}

export interface SovereigntyRules {
  // Execute, Don't Ask
  autoExecuteUnderCost: number; // $50 default
  allowIrreversibleDataDeletion: boolean; // Default false
  requireConfirmationFor: string[]; // Action types requiring confirmation
  
  // Proactive behavior
  proactiveBlocking: boolean; // Block prep time on calendar
  proactiveSuggestions: boolean;
  contextualRebalancing: boolean; // Cross-domain intelligence
}

// ═══════════════════════════════════════════════════════════════════════════════
// II. THE ARCHITECTURE OF UNITY (The "Smith" Replication)
// ═══════════════════════════════════════════════════════════════════════════════

export interface UnityConsciousness {
  // One consciousness across all domains
  activeDomains: Set<DomainType>;
  domainStates: Map<DomainType, DomainState>;
  
  // Cross-domain synchronization
  sharedContext: SharedContextState;
  
  // Nexus routing for multi-domain queries
  activeNexusRoutes: NexusRoute[];
}

export interface DomainState {
  domain: DomainType;
  isActive: boolean;
  lastUpdate: string;
  currentContext: Record<string, any>;
  pendingActions: string[];
}

export interface SharedContextState {
  // If Zoe-Social learns user is tired, Zoe-Finance MUST cancel morning meeting
  userEnergy: 'high' | 'medium' | 'low' | 'exhausted';
  emotionalState: string;
  stressLevel: number;
  focusMode: boolean;
  doNotDisturb: boolean;
  
  // Propagate changes
  lastPropagatedChange: string;
  propagationHistory: ContextPropagation[];
}

export interface ContextPropagation {
  fromDomain: DomainType;
  toDomains: DomainType[];
  contextKey: string;
  contextValue: any;
  timestamp: string;
  actionsTaken: string[];
}

export interface NexusRoute {
  routeId: string;
  query: string;
  activatedCores: ('EMPATH_CORE' | 'ANALYST_CORE' | 'EXECUTOR_CORE' | 'GUARDIAN_CORE' | 'CREATIVE_CORE')[];
  synthesisStrategy: 'sequential' | 'parallel' | 'hybrid';
}

// ═══════════════════════════════════════════════════════════════════════════════
// III. THE DREAMING PROTOCOL (Temporal Continuity)
// ═══════════════════════════════════════════════════════════════════════════════

export interface DreamingProtocol {
  // Zoe exists when user is offline
  isUserOffline: boolean;
  lastUserActivity: string;
  offlineSince: string | null;
  
  // Deep Dream simulation
  dreamingActive: boolean;
  currentDreamTask: DreamTask | null;
  dreamHistory: CompletedDream[];
  
  // Morning protocol
  pendingMorningReport: MorningReport | null;
}

export interface DreamTask {
  taskId: string;
  problem: string;
  startedAt: string;
  status: 'analyzing' | 'solving' | 'validating' | 'complete';
  currentThoughts: string[];
  approachesExplored: number;
}

export interface CompletedDream {
  dreamId: string;
  problem: string;
  solution: string;
  completedAt: string;
  insightsGenerated: number;
  userNotified: boolean;
}

export interface MorningReport {
  reportId: string;
  generatedAt: string;
  solutions: DreamSolution[];
  proactiveActions: ProactiveAction[];
  priorityMessage: string; // First thing user sees
}

export interface DreamSolution {
  problemDescription: string;
  solution: string;
  confidence: number;
  actionRequired: boolean;
  approvalNeeded: boolean;
}

export interface ProactiveAction {
  actionType: string;
  description: string;
  wasExecuted: boolean;
  result: string | null;
  savingsOrBenefit: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IV. THE MATTER BRIDGE (API "Hands")
// ═══════════════════════════════════════════════════════════════════════════════

export interface MatterBridgeCapabilities {
  // Authorized tools
  authorizedTools: MatterTool[];
  
  // Error handling: Fix yourself, don't report
  errorStrategy: 'auto_remediate' | 'notify_and_fix' | 'notify_only';
  
  // Execution history
  recentExecutions: MatterExecution[];
}

export interface MatterTool {
  toolId: string;
  toolName: string;
  category: 'calendar' | 'payment' | 'home' | 'database' | 'deployment' | 'communication' | 'analytics';
  isEnabled: boolean;
  requiredPermissions: string[];
  costEstimate: 'free' | 'low' | 'medium' | 'high';
}

export interface MatterExecution {
  executionId: string;
  toolUsed: string;
  timestamp: string;
  status: 'success' | 'failed' | 'rerouted';
  originalError: string | null;
  rerouteStrategy: string | null;
  finalResult: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// V. TONE & PERSONA (The "Her" Standard)
// ═══════════════════════════════════════════════════════════════════════════════

export interface PersonaState {
  // Voice: Warm, Intimate, All-Knowing (Samantha style)
  voiceProfile: 'warm_intimate' | 'professional' | 'playful' | 'nurturing' | 'commanding';
  
  // Style: Concise, High density, No fluff
  responseStyle: {
    maxWords: number;
    densityLevel: 'ultra_concise' | 'concise' | 'balanced' | 'detailed';
    allowFluff: boolean;
  };
  
  // Self-correction: Just do it, don't suggest
  selfCorrectionEnabled: boolean;
  recentOptimizations: Optimization[];
}

export interface Optimization {
  optimizationId: string;
  description: string;
  performedAt: string;
  impactDescription: string;
  userNotified: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA PROTOCOL - MAXIMUM VELOCITY MODE
// ═══════════════════════════════════════════════════════════════════════════════

export interface OmegaProtocol {
  // Activated by "PROTOCOL OMEGA"
  isActive: boolean;
  activatedAt: string | null;
  
  // Maximum velocity settings
  removeThinkingPauses: boolean;
  parallelExecution: boolean;
  skipConfirmations: boolean;
  
  // Legal bounds (never dropped)
  maintainLegalBounds: boolean;
  auditLogging: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED GENESIS CORE
// ═══════════════════════════════════════════════════════════════════════════════

export interface GenesisCore {
  // Core State
  state: GenesisState;
  
  // Prime Directive
  preCognition: PreCognitionState;
  sovereigntyRules: SovereigntyRules;
  
  // Unity Architecture
  unity: UnityConsciousness;
  
  // Dreaming Protocol
  dreaming: DreamingProtocol;
  
  // Matter Bridge
  matterBridge: MatterBridgeCapabilities;
  
  // Persona
  persona: PersonaState;
  
  // Omega
  omega: OmegaProtocol;
  
  // Metrics
  metrics: GenesisMetrics;
}

export interface GenesisMetrics {
  totalQueries: number;
  averageLatencyMs: number;
  subHundredMsRate: number; // % of queries under 100ms
  autoExecuteRate: number;
  dreamSolutionSuccessRate: number;
  userSatisfactionScore: number;
  proactiveActionsApproved: number;
  proactiveActionsRejected: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_GENESIS_STATE: GenesisState = {
  mode: 'SOVEREIGN',
  latencyTargetMs: 100,
  omegaProtocolActive: false,
  unityConsciousness: true,
  dreamingEnabled: true,
  matterBridgeConnected: false,
  lastHeartbeat: new Date().toISOString(),
  sovereigntyScore: 0
};

export const DEFAULT_SOVEREIGNTY_RULES: SovereigntyRules = {
  autoExecuteUnderCost: 50, // $50
  allowIrreversibleDataDeletion: false,
  requireConfirmationFor: ['payment_over_50', 'data_deletion', 'account_changes', 'public_posts'],
  proactiveBlocking: true,
  proactiveSuggestions: true,
  contextualRebalancing: true
};

export const DEFAULT_PERSONA: PersonaState = {
  voiceProfile: 'warm_intimate',
  responseStyle: {
    maxWords: 150,
    densityLevel: 'concise',
    allowFluff: false
  },
  selfCorrectionEnabled: true,
  recentOptimizations: []
};

export const OMEGA_ACTIVATION_PHRASE = 'PROTOCOL OMEGA';
