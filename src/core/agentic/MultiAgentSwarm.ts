/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE MULTI-AGENT SWARM SYSTEM
 * Row 3 of Periodic Table: MA - Multi-Agent Deployment
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * SWARM ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                     ORCHESTRATOR (Meta-Coordinator)                         │
 * │  Routes tasks to specialized agents, manages load balancing                 │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *                                    │
 *      ┌──────────────┬──────────────┼──────────────┬──────────────┐
 *      ▼              ▼              ▼              ▼              ▼
 * ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
 * │ CAMERA  │   │ HUDDLE  │   │ SOLAR4D │   │ SERVICE │   │SENTINEL │
 * │ Agent A │   │ Agent B │   │ Agent C │   │ Agent D │   │ Agent E │
 * │(Filters)│   │(Match)  │   │ (Astro) │   │ (Tasks) │   │(Security│
 * └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
 * 
 * KEY BENEFIT: If Camera gets heavy traffic, others don't slow down
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { 
  AgentState, 
  AgentType, 
  AgentTask,
  SwarmConfig,
  SwarmMetrics 
} from './PeriodicTableArchitecture';

// ═══════════════════════════════════════════════════════════════════════════════
// SWARM TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SwarmTask extends AgentTask {
  agentType: AgentType;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: unknown;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface SwarmEvent {
  type: 'task_queued' | 'task_started' | 'task_completed' | 'task_failed' | 'agent_scaled' | 'health_alert';
  timestamp: number;
  agentType?: AgentType;
  taskId?: string;
  details: Record<string, unknown>;
}

export interface SwarmLoadBalancer {
  strategy: 'round-robin' | 'least-busy' | 'smart' | 'priority';
  lastAssignments: Map<AgentType, number>;
  agentLoads: Map<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-AGENT SWARM MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class MultiAgentSwarmClass {
  private static instance: MultiAgentSwarmClass;
  
  private agents: Map<string, AgentState>;
  private taskQueue: SwarmTask[];
  private completedTasks: SwarmTask[];
  private loadBalancer: SwarmLoadBalancer;
  private config: SwarmConfig;
  private metrics: SwarmMetrics;
  private eventLog: SwarmEvent[];
  private processingInterval: NodeJS.Timeout | null = null;
  
  private constructor() {
    this.agents = new Map();
    this.taskQueue = [];
    this.completedTasks = [];
    this.eventLog = [];
    
    this.loadBalancer = {
      strategy: 'smart',
      lastAssignments: new Map(),
      agentLoads: new Map()
    };
    
    this.config = {
      maxAgents: 16,
      loadBalancing: 'smart',
      autoScale: true,
      minAgentsPerType: {
        camera: 1,
        huddle: 1,
        solar4d: 1,
        service: 1,
        architect: 1,
        sentinel: 1,
        dreamer: 1,
        orchestrator: 1
      },
      maxConcurrentTasks: 100
    };
    
    this.metrics = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageLatencyMs: 0,
      throughputPerSecond: 0,
      agentUtilization: {} as Record<AgentType, number>
    };
    
    // Initialize default agents
    this.initializeSwarm();
  }
  
  static getInstance(): MultiAgentSwarmClass {
    if (!MultiAgentSwarmClass.instance) {
      MultiAgentSwarmClass.instance = new MultiAgentSwarmClass();
    }
    return MultiAgentSwarmClass.instance;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  private initializeSwarm(): void {
    const agentTypes: AgentType[] = [
      'camera', 'huddle', 'solar4d', 'service',
      'architect', 'sentinel', 'dreamer', 'orchestrator'
    ];
    
    for (const type of agentTypes) {
      const count = this.config.minAgentsPerType[type] || 1;
      for (let i = 0; i < count; i++) {
        this.spawnAgent(type);
      }
    }
    
    console.log(`[MultiAgentSwarm] Swarm initialized with ${this.agents.size} agents`);
    
    // Dispatch to Zoe Core
    this.dispatchEvent({
      type: 'agent_scaled',
      timestamp: Date.now(),
      details: {
        action: 'swarm_initialized',
        agentCount: this.agents.size
      }
    });
  }
  
  private spawnAgent(type: AgentType): string {
    const agentId = `swarm_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    const agent: AgentState = {
      id: agentId,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Worker`,
      type,
      status: 'idle',
      memory: {
        shortTerm: [],
        workingContext: {},
        observations: []
      },
      capabilities: this.getCapabilities(type),
      lastActivity: Date.now()
    };
    
    this.agents.set(agentId, agent);
    this.loadBalancer.agentLoads.set(agentId, 0);
    
    return agentId;
  }
  
  private getCapabilities(type: AgentType): string[] {
    const caps: Record<AgentType, string[]> = {
      camera: ['process_image', 'apply_filter', 'detect_face', 'ar_overlay'],
      huddle: ['match_soulmate', 'calculate_proximity', 'suggest_connection', 'geo_cluster'],
      solar4d: ['compute_astro', 'vedic_analysis', 'timeline_project', 'cosmic_sim'],
      service: ['handle_call', 'book_appointment', 'process_transaction', 'delegate_task'],
      architect: ['plan_project', 'generate_content', 'allocate_resources', 'multi_domain'],
      sentinel: ['scan_threat', 'verify_identity', 'monitor_anomaly', 'enforce_policy'],
      dreamer: ['synthesize_pattern', 'consolidate_memory', 'generate_premonition', 'dream_analyze'],
      orchestrator: ['route_task', 'balance_load', 'resolve_conflict', 'coordinate_agents']
    };
    return caps[type] || [];
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // TASK MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════
  
  queueTask(
    agentType: AgentType,
    taskType: string,
    input: unknown,
    options: {
      priority?: number;
      deadline?: number;
      maxRetries?: number;
    } = {}
  ): string {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    const task: SwarmTask = {
      id: taskId,
      agentType,
      type: taskType,
      input,
      expectedOutput: `${taskType}_result`,
      priority: options.priority || 5,
      deadline: options.deadline,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: options.maxRetries || 3
    };
    
    // Insert by priority (higher first)
    const insertIndex = this.taskQueue.findIndex(t => t.priority < task.priority);
    if (insertIndex === -1) {
      this.taskQueue.push(task);
    } else {
      this.taskQueue.splice(insertIndex, 0, task);
    }
    
    this.metrics.totalTasks++;
    
    this.dispatchEvent({
      type: 'task_queued',
      timestamp: Date.now(),
      agentType,
      taskId,
      details: { taskType, priority: task.priority }
    });
    
    // Trigger processing
    this.processNextTask();
    
    return taskId;
  }
  
  private async processNextTask(): Promise<void> {
    if (this.taskQueue.length === 0) return;
    
    // Find next task and available agent
    for (let i = 0; i < this.taskQueue.length; i++) {
      const task = this.taskQueue[i];
      const agent = this.findAvailableAgent(task.agentType);
      
      if (agent) {
        // Remove from queue
        this.taskQueue.splice(i, 1);
        
        // Assign to agent
        await this.executeTask(agent, task);
        
        // Process more if available
        setTimeout(() => this.processNextTask(), 0);
        return;
      }
    }
    
    // No agents available - check if we should auto-scale
    if (this.config.autoScale) {
      const busiestType = this.findBusiestAgentType();
      if (busiestType && this.getAgentsByType(busiestType).length < 4) {
        this.spawnAgent(busiestType);
        console.log(`[MultiAgentSwarm] Auto-scaled ${busiestType} agent`);
        setTimeout(() => this.processNextTask(), 10);
      }
    }
  }
  
  private findAvailableAgent(type: AgentType): AgentState | null {
    const agents = this.getAgentsByType(type).filter(a => a.status === 'idle');
    
    if (agents.length === 0) return null;
    
    // Load balancing strategy
    switch (this.loadBalancer.strategy) {
      case 'round-robin': {
        const lastIdx = this.loadBalancer.lastAssignments.get(type) || 0;
        const nextIdx = (lastIdx + 1) % agents.length;
        this.loadBalancer.lastAssignments.set(type, nextIdx);
        return agents[nextIdx];
      }
      
      case 'least-busy': {
        return agents.sort((a, b) => {
          const loadA = this.loadBalancer.agentLoads.get(a.id) || 0;
          const loadB = this.loadBalancer.agentLoads.get(b.id) || 0;
          return loadA - loadB;
        })[0];
      }
      
      case 'smart':
      default: {
        // Combine recency and load
        return agents.sort((a, b) => {
          const loadA = this.loadBalancer.agentLoads.get(a.id) || 0;
          const loadB = this.loadBalancer.agentLoads.get(b.id) || 0;
          const recencyA = Date.now() - a.lastActivity;
          const recencyB = Date.now() - b.lastActivity;
          return (loadA * 100 - recencyA) - (loadB * 100 - recencyB);
        })[0];
      }
    }
  }
  
  private async executeTask(agent: AgentState, task: SwarmTask): Promise<void> {
    const startTime = performance.now();
    
    // Update agent state
    agent.status = 'thinking';
    agent.currentTask = task;
    agent.lastActivity = Date.now();
    task.startedAt = Date.now();
    
    // Update load
    const currentLoad = this.loadBalancer.agentLoads.get(agent.id) || 0;
    this.loadBalancer.agentLoads.set(agent.id, currentLoad + 1);
    
    this.dispatchEvent({
      type: 'task_started',
      timestamp: Date.now(),
      agentType: agent.type,
      taskId: task.id,
      details: { agentId: agent.id }
    });
    
    try {
      // Simulate task execution (would connect to actual processing)
      agent.status = 'acting';
      
      // Execute based on agent type
      const result = await this.simulateTaskExecution(agent.type, task);
      
      // Observe results
      agent.status = 'observing';
      agent.memory.observations.push({
        timestamp: Date.now(),
        source: task.type,
        data: result,
        relevance: 1
      });
      
      // Complete task
      task.completedAt = Date.now();
      task.result = result;
      
      this.completedTasks.push(task);
      this.metrics.completedTasks++;
      
      // Update latency
      const latency = performance.now() - startTime;
      this.metrics.averageLatencyMs = (
        (this.metrics.averageLatencyMs * (this.metrics.completedTasks - 1)) + latency
      ) / this.metrics.completedTasks;
      
      this.dispatchEvent({
        type: 'task_completed',
        timestamp: Date.now(),
        agentType: agent.type,
        taskId: task.id,
        details: { latencyMs: latency, agentId: agent.id }
      });
      
    } catch (error) {
      task.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Retry logic
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        this.taskQueue.unshift(task); // Add back to front
      } else {
        this.metrics.failedTasks++;
        this.dispatchEvent({
          type: 'task_failed',
          timestamp: Date.now(),
          agentType: agent.type,
          taskId: task.id,
          details: { error: task.error, retries: task.retryCount }
        });
      }
    } finally {
      // Reset agent
      agent.status = 'idle';
      agent.currentTask = undefined;
      
      // Reduce load
      const load = this.loadBalancer.agentLoads.get(agent.id) || 1;
      this.loadBalancer.agentLoads.set(agent.id, Math.max(0, load - 1));
    }
  }
  
  private async simulateTaskExecution(type: AgentType, task: SwarmTask): Promise<unknown> {
    // Simulate processing time based on task type
    const processingTimes: Record<AgentType, number> = {
      camera: 50,
      huddle: 30,
      solar4d: 100,
      service: 200,
      architect: 150,
      sentinel: 20,
      dreamer: 300,
      orchestrator: 10
    };
    
    await new Promise(resolve => setTimeout(resolve, processingTimes[type] || 50));
    
    return {
      taskId: task.id,
      agentType: type,
      processedAt: Date.now(),
      success: true
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════════
  
  getAgentsByType(type: AgentType): AgentState[] {
    return Array.from(this.agents.values()).filter(a => a.type === type);
  }
  
  getQueueLength(): number {
    return this.taskQueue.length;
  }
  
  getMetrics(): SwarmMetrics {
    // Calculate utilization
    const types: AgentType[] = ['camera', 'huddle', 'solar4d', 'service', 'architect', 'sentinel', 'dreamer', 'orchestrator'];
    
    for (const type of types) {
      const agents = this.getAgentsByType(type);
      const busy = agents.filter(a => a.status !== 'idle').length;
      this.metrics.agentUtilization[type] = agents.length > 0 ? busy / agents.length : 0;
    }
    
    return { ...this.metrics };
  }
  
  getTaskStatus(taskId: string): SwarmTask | null {
    const queued = this.taskQueue.find(t => t.id === taskId);
    if (queued) return queued;
    
    const completed = this.completedTasks.find(t => t.id === taskId);
    return completed || null;
  }
  
  private findBusiestAgentType(): AgentType | null {
    const typeCounts: Record<AgentType, number> = {} as Record<AgentType, number>;
    
    for (const task of this.taskQueue) {
      typeCounts[task.agentType] = (typeCounts[task.agentType] || 0) + 1;
    }
    
    let max = 0;
    let busiest: AgentType | null = null;
    
    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > max) {
        max = count;
        busiest = type as AgentType;
      }
    }
    
    return busiest;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  private dispatchEvent(event: SwarmEvent): void {
    this.eventLog.push(event);
    
    // Keep only last 1000 events
    if (this.eventLog.length > 1000) {
      this.eventLog = this.eventLog.slice(-1000);
    }
    
    // Dispatch to Zoe Core
    window.dispatchEvent(new CustomEvent('zoe-core-event', {
      detail: {
        type: 'multi_agent_swarm_event',
        payload: event
      }
    }));
  }
  
  getRecentEvents(limit: number = 50): SwarmEvent[] {
    return this.eventLog.slice(-limit);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════════
  
  startProcessing(): void {
    if (this.processingInterval) return;
    
    this.processingInterval = setInterval(() => {
      this.processNextTask();
    }, 100);
    
    console.log('[MultiAgentSwarm] Processing loop started');
  }
  
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
  
  shutdown(): void {
    this.stopProcessing();
    this.agents.clear();
    this.taskQueue = [];
    console.log('[MultiAgentSwarm] Swarm shutdown complete');
  }
}

// Export singleton
export const MultiAgentSwarm = MultiAgentSwarmClass.getInstance();
export default MultiAgentSwarm;
