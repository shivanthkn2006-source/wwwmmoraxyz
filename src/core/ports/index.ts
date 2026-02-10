// ═══════════════════════════════════════════════════════════════════════════════
// ZOE HEXAGONAL ARCHITECTURE - PORTS INDEX
// Central export for all port interfaces
// ═══════════════════════════════════════════════════════════════════════════════

// LLM Inference Port
export * from './LLMInferencePort';

// TTS Service Port  
export * from './TTSServicePort';

// Port Registry Types
export interface PortRegistryEntry {
  portName: string;
  adapterName: string;
  adapterVersion: string;
  isActive: boolean;
  priority: number;
  healthStatus: 'healthy' | 'degraded' | 'unavailable';
}

export interface PortRegistry {
  getActiveAdapter<T>(portName: string): T | null;
  getAllAdapters<T>(portName: string): T[];
  registerAdapter<T>(portName: string, adapter: T, priority?: number): void;
  setAdapterHealth(portName: string, adapterName: string, health: 'healthy' | 'degraded' | 'unavailable'): void;
}
