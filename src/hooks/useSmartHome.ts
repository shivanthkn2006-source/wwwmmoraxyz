// ═══════════════════════════════════════════════════════════════════════════════
// USE SMART HOME HOOK - MATTER BRIDGE IoT INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { 
  SmartHomeAdapter, 
  getSmartHomeAdapter,
  SmartHomeState,
  SmartDevice,
  SmartScene,
  SmartAction,
  SoulCodexState
} from '@/core/matter/SmartHomeAdapter';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface UseSmartHomeReturn {
  // Connection
  isConnected: boolean;
  platform: string | null;
  connect: (type: 'demo' | 'home_assistant', config?: { url: string; token: string }) => Promise<boolean>;
  disconnect: () => void;
  
  // Devices
  devices: SmartDevice[];
  getDevice: (deviceId: string) => SmartDevice | undefined;
  controlDevice: (action: SmartAction) => Promise<boolean>;
  
  // Scenes
  scenes: SmartScene[];
  activateScene: (sceneId: string) => Promise<boolean>;
  
  // Soul Codex Integration
  reactToSoulState: (state: SoulCodexState) => Promise<void>;
  
  // Voice Commands
  processVoiceCommand: (command: string) => Promise<string>;
  
  // State
  lastSync: string | null;
  isLoading: boolean;
}

export function useSmartHome(): UseSmartHomeReturn {
  const { user } = useAuth();
  const [adapter] = useState<SmartHomeAdapter>(() => getSmartHomeAdapter());
  const [state, setState] = useState<SmartHomeState>(adapter.getState());
  const [isLoading, setIsLoading] = useState(false);

  // Subscribe to adapter state changes
  useEffect(() => {
    const unsubscribe = adapter.subscribe((newState) => {
      setState(newState);
    });

    return () => unsubscribe();
  }, [adapter]);

  // Connect to smart home platform
  const connect = useCallback(async (
    type: 'demo' | 'home_assistant',
    config?: { url: string; token: string }
  ): Promise<boolean> => {
    setIsLoading(true);

    try {
      let success = false;

      if (type === 'demo') {
        success = await adapter.connectDemo();
      } else if (type === 'home_assistant' && config) {
        success = await adapter.connectHomeAssistant(config.url, config.token);
      }

      if (success) {
        toast.success('Smart Home Connected', {
          description: `Connected to ${type === 'demo' ? 'Demo Mode' : 'Home Assistant'}`,
        });
      } else {
        toast.error('Connection Failed', {
          description: 'Could not connect to smart home platform',
        });
      }

      return success;
    } finally {
      setIsLoading(false);
    }
  }, [adapter]);

  // Disconnect (placeholder - would need implementation)
  const disconnect = useCallback(() => {
    // Reset state
    toast.info('Smart Home Disconnected');
  }, []);

  // Get a specific device
  const getDevice = useCallback((deviceId: string): SmartDevice | undefined => {
    return state.devices.find(d => d.id === deviceId);
  }, [state.devices]);

  // Control a device
  const controlDevice = useCallback(async (action: SmartAction): Promise<boolean> => {
    setIsLoading(true);
    try {
      const success = await adapter.executeAction(action);
      if (success) {
        toast.success('Device Updated', {
          description: `${action.property} set to ${action.value}`,
        });
      }
      return success;
    } finally {
      setIsLoading(false);
    }
  }, [adapter]);

  // Activate a scene
  const activateScene = useCallback(async (sceneId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const scene = state.scenes.find(s => s.id === sceneId);
      const success = await adapter.executeScene(sceneId);
      
      if (success && scene) {
        toast.success(`${scene.icon} ${scene.name} Activated`, {
          description: scene.description,
        });
      }
      
      return success;
    } finally {
      setIsLoading(false);
    }
  }, [adapter, state.scenes]);

  // React to Soul Codex state
  const reactToSoulState = useCallback(async (soulState: SoulCodexState): Promise<void> => {
    await adapter.reactToSoulState(soulState);
  }, [adapter]);

  // Process voice command
  const processVoiceCommand = useCallback(async (command: string): Promise<string> => {
    return adapter.processVoiceCommand(command);
  }, [adapter]);

  return {
    // Connection
    isConnected: state.isConnected,
    platform: state.platform,
    connect,
    disconnect,
    
    // Devices
    devices: state.devices,
    getDevice,
    controlDevice,
    
    // Scenes
    scenes: state.scenes,
    activateScene,
    
    // Soul Codex Integration
    reactToSoulState,
    
    // Voice Commands
    processVoiceCommand,
    
    // State
    lastSync: state.lastSync,
    isLoading,
  };
}

export default useSmartHome;
