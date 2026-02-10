/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * M'MORA ZOE — AGENT BASE CLASS
 * Foundation for all specialized agents in the platform
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface AgentConfig {
  name: string;
  capabilities: string[];
  temperature?: number;
  maxTokens?: number;
}

export interface AgentContext {
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export abstract class AgentBase {
  protected name: string;
  protected capabilities: string[];
  protected temperature: number;
  protected maxTokens: number;
  protected isActive: boolean = false;

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.capabilities = config.capabilities;
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 2048;
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<boolean> {
    console.log(`[${this.name}] Initializing agent...`);
    this.isActive = true;
    return true;
  }

  /**
   * Shutdown the agent gracefully
   */
  async shutdown(): Promise<void> {
    console.log(`[${this.name}] Shutting down...`);
    this.isActive = false;
  }

  /**
   * Check if agent has a specific capability
   */
  hasCapability(capability: string): boolean {
    return this.capabilities.includes(capability);
  }

  /**
   * Get agent status
   */
  getStatus(): { name: string; active: boolean; capabilities: string[] } {
    return {
      name: this.name,
      active: this.isActive,
      capabilities: this.capabilities,
    };
  }

  /**
   * Abstract method for processing - must be implemented by subclasses
   */
  abstract process(input: string, context?: AgentContext): Promise<unknown>;

  /**
   * Get system prompt for the agent - override in subclasses
   */
  protected getSystemPrompt(): string {
    return `You are ${this.name}, a specialized AI agent.`;
  }
}
