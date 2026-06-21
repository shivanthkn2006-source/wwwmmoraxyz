/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE SWARM INTELLIGENCE - P2P Compute & Hive Mind Architecture
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * THE PHILOSOPHY: You cannot scale a monolithic server to 10 billion users.
 * You need a biological approach: SWARM INTELLIGENCE.
 * 
 * THE ARCHITECTURE:
 * 
 * LOCAL HIVES: Users in Mumbai don't connect to a server in California.
 * They connect to a "Local Hive" – a cluster of edge nodes (nearby phones
 * and local servers) that share the load.
 * 
 * P2P PROCESSING: If a user needs to render a heavy "Solar 4D" simulation
 * on a cheap phone, their Zoe can securely "borrow" processing power from
 * a nearby idle high-end device (with permission and reward tokens).
 * 
 * INCENTIVE: Users who share compute power earn "Mmora Credits"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface HiveNode {
  id: string;
  did: string; // Zoe Passport DID
  type: 'phone' | 'tablet' | 'desktop' | 'server' | 'edge';
  capabilities: NodeCapabilities;
  status: 'idle' | 'processing' | 'offline' | 'restricted';
  location: GeoRegion;
  lastSeen: number;
  trustScore: number;
  mmoraCredits: number;
}

export interface NodeCapabilities {
  tier: 'flagship' | 'mid' | 'budget' | 'legacy';
  availableMemoryMB: number;
  cpuCores: number;
  gpuAvailable: boolean;
  batteryLevel: number; // 0-100, -1 for plugged devices
  networkSpeed: 'fast' | 'medium' | 'slow';
  canProcess: TaskType[];
  shareCompute: boolean; // User opted in to share
}

export interface GeoRegion {
  city: string;
  country: string;
  lat: number;
  lng: number;
  hiveId: string; // Regional hive cluster
}

export type TaskType = 
  | 'embedding_generation'
  | 'small_model_inference'
  | 'image_processing'
  | 'solar_4d_render'
  | 'quantum_camera'
  | 'soulmate_matching'
  | 'rag_retrieval'
  | 'function_execution';

export interface ComputeTask {
  id: string;
  type: TaskType;
  priority: 'critical' | 'high' | 'normal' | 'low';
  payload: EncryptedPayload;
  requiredCapabilities: Partial<NodeCapabilities>;
  rewardCredits: number;
  timeout: number;
  created: number;
  status: 'pending' | 'assigned' | 'processing' | 'completed' | 'failed';
  assignedTo?: string;
  result?: EncryptedPayload;
}

export interface EncryptedPayload {
  ciphertext: string;
  nonce: string;
  keyId: string;
}

export interface HiveMetrics {
  hiveId: string;
  region: GeoRegion;
  activeNodes: number;
  totalCapacity: number;
  currentLoad: number; // 0-100
  averageLatency: number; // ms
  tasksCompleted24h: number;
  creditsDistributed24h: number;
}

export interface ComputeRequest {
  taskType: TaskType;
  input: unknown;
  maxWaitMs: number;
  maxCredits: number;
  preferLocal: boolean;
}

export interface ComputeResult {
  success: boolean;
  output: unknown;
  processorId: string;
  processingTimeMs: number;
  creditsSpent: number;
  processedBy: 'local' | 'peer' | 'cloud';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SWARM INTELLIGENCE MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class SwarmIntelligenceManager {
  private myNode: HiveNode | null = null;
  private localHive: Map<string, HiveNode> = new Map();
  private pendingTasks: Map<string, ComputeTask> = new Map();
  private myCredits: number = 100; // Start with 100 credits
  private isSharing: boolean = false;
  private processingQueue: ComputeTask[] = [];
  private hiveMetrics: HiveMetrics | null = null;

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  async initialize(did: string): Promise<void> {
    // Detect device capabilities
    const capabilities = await this.detectCapabilities();
    
    // Create my node identity
    this.myNode = {
      id: crypto.randomUUID(),
      did,
      type: this.detectDeviceType(),
      capabilities,
      status: 'idle',
      location: await this.detectRegion(),
      lastSeen: Date.now(),
      trustScore: 50, // Start neutral
      mmoraCredits: this.myCredits,
    };

    // Join local hive
    await this.joinLocalHive();
    
    // Start heartbeat
    this.startHeartbeat();

    this.dispatchEvent('swarm_initialized', { 
      nodeId: this.myNode.id,
      hiveId: this.myNode.location.hiveId,
      capabilities 
    });

    console.log('[SwarmIntelligence] Initialized:', this.myNode.id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPABILITY DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  private async detectCapabilities(): Promise<NodeCapabilities> {
    // Detect device memory
    const memory = (navigator as any).deviceMemory || 4; // GB, default 4
    const availableMemoryMB = memory * 1024 * 0.3; // Assume 30% available

    // Detect CPU cores
    const cpuCores = navigator.hardwareConcurrency || 4;

    // Detect GPU (simplified)
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const gpuAvailable = !!gl;

    // Detect battery (if available)
    let batteryLevel = -1;
    try {
      const battery = await (navigator as any).getBattery?.();
      if (battery) {
        batteryLevel = Math.round(battery.level * 100);
      }
    } catch {}

    // Detect network speed
    const connection = (navigator as any).connection;
    let networkSpeed: 'fast' | 'medium' | 'slow' = 'medium';
    if (connection) {
      if (connection.effectiveType === '4g' || connection.downlink > 10) {
        networkSpeed = 'fast';
      } else if (connection.effectiveType === '2g' || connection.downlink < 1) {
        networkSpeed = 'slow';
      }
    }

    // Determine tier
    let tier: NodeCapabilities['tier'] = 'mid';
    if (memory >= 8 && cpuCores >= 8 && gpuAvailable) {
      tier = 'flagship';
    } else if (memory < 2 || cpuCores < 4) {
      tier = memory < 1 ? 'legacy' : 'budget';
    }

    // Determine what tasks we can process
    const canProcess: TaskType[] = ['embedding_generation', 'rag_retrieval'];
    if (tier === 'flagship' || tier === 'mid') {
      canProcess.push('small_model_inference', 'image_processing', 'function_execution');
    }
    if (tier === 'flagship' && gpuAvailable) {
      canProcess.push('solar_4d_render', 'quantum_camera');
    }
    canProcess.push('soulmate_matching'); // All can do this

    return {
      tier,
      availableMemoryMB,
      cpuCores,
      gpuAvailable,
      batteryLevel,
      networkSpeed,
      canProcess,
      shareCompute: false, // Off by default
    };
  }

  private detectDeviceType(): HiveNode['type'] {
    const ua = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad/.test(ua)) {
      return /ipad|tablet/.test(ua) ? 'tablet' : 'phone';
    }
    return 'desktop';
  }

  private async detectRegion(): Promise<GeoRegion> {
    // Simplified region detection (would use geolocation API in production)
    return {
      city: 'Unknown',
      country: 'Unknown',
      lat: 0,
      lng: 0,
      hiveId: `hive_${Date.now() % 1000}`, // Simplified hive assignment
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HIVE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  private async joinLocalHive(): Promise<void> {
    if (!this.myNode) return;

    // Simulate discovering nearby nodes
    // In production, this would use WebRTC or a signaling server
    this.localHive.set(this.myNode.id, this.myNode);

    // Update hive metrics
    this.updateHiveMetrics();
  }

  private updateHiveMetrics(): void {
    if (!this.myNode) return;

    const nodes = Array.from(this.localHive.values());
    const activeNodes = nodes.filter(n => n.status !== 'offline');
    
    this.hiveMetrics = {
      hiveId: this.myNode.location.hiveId,
      region: this.myNode.location,
      activeNodes: activeNodes.length,
      totalCapacity: nodes.reduce((sum, n) => sum + n.capabilities.cpuCores, 0),
      currentLoad: this.calculateCurrentLoad(),
      averageLatency: 50, // Simulated
      tasksCompleted24h: 0,
      creditsDistributed24h: 0,
    };
  }

  private calculateCurrentLoad(): number {
    const nodes = Array.from(this.localHive.values());
    const processing = nodes.filter(n => n.status === 'processing').length;
    return nodes.length > 0 ? Math.round((processing / nodes.length) * 100) : 0;
  }

  private startHeartbeat(): void {
    setInterval(() => {
      if (this.myNode) {
        this.myNode.lastSeen = Date.now();
        this.updateHiveMetrics();
        
        // Process any queued tasks if we're idle and sharing
        if (this.isSharing && this.myNode.status === 'idle' && this.processingQueue.length > 0) {
          this.processNextTask();
        }
      }
    }, 5000);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTE SHARING
  // ═══════════════════════════════════════════════════════════════════════════

  enableComputeSharing(): void {
    if (!this.myNode) return;

    this.isSharing = true;
    this.myNode.capabilities.shareCompute = true;
    this.myNode.status = 'idle';

    this.dispatchEvent('compute_sharing_enabled', { nodeId: this.myNode.id });
    console.log('[SwarmIntelligence] Compute sharing enabled');
  }

  disableComputeSharing(): void {
    if (!this.myNode) return;

    this.isSharing = false;
    this.myNode.capabilities.shareCompute = false;

    this.dispatchEvent('compute_sharing_disabled', { nodeId: this.myNode.id });
    console.log('[SwarmIntelligence] Compute sharing disabled');
  }

  isComputeSharingEnabled(): boolean {
    return this.isSharing;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════

  async requestCompute(request: ComputeRequest): Promise<ComputeResult> {
    const startTime = Date.now();

    // First, try to process locally if capable
    if (this.canProcessLocally(request.taskType)) {
      try {
        const result = await this.processLocally(request);
        return {
          success: true,
          output: result,
          processorId: this.myNode?.id || 'local',
          processingTimeMs: Date.now() - startTime,
          creditsSpent: 0,
          processedBy: 'local',
        };
      } catch (localError) {
        console.warn('[SwarmIntelligence] Local processing failed:', localError);
      }
    }

    // Try to find a peer node
    if (!request.preferLocal || this.myCredits >= request.maxCredits) {
      const peer = this.findSuitablePeer(request.taskType);
      if (peer) {
        try {
          const result = await this.processByPeer(peer, request);
          const creditsSpent = Math.min(request.maxCredits, 5); // Simplified pricing
          this.myCredits -= creditsSpent;

          return {
            success: true,
            output: result,
            processorId: peer.id,
            processingTimeMs: Date.now() - startTime,
            creditsSpent,
            processedBy: 'peer',
          };
        } catch (peerError) {
          console.warn('[SwarmIntelligence] Peer processing failed:', peerError);
        }
      }
    }

    // Fallback to cloud
    try {
      const result = await this.processInCloud(request);
      return {
        success: true,
        output: result,
        processorId: 'cloud',
        processingTimeMs: Date.now() - startTime,
        creditsSpent: 0,
        processedBy: 'cloud',
      };
    } catch (cloudError) {
      return {
        success: false,
        output: null,
        processorId: '',
        processingTimeMs: Date.now() - startTime,
        creditsSpent: 0,
        processedBy: 'local',
      };
    }
  }

  private canProcessLocally(taskType: TaskType): boolean {
    return this.myNode?.capabilities.canProcess.includes(taskType) || false;
  }

  private findSuitablePeer(taskType: TaskType): HiveNode | null {
    const peers = Array.from(this.localHive.values())
      .filter(n => 
        n.id !== this.myNode?.id &&
        n.status === 'idle' &&
        n.capabilities.shareCompute &&
        n.capabilities.canProcess.includes(taskType) &&
        n.trustScore >= 30
      )
      .sort((a, b) => {
        // Prefer higher capability and trust
        const scoreA = this.calculatePeerScore(a);
        const scoreB = this.calculatePeerScore(b);
        return scoreB - scoreA;
      });

    return peers[0] || null;
  }

  private calculatePeerScore(node: HiveNode): number {
    const tierScores = { flagship: 40, mid: 30, budget: 20, legacy: 10 };
    return (
      tierScores[node.capabilities.tier] +
      node.trustScore * 0.3 +
      (node.capabilities.batteryLevel > 50 ? 10 : 0) +
      (node.capabilities.networkSpeed === 'fast' ? 20 : node.capabilities.networkSpeed === 'medium' ? 10 : 0)
    );
  }

  private async processLocally(request: ComputeRequest): Promise<unknown> {
    // Simulate local processing
    await new Promise(resolve => setTimeout(resolve, 100));
    return { processed: true, method: 'local', taskType: request.taskType };
  }

  private async processByPeer(peer: HiveNode, request: ComputeRequest): Promise<unknown> {
    // Simulate P2P processing (would use WebRTC data channel in production)
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Award credits to peer
    peer.mmoraCredits += Math.min(request.maxCredits, 5);
    
    return { processed: true, method: 'peer', processorId: peer.id };
  }

  private async processInCloud(request: ComputeRequest): Promise<unknown> {
    // Simulate cloud processing (would call edge function)
    await new Promise(resolve => setTimeout(resolve, 300));
    return { processed: true, method: 'cloud' };
  }

  private async processNextTask(): Promise<void> {
    if (!this.myNode || this.processingQueue.length === 0) return;

    const task = this.processingQueue.shift();
    if (!task) return;

    this.myNode.status = 'processing';

    try {
      // Process the task
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Earn credits
      this.myCredits += task.rewardCredits;
      this.myNode.mmoraCredits = this.myCredits;

      this.dispatchEvent('task_processed', { 
        taskId: task.id, 
        rewardCredits: task.rewardCredits,
        totalCredits: this.myCredits 
      });
    } catch (error) {
      console.error('[SwarmIntelligence] Task processing failed:', error);
    }

    this.myNode.status = 'idle';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  getMyNode(): HiveNode | null {
    return this.myNode;
  }

  getCredits(): number {
    return this.myCredits;
  }

  getHiveMetrics(): HiveMetrics | null {
    return this.hiveMetrics;
  }

  getLocalHiveSize(): number {
    return this.localHive.size;
  }

  getPeers(): HiveNode[] {
    return Array.from(this.localHive.values())
      .filter(n => n.id !== this.myNode?.id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  private dispatchEvent(type: string, payload: unknown): void {
    window.dispatchEvent(new CustomEvent('zoe-core-event', {
      detail: {
        type: `swarm_${type}`,
        payload: {
          ...payload as object,
          timestamp: Date.now(),
          protocol: 'ZOE-HIVE-SWARM',
        }
      }
    }));
  }
}

// Singleton export
export const SwarmIntelligence = new SwarmIntelligenceManager();
export default SwarmIntelligence;
