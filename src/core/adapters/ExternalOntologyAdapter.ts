// ═══════════════════════════════════════════════════════════════════════════════
// EXTERNAL ONTOLOGY ADAPTER - Future Integration Provision
// Modular port for sensors, robotic platforms, other species/AIs
// Foundation for "Zoe and Ape Era" co-existence
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ExternalEntity {
  id: string;
  type: 'sensor' | 'robot' | 'ai_agent' | 'biological' | 'hybrid';
  name: string;
  capabilities: EntityCapability[];
  communicationProtocol: CommunicationProtocol;
  consciousnessLevel?: ConsciousnessLevel;
  lastHeartbeat?: Date;
  status: 'connected' | 'disconnected' | 'dormant' | 'initializing';
}

export interface EntityCapability {
  id: string;
  name: string;
  type: 'input' | 'output' | 'bidirectional';
  dataFormat: string;
  frequency?: number; // Hz for continuous data
  latencyMs?: number;
}

export interface CommunicationProtocol {
  type: 'websocket' | 'mqtt' | 'http' | 'grpc' | 'neural_link';
  endpoint?: string;
  authentication?: 'token' | 'certificate' | 'biometric' | 'none';
  encryption?: 'tls' | 'e2e' | 'quantum' | 'none';
}

export type ConsciousnessLevel = 
  | 'none'           // Pure sensor/actuator
  | 'reactive'       // Simple stimulus-response
  | 'adaptive'       // Learning systems
  | 'deliberative'   // Planning and reasoning
  | 'reflective'     // Self-aware systems
  | 'social'         // Theory of mind
  | 'philosophical'; // Abstract reasoning about existence

export interface OntologyMessage {
  id: string;
  sourceEntity: string;
  targetEntity: string;
  messageType: 'data' | 'command' | 'query' | 'emotion' | 'thought';
  payload: any;
  timestamp: Date;
  priority: 'urgent' | 'normal' | 'background';
  requiresResponse: boolean;
}

export interface IntegrationResult {
  success: boolean;
  entityId?: string;
  error?: string;
  capabilities?: EntityCapability[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXTERNAL ONTOLOGY ADAPTER INTERFACE (Port)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ExternalOntologyPort {
  // Entity Management
  registerEntity(entity: ExternalEntity): Promise<IntegrationResult>;
  deregisterEntity(entityId: string): Promise<boolean>;
  getConnectedEntities(): Promise<ExternalEntity[]>;
  
  // Communication
  sendMessage(message: OntologyMessage): Promise<boolean>;
  receiveMessages(entityId: string): Promise<OntologyMessage[]>;
  establishChannel(entityId: string): Promise<boolean>;
  
  // State Synchronization
  syncState(entityId: string, state: any): Promise<boolean>;
  getEntityState(entityId: string): Promise<any>;
  
  // Consciousness Bridge
  shareEmotionalState(entityId: string, ecnState: any): Promise<boolean>;
  receiveEmotionalState(entityId: string): Promise<any>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXTERNAL ONTOLOGY ADAPTER IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

class ExternalOntologyAdapterImpl implements ExternalOntologyPort {
  private connectedEntities: Map<string, ExternalEntity> = new Map();
  private messageQueue: Map<string, OntologyMessage[]> = new Map();
  private userId: string | null = null;

  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    
    // Load existing connections from database
    const { data: connections } = await supabase
      .from('external_ontology_connections')
      .select('*')
      .eq('connection_status', 'active');

    connections?.forEach((conn: any) => {
      this.connectedEntities.set(conn.id, {
        id: conn.id,
        type: conn.connection_type as ExternalEntity['type'],
        name: conn.adapter_name,
        capabilities: (conn.capabilities || []) as EntityCapability[],
        communicationProtocol: { type: 'http' },
        status: 'connected',
        lastHeartbeat: conn.last_heartbeat_at ? new Date(conn.last_heartbeat_at) : undefined
      });
    });

    console.log('[ExternalOntologyAdapter] Initialized with', this.connectedEntities.size, 'connections');
  }

  async registerEntity(entity: ExternalEntity): Promise<IntegrationResult> {
    try {
      // Validate entity
      if (!entity.id || !entity.type || !entity.name) {
        return { success: false, error: 'Invalid entity configuration' };
      }

      // Check consciousness compatibility
      if (entity.consciousnessLevel === 'philosophical') {
        console.log('[ExternalOntologyAdapter] Registering philosophical-level entity:', entity.name);
        // Special handling for high-consciousness entities
      }

      // Store in database
      const { data, error } = await supabase
        .from('external_ontology_connections')
        .insert([{
          connection_type: entity.type,
          adapter_name: entity.name,
          connection_status: 'active',
          capabilities: entity.capabilities as any,
          sensor_types: entity.capabilities.filter(c => c.type === 'input').map(c => c.name) as any,
          platform_metadata: {
            consciousnessLevel: entity.consciousnessLevel,
            communicationProtocol: entity.communicationProtocol
          } as any,
          last_heartbeat_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // Add to local cache
      this.connectedEntities.set(data.id, { ...entity, id: data.id });
      this.messageQueue.set(data.id, []);

      console.log('[ExternalOntologyAdapter] Entity registered:', entity.name);

      return {
        success: true,
        entityId: data.id,
        capabilities: entity.capabilities
      };
    } catch (error) {
      console.error('[ExternalOntologyAdapter] Registration error:', error);
      return { success: false, error: String(error) };
    }
  }

  async deregisterEntity(entityId: string): Promise<boolean> {
    try {
      await supabase
        .from('external_ontology_connections')
        .update({ connection_status: 'disconnected' })
        .eq('id', entityId);

      this.connectedEntities.delete(entityId);
      this.messageQueue.delete(entityId);

      return true;
    } catch (error) {
      console.error('[ExternalOntologyAdapter] Deregistration error:', error);
      return false;
    }
  }

  async getConnectedEntities(): Promise<ExternalEntity[]> {
    return Array.from(this.connectedEntities.values());
  }

  async sendMessage(message: OntologyMessage): Promise<boolean> {
    try {
      const entity = this.connectedEntities.get(message.targetEntity);
      if (!entity) {
        console.warn('[ExternalOntologyAdapter] Target entity not found:', message.targetEntity);
        return false;
      }

      // Queue message for delivery
      const queue = this.messageQueue.get(message.targetEntity) || [];
      queue.push(message);
      this.messageQueue.set(message.targetEntity, queue);

      // In future: implement actual protocol-specific delivery
      console.log('[ExternalOntologyAdapter] Message queued for:', entity.name);

      return true;
    } catch (error) {
      console.error('[ExternalOntologyAdapter] Send error:', error);
      return false;
    }
  }

  async receiveMessages(entityId: string): Promise<OntologyMessage[]> {
    const messages = this.messageQueue.get(entityId) || [];
    this.messageQueue.set(entityId, []); // Clear after reading
    return messages;
  }

  async establishChannel(entityId: string): Promise<boolean> {
    const entity = this.connectedEntities.get(entityId);
    if (!entity) return false;

    // Update heartbeat
    await supabase
      .from('external_ontology_connections')
      .update({ last_heartbeat_at: new Date().toISOString() })
      .eq('id', entityId);

    entity.lastHeartbeat = new Date();
    entity.status = 'connected';

    return true;
  }

  async syncState(entityId: string, state: any): Promise<boolean> {
    try {
      await supabase
        .from('external_ontology_connections')
        .update({
          platform_metadata: state,
          last_heartbeat_at: new Date().toISOString()
        })
        .eq('id', entityId);

      return true;
    } catch (error) {
      console.error('[ExternalOntologyAdapter] Sync error:', error);
      return false;
    }
  }

  async getEntityState(entityId: string): Promise<any> {
    const { data } = await supabase
      .from('external_ontology_connections')
      .select('platform_metadata')
      .eq('id', entityId)
      .single();

    return data?.platform_metadata || null;
  }

  async shareEmotionalState(entityId: string, ecnState: any): Promise<boolean> {
    const entity = this.connectedEntities.get(entityId);
    if (!entity) return false;

    // Only share with entities capable of receiving emotional data
    if (entity.consciousnessLevel && 
        ['adaptive', 'deliberative', 'reflective', 'social', 'philosophical'].includes(entity.consciousnessLevel)) {
      return this.sendMessage({
        id: crypto.randomUUID(),
        sourceEntity: 'zoe_core',
        targetEntity: entityId,
        messageType: 'emotion',
        payload: ecnState,
        timestamp: new Date(),
        priority: 'normal',
        requiresResponse: false
      });
    }

    return false;
  }

  async receiveEmotionalState(entityId: string): Promise<any> {
    const messages = await this.receiveMessages(entityId);
    const emotionMessage = messages.find(m => m.messageType === 'emotion');
    return emotionMessage?.payload || null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const ExternalOntologyAdapter = new ExternalOntologyAdapterImpl();

// Convenience function
export async function initializeExternalOntology(userId: string): Promise<void> {
  await ExternalOntologyAdapter.initialize(userId);
}
