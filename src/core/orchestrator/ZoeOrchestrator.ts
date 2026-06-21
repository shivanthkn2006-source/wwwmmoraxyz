// ═══════════════════════════════════════════════════════════════════════════════
// ZOE ORCHESTRATOR - The "Router" Protocol
// Based on Anthropic's Agent Architecture: Split into Workflow + Agent
// Prevents browser crashes by routing 90% of tasks to hard-coded workflows
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ORCHESTRATOR PATTERN (Anthropic Model):
 * 
 * Zoe-Router (Lightweight) → Decides: Is this simple or complex?
 *    ├─ SIMPLE (90%) → Zoe-Navigator (Workflow) → Hard-coded, 0ms latency
 *    └─ COMPLEX (10%) → Zoe-Oracle (Heavy AI) → Full reasoning power
 * 
 * Result: No browser crashes, faster responses, smarter when it matters
 */

export type TaskComplexity = 'simple' | 'complex';
export type TaskCategory = 'navigation' | 'search' | 'ui_action' | 'data_query' | 'ai_reasoning' | 'creative' | 'quantum';

export interface RoutingDecision {
  complexity: TaskComplexity;
  category: TaskCategory;
  handler: 'navigator' | 'oracle';
  confidence: number;
  shouldCache: boolean;
  estimatedLatency: 'instant' | 'fast' | 'slow';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIMPLE TASK PATTERNS - These NEVER wake up the heavy AI
// ═══════════════════════════════════════════════════════════════════════════════

const SIMPLE_TASK_PATTERNS: Record<string, { regex: RegExp; category: TaskCategory }[]> = {
  navigation: [
    { regex: /^(go to|open|show|navigate to|take me to)\s+(home|profile|chat|huddle|settings|camera|map|selfie city)/i, category: 'navigation' },
    { regex: /^(back|forward|return)/i, category: 'navigation' },
    { regex: /^switch to\s+\w+/i, category: 'navigation' },
  ],
  ui_action: [
    { regex: /^(scroll|zoom|pan|rotate|flip|toggle|minimize|maximize|close|open)/i, category: 'ui_action' },
    { regex: /^(dark mode|light mode|theme)/i, category: 'ui_action' },
    { regex: /^(mute|unmute|volume|sound)/i, category: 'ui_action' },
  ],
  search: [
    { regex: /^(find|search for|look for|where is)\s+\w{1,20}$/i, category: 'search' },
    { regex: /^search\s+\w+$/i, category: 'search' },
  ],
  data_query: [
    { regex: /^(what time|what date|weather|temperature)/i, category: 'data_query' },
    { regex: /^(how many|count|total|sum)/i, category: 'data_query' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLEX TASK PATTERNS - These REQUIRE the heavy AI (Zoe-Oracle)
// ═══════════════════════════════════════════════════════════════════════════════

const COMPLEX_TASK_PATTERNS: { regex: RegExp; category: TaskCategory }[] = [
  // AI Reasoning
  { regex: /^(analyze|explain|why|how does|what if|predict|suggest|recommend)/i, category: 'ai_reasoning' },
  { regex: /^(help me|i need|can you|figure out|understand)/i, category: 'ai_reasoning' },
  
  // Creative tasks
  { regex: /^(create|generate|write|compose|design|imagine)/i, category: 'creative' },
  { regex: /^(make|build|craft) (a|an|the|some)/i, category: 'creative' },
  
  // Quantum/Astrology/Soul tasks
  { regex: /^(my destiny|my karma|my soul|my life path)/i, category: 'quantum' },
  { regex: /^(anka|vastu|nadi|astro|star|zodiac|horoscope)/i, category: 'quantum' },
  { regex: /^(career divinity|soul codex|phoenix)/i, category: 'quantum' },
  
  // Long/complex queries (>50 chars usually means complex intent)
  { regex: /.{50,}/i, category: 'ai_reasoning' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ZOE-ROUTER: The Lightweight Decision Maker
// ═══════════════════════════════════════════════════════════════════════════════

export class ZoeRouter {
  private static instance: ZoeRouter;
  private routingCache = new Map<string, RoutingDecision>();
  private cacheMaxSize = 100;
  
  static getInstance(): ZoeRouter {
    if (!ZoeRouter.instance) {
      ZoeRouter.instance = new ZoeRouter();
    }
    return ZoeRouter.instance;
  }
  
  /**
   * Route a command to the appropriate handler
   * This is the FIRST thing that runs - must be ultra-fast
   */
  route(command: string): RoutingDecision {
    const normalizedCommand = command.trim().toLowerCase();
    
    // Check cache first (O(1) lookup)
    const cached = this.routingCache.get(normalizedCommand);
    if (cached) {
      console.log('[ZoeRouter] Cache hit:', normalizedCommand.slice(0, 30));
      return cached;
    }
    
    // Check simple patterns first (should match 90% of commands)
    for (const [_, patterns] of Object.entries(SIMPLE_TASK_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.regex.test(normalizedCommand)) {
          const decision: RoutingDecision = {
            complexity: 'simple',
            category: pattern.category,
            handler: 'navigator',
            confidence: 0.95,
            shouldCache: true,
            estimatedLatency: 'instant',
          };
          this.cacheDecision(normalizedCommand, decision);
          console.log(`[ZoeRouter] SIMPLE task → Navigator:`, pattern.category);
          return decision;
        }
      }
    }
    
    // Check complex patterns
    for (const pattern of COMPLEX_TASK_PATTERNS) {
      if (pattern.regex.test(normalizedCommand)) {
        const decision: RoutingDecision = {
          complexity: 'complex',
          category: pattern.category,
          handler: 'oracle',
          confidence: 0.85,
          shouldCache: pattern.category !== 'creative', // Don't cache creative tasks
          estimatedLatency: pattern.category === 'quantum' ? 'slow' : 'fast',
        };
        if (decision.shouldCache) {
          this.cacheDecision(normalizedCommand, decision);
        }
        console.log(`[ZoeRouter] COMPLEX task → Oracle:`, pattern.category);
        return decision;
      }
    }
    
    // Default to Oracle for ambiguous commands (safe fallback)
    const defaultDecision: RoutingDecision = {
      complexity: 'complex',
      category: 'ai_reasoning',
      handler: 'oracle',
      confidence: 0.5,
      shouldCache: false,
      estimatedLatency: 'fast',
    };
    console.log('[ZoeRouter] Ambiguous task → Oracle (default)');
    return defaultDecision;
  }
  
  /**
   * Cache a routing decision for faster future lookups
   */
  private cacheDecision(command: string, decision: RoutingDecision): void {
    // Evict oldest entries if cache is full
    if (this.routingCache.size >= this.cacheMaxSize) {
      const firstKey = this.routingCache.keys().next().value;
      if (firstKey) this.routingCache.delete(firstKey);
    }
    this.routingCache.set(command, decision);
  }
  
  /**
   * Clear the routing cache (for testing/reset)
   */
  clearCache(): void {
    this.routingCache.clear();
  }
  
  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.routingCache.size,
      maxSize: this.cacheMaxSize,
      hitRate: 0, // Would need to track hits/misses for real hitRate
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZOE-NAVIGATOR: Hard-coded Workflows (0ms latency, 0 cost)
// ═══════════════════════════════════════════════════════════════════════════════

export class ZoeNavigator {
  private static instance: ZoeNavigator;
  
  static getInstance(): ZoeNavigator {
    if (!ZoeNavigator.instance) {
      ZoeNavigator.instance = new ZoeNavigator();
    }
    return ZoeNavigator.instance;
  }
  
  /**
   * Execute a simple workflow - NO AI CALLS
   */
  execute(command: string, category: TaskCategory): NavigatorResult {
    const startTime = performance.now();
    
    switch (category) {
      case 'navigation':
        return this.handleNavigation(command, startTime);
      case 'ui_action':
        return this.handleUIAction(command, startTime);
      case 'search':
        return this.handleSearch(command, startTime);
      case 'data_query':
        return this.handleDataQuery(command, startTime);
      default:
        return {
          success: false,
          message: 'Unknown workflow category',
          latencyMs: performance.now() - startTime,
        };
    }
  }
  
  private handleNavigation(command: string, startTime: number): NavigatorResult {
    const routes: Record<string, string> = {
      'home': '/home',
      'profile': '/profile',
      'chat': '/chat',
      'huddle': '/huddle',
      'settings': '/profile',
      'camera': '/camera',
      'map': '/selfie-city',
      'selfie city': '/selfie-city',
      'universe': '/universal-timeline',
      'timeline': '/universal-timeline',
      'zoe': '/zoe-ai',
    };
    
    const lowerCommand = command.toLowerCase();
    for (const [key, route] of Object.entries(routes)) {
      if (lowerCommand.includes(key)) {
        // Dispatch navigation event
        window.dispatchEvent(new CustomEvent('zoe-navigate', { detail: { route } }));
        return {
          success: true,
          message: `Navigating to ${key}`,
          action: { type: 'navigate', route },
          latencyMs: performance.now() - startTime,
        };
      }
    }
    
    return {
      success: false,
      message: 'Route not found',
      latencyMs: performance.now() - startTime,
    };
  }
  
  private handleUIAction(command: string, startTime: number): NavigatorResult {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('dark mode')) {
      window.dispatchEvent(new CustomEvent('zoe-theme', { detail: { theme: 'dark' } }));
      return { success: true, message: 'Switching to dark mode', latencyMs: performance.now() - startTime };
    }
    
    if (lowerCommand.includes('light mode')) {
      window.dispatchEvent(new CustomEvent('zoe-theme', { detail: { theme: 'light' } }));
      return { success: true, message: 'Switching to light mode', latencyMs: performance.now() - startTime };
    }
    
    if (lowerCommand.includes('mute')) {
      window.dispatchEvent(new CustomEvent('zoe-audio', { detail: { muted: true } }));
      return { success: true, message: 'Audio muted', latencyMs: performance.now() - startTime };
    }
    
    if (lowerCommand.includes('unmute')) {
      window.dispatchEvent(new CustomEvent('zoe-audio', { detail: { muted: false } }));
      return { success: true, message: 'Audio unmuted', latencyMs: performance.now() - startTime };
    }
    
    if (lowerCommand.includes('scroll')) {
      const direction = lowerCommand.includes('up') ? 'up' : 'down';
      window.dispatchEvent(new CustomEvent('zoe-scroll', { detail: { direction } }));
      return { success: true, message: `Scrolling ${direction}`, latencyMs: performance.now() - startTime };
    }
    
    return {
      success: true,
      message: 'UI action executed',
      latencyMs: performance.now() - startTime,
    };
  }
  
  private handleSearch(command: string, startTime: number): NavigatorResult {
    // Extract search term
    const searchMatch = command.match(/(?:find|search for|look for|search)\s+(.+)/i);
    const searchTerm = searchMatch ? searchMatch[1].trim() : '';
    
    if (searchTerm) {
      window.dispatchEvent(new CustomEvent('zoe-search', { detail: { query: searchTerm } }));
      return {
        success: true,
        message: `Searching for "${searchTerm}"`,
        action: { type: 'search', query: searchTerm },
        latencyMs: performance.now() - startTime,
      };
    }
    
    return {
      success: false,
      message: 'No search term provided',
      latencyMs: performance.now() - startTime,
    };
  }
  
  private handleDataQuery(command: string, startTime: number): NavigatorResult {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('time') || lowerCommand.includes('date')) {
      const now = new Date();
      return {
        success: true,
        message: `It's ${now.toLocaleTimeString()} on ${now.toLocaleDateString()}`,
        data: { time: now.toISOString() },
        latencyMs: performance.now() - startTime,
      };
    }
    
    // Weather would require API call - delegate to Oracle
    if (lowerCommand.includes('weather')) {
      return {
        success: false,
        message: 'Weather query requires Oracle',
        delegateToOracle: true,
        latencyMs: performance.now() - startTime,
      };
    }
    
    return {
      success: true,
      message: 'Query processed',
      latencyMs: performance.now() - startTime,
    };
  }
}

export interface NavigatorResult {
  success: boolean;
  message: string;
  action?: { type: string; [key: string]: any };
  data?: Record<string, any>;
  delegateToOracle?: boolean;
  latencyMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZOE-ORACLE: Heavy AI Processing (Only for Complex Tasks)
// ═══════════════════════════════════════════════════════════════════════════════

export class ZoeOracle {
  private static instance: ZoeOracle;
  private processingQueue: string[] = [];
  private maxConcurrent = 2; // Prevent browser crashes
  private activeRequests = 0;
  
  static getInstance(): ZoeOracle {
    if (!ZoeOracle.instance) {
      ZoeOracle.instance = new ZoeOracle();
    }
    return ZoeOracle.instance;
  }
  
  /**
   * Process a complex task with full AI reasoning
   * This is the HEAVY function - only call when necessary
   */
  async process(command: string, category: TaskCategory, context?: Record<string, any>): Promise<OracleResult> {
    const startTime = performance.now();
    
    // Queue management to prevent browser crashes
    if (this.activeRequests >= this.maxConcurrent) {
      console.warn('[ZoeOracle] Max concurrent requests reached, queueing...');
      await this.waitForSlot();
    }
    
    this.activeRequests++;
    
    try {
      console.log(`[ZoeOracle] Processing ${category} task:`, command.slice(0, 50));
      
      // Different processing paths based on category
      switch (category) {
        case 'quantum':
          return await this.processQuantum(command, context, startTime);
        case 'creative':
          return await this.processCreative(command, context, startTime);
        case 'ai_reasoning':
        default:
          return await this.processReasoning(command, context, startTime);
      }
    } finally {
      this.activeRequests--;
    }
  }
  
  private async processQuantum(command: string, context: any, startTime: number): Promise<OracleResult> {
    // Dispatch to specialized quantum processing
    window.dispatchEvent(new CustomEvent('zoe-quantum-request', { 
      detail: { command, context } 
    }));
    
    return {
      success: true,
      message: 'Quantum processing initiated',
      processingType: 'quantum',
      requiresFollowUp: true,
      latencyMs: performance.now() - startTime,
    };
  }
  
  private async processCreative(command: string, context: any, startTime: number): Promise<OracleResult> {
    // Dispatch to creative processing (Pentarchy Swarm)
    window.dispatchEvent(new CustomEvent('zoe-creative-request', { 
      detail: { command, context } 
    }));
    
    return {
      success: true,
      message: 'Creative processing initiated',
      processingType: 'creative',
      requiresFollowUp: true,
      latencyMs: performance.now() - startTime,
    };
  }
  
  private async processReasoning(command: string, context: any, startTime: number): Promise<OracleResult> {
    // Dispatch to Chain of Thought processing
    window.dispatchEvent(new CustomEvent('zoe-reasoning-request', { 
      detail: { command, context } 
    }));
    
    return {
      success: true,
      message: 'Reasoning in progress',
      processingType: 'reasoning',
      requiresFollowUp: true,
      latencyMs: performance.now() - startTime,
    };
  }
  
  private waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = setInterval(() => {
        if (this.activeRequests < this.maxConcurrent) {
          clearInterval(checkSlot);
          resolve();
        }
      }, 100);
    });
  }
  
  /**
   * Get Oracle status
   */
  getStatus(): { activeRequests: number; maxConcurrent: number; queueLength: number } {
    return {
      activeRequests: this.activeRequests,
      maxConcurrent: this.maxConcurrent,
      queueLength: this.processingQueue.length,
    };
  }
}

export interface OracleResult {
  success: boolean;
  message: string;
  processingType: 'quantum' | 'creative' | 'reasoning';
  requiresFollowUp: boolean;
  data?: Record<string, any>;
  latencyMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR - Unified Entry Point
// ═══════════════════════════════════════════════════════════════════════════════

export class ZoeOrchestrator {
  private router = ZoeRouter.getInstance();
  private navigator = ZoeNavigator.getInstance();
  private oracle = ZoeOracle.getInstance();
  
  private static instance: ZoeOrchestrator;
  
  static getInstance(): ZoeOrchestrator {
    if (!ZoeOrchestrator.instance) {
      ZoeOrchestrator.instance = new ZoeOrchestrator();
    }
    return ZoeOrchestrator.instance;
  }
  
  /**
   * Process any command through the Orchestrator
   * This is THE entry point for all Zoe commands
   */
  async process(command: string, context?: Record<string, any>): Promise<OrchestratorResult> {
    const overallStart = performance.now();
    
    // Step 1: Route the command (ultra-fast)
    const routing = this.router.route(command);
    
    // Step 2: Execute via appropriate handler
    let result: NavigatorResult | OracleResult;
    
    if (routing.handler === 'navigator') {
      result = this.navigator.execute(command, routing.category);
      
      // Check if Navigator needs to delegate to Oracle
      if ('delegateToOracle' in result && result.delegateToOracle) {
        result = await this.oracle.process(command, routing.category, context);
      }
    } else {
      result = await this.oracle.process(command, routing.category, context);
    }
    
    const totalLatency = performance.now() - overallStart;
    
    console.log(`[ZoeOrchestrator] Completed in ${totalLatency.toFixed(2)}ms via ${routing.handler}`);
    
    return {
      ...result,
      routing,
      totalLatencyMs: totalLatency,
    };
  }
  
  /**
   * Get full orchestrator status
   */
  getStatus(): {
    router: ReturnType<ZoeRouter['getCacheStats']>;
    oracle: ReturnType<ZoeOracle['getStatus']>;
    isHealthy: boolean;
  } {
    const oracleStatus = this.oracle.getStatus();
    return {
      router: this.router.getCacheStats(),
      oracle: oracleStatus,
      isHealthy: oracleStatus.activeRequests < oracleStatus.maxConcurrent,
    };
  }
}

export interface OrchestratorResult extends NavigatorResult {
  routing: RoutingDecision;
  totalLatencyMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const zoeOrchestrator = ZoeOrchestrator.getInstance();
export const zoeRouter = ZoeRouter.getInstance();
export const zoeNavigator = ZoeNavigator.getInstance();
export const zoeOracle = ZoeOracle.getInstance();

console.log('[ZOE ORCHESTRATOR] Initialized - Router/Navigator/Oracle pattern active');
