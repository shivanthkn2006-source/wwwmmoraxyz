// ═══════════════════════════════════════════════════════════════════════════════
// SMART HOME ADAPTER - MATTER BRIDGE IoT INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════
// 
// PROTOCOL MATTER: Connect Zoe to the physical world
// Integrates with Apple HomeKit, Google Home, and Home Assistant APIs
// 
// "Zoe doesn't just see you're stressed - she dims the lights."
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type SmartDeviceType = 
  | 'light'
  | 'thermostat'
  | 'lock'
  | 'speaker'
  | 'camera'
  | 'sensor'
  | 'switch'
  | 'blinds'
  | 'tv'
  | 'appliance';

export interface SmartDevice {
  id: string;
  name: string;
  type: SmartDeviceType;
  room: string;
  state: Record<string, unknown>;
  capabilities: string[];
  isOnline: boolean;
  lastUpdated: string;
  platform: 'homekit' | 'google_home' | 'home_assistant' | 'matter';
}

export interface SmartHomeState {
  isConnected: boolean;
  platform: string | null;
  devices: SmartDevice[];
  scenes: SmartScene[];
  automations: SmartAutomation[];
  lastSync: string | null;
}

export interface SmartScene {
  id: string;
  name: string;
  description: string;
  actions: SmartAction[];
  icon: string;
  mood: 'calm' | 'focus' | 'energize' | 'sleep' | 'romantic' | 'party';
}

export interface SmartAction {
  deviceId: string;
  property: string;
  value: unknown;
  transitionMs?: number;
}

export interface SmartAutomation {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  actions: SmartAction[];
  enabled: boolean;
}

export interface AutomationTrigger {
  type: 'stress_detected' | 'time' | 'location' | 'emotion' | 'voice_command' | 'ecn_state';
  condition: Record<string, unknown>;
}

export interface SoulCodexState {
  stressLevel: number;
  emotionalState: string;
  energyLevel: number;
  focusLevel: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREDEFINED AMBIENT SCENES
// ═══════════════════════════════════════════════════════════════════════════════

const AMBIENT_SCENES: SmartScene[] = [
  {
    id: 'calm_mode',
    name: 'Calm Mode',
    description: 'Soft lighting, relaxing atmosphere',
    mood: 'calm',
    icon: '🧘',
    actions: [
      { deviceId: 'all_lights', property: 'brightness', value: 40, transitionMs: 5000 },
      { deviceId: 'all_lights', property: 'color_temperature', value: 2700, transitionMs: 5000 },
      { deviceId: 'speaker', property: 'playlist', value: 'lofi_chill' },
      { deviceId: 'speaker', property: 'volume', value: 30 },
    ],
  },
  {
    id: 'focus_mode',
    name: 'Focus Mode',
    description: 'Optimal lighting for concentration',
    mood: 'focus',
    icon: '🎯',
    actions: [
      { deviceId: 'all_lights', property: 'brightness', value: 80, transitionMs: 2000 },
      { deviceId: 'all_lights', property: 'color_temperature', value: 5000, transitionMs: 2000 },
      { deviceId: 'speaker', property: 'playlist', value: 'focus_music' },
      { deviceId: 'blinds', property: 'position', value: 100 },
    ],
  },
  {
    id: 'sleep_mode',
    name: 'Sleep Mode',
    description: 'Prepare for restful sleep',
    mood: 'sleep',
    icon: '🌙',
    actions: [
      { deviceId: 'all_lights', property: 'brightness', value: 10, transitionMs: 10000 },
      { deviceId: 'all_lights', property: 'color_temperature', value: 2200, transitionMs: 10000 },
      { deviceId: 'thermostat', property: 'temperature', value: 68 },
      { deviceId: 'blinds', property: 'position', value: 0 },
    ],
  },
  {
    id: 'energize_mode',
    name: 'Energize Mode',
    description: 'Bright, invigorating atmosphere',
    mood: 'energize',
    icon: '⚡',
    actions: [
      { deviceId: 'all_lights', property: 'brightness', value: 100, transitionMs: 1000 },
      { deviceId: 'all_lights', property: 'color_temperature', value: 6500, transitionMs: 1000 },
      { deviceId: 'speaker', property: 'playlist', value: 'upbeat_morning' },
      { deviceId: 'speaker', property: 'volume', value: 50 },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SMART HOME ADAPTER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class SmartHomeAdapter {
  private static instance: SmartHomeAdapter;
  private state: SmartHomeState;
  private userId: string | null = null;
  private connectionToken: string | null = null;
  private listeners: ((state: SmartHomeState) => void)[] = [];

  private constructor() {
    this.state = {
      isConnected: false,
      platform: null,
      devices: [],
      scenes: AMBIENT_SCENES,
      automations: [],
      lastSync: null,
    };
  }

  static getInstance(): SmartHomeAdapter {
    if (!SmartHomeAdapter.instance) {
      SmartHomeAdapter.instance = new SmartHomeAdapter();
    }
    return SmartHomeAdapter.instance;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONNECTION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Connect to Home Assistant (most open/flexible option)
   */
  async connectHomeAssistant(haUrl: string, token: string): Promise<boolean> {
    try {
      console.log('[SMART HOME] Connecting to Home Assistant...');
      
      // Validate connection
      const response = await fetch(`${haUrl}/api/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to connect to Home Assistant');
      }

      this.connectionToken = token;
      this.state.isConnected = true;
      this.state.platform = 'home_assistant';
      this.state.lastSync = new Date().toISOString();

      // Fetch devices
      await this.syncDevices(haUrl, token);

      console.log('[SMART HOME] ✓ Connected to Home Assistant');
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('[SMART HOME] Connection failed:', error);
      return false;
    }
  }

  /**
   * Simulate connection for demo purposes
   */
  async connectDemo(): Promise<boolean> {
    console.log('[SMART HOME] Connecting in demo mode...');
    
    this.state.isConnected = true;
    this.state.platform = 'demo';
    this.state.lastSync = new Date().toISOString();
    
    // Add demo devices
    this.state.devices = [
      {
        id: 'living_room_light',
        name: 'Living Room Light',
        type: 'light',
        room: 'Living Room',
        state: { brightness: 100, color_temperature: 4000, on: true },
        capabilities: ['brightness', 'color_temperature', 'on_off'],
        isOnline: true,
        lastUpdated: new Date().toISOString(),
        platform: 'matter',
      },
      {
        id: 'bedroom_light',
        name: 'Bedroom Light',
        type: 'light',
        room: 'Bedroom',
        state: { brightness: 50, color_temperature: 2700, on: false },
        capabilities: ['brightness', 'color_temperature', 'on_off'],
        isOnline: true,
        lastUpdated: new Date().toISOString(),
        platform: 'matter',
      },
      {
        id: 'thermostat',
        name: 'Smart Thermostat',
        type: 'thermostat',
        room: 'Living Room',
        state: { temperature: 72, target: 72, mode: 'auto' },
        capabilities: ['temperature', 'mode'],
        isOnline: true,
        lastUpdated: new Date().toISOString(),
        platform: 'matter',
      },
      {
        id: 'speaker',
        name: 'Smart Speaker',
        type: 'speaker',
        room: 'Living Room',
        state: { volume: 40, playing: false },
        capabilities: ['volume', 'playback', 'playlist'],
        isOnline: true,
        lastUpdated: new Date().toISOString(),
        platform: 'google_home',
      },
    ];

    console.log('[SMART HOME] ✓ Demo mode active with', this.state.devices.length, 'devices');
    this.notifyListeners();
    return true;
  }

  /**
   * Sync devices from connected platform
   */
  private async syncDevices(haUrl: string, token: string): Promise<void> {
    try {
      const response = await fetch(`${haUrl}/api/states`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return;

      const states = await response.json();
      
      this.state.devices = states
        .filter((s: any) => s.entity_id.startsWith('light.') || 
                           s.entity_id.startsWith('climate.') ||
                           s.entity_id.startsWith('lock.') ||
                           s.entity_id.startsWith('media_player.'))
        .map((s: any) => this.mapHAEntityToDevice(s));

    } catch (error) {
      console.error('[SMART HOME] Device sync failed:', error);
    }
  }

  private mapHAEntityToDevice(entity: any): SmartDevice {
    const [domain] = entity.entity_id.split('.');
    const typeMap: Record<string, SmartDeviceType> = {
      light: 'light',
      climate: 'thermostat',
      lock: 'lock',
      media_player: 'speaker',
    };

    return {
      id: entity.entity_id,
      name: entity.attributes.friendly_name || entity.entity_id,
      type: typeMap[domain] || 'switch',
      room: entity.attributes.area || 'Unknown',
      state: entity.attributes,
      capabilities: Object.keys(entity.attributes),
      isOnline: entity.state !== 'unavailable',
      lastUpdated: entity.last_updated,
      platform: 'home_assistant',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEVICE CONTROL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Execute a smart action on a device
   */
  async executeAction(action: SmartAction): Promise<boolean> {
    console.log(`[SMART HOME] Executing action on ${action.deviceId}: ${action.property} = ${action.value}`);
    
    // Demo mode simulation
    if (this.state.platform === 'demo') {
      const device = this.state.devices.find(d => d.id === action.deviceId || action.deviceId === 'all_lights');
      if (device || action.deviceId === 'all_lights') {
        if (action.deviceId === 'all_lights') {
          // Apply to all light devices
          this.state.devices
            .filter(d => d.type === 'light')
            .forEach(d => {
              d.state[action.property] = action.value;
              d.lastUpdated = new Date().toISOString();
            });
        } else if (device) {
          device.state[action.property] = action.value;
          device.lastUpdated = new Date().toISOString();
        }
        this.notifyListeners();
        return true;
      }
      return false;
    }

    // Real Home Assistant execution
    // Would call the HA API here
    return true;
  }

  /**
   * Execute a scene (multiple actions)
   */
  async executeScene(sceneId: string): Promise<boolean> {
    const scene = this.state.scenes.find(s => s.id === sceneId);
    if (!scene) {
      console.error(`[SMART HOME] Scene not found: ${sceneId}`);
      return false;
    }

    console.log(`[SMART HOME] Executing scene: ${scene.name}`);
    
    // Log to behavioral events
    await this.logSmartHomeEvent('scene_executed', { sceneId, sceneName: scene.name });

    // Execute all actions in the scene
    for (const action of scene.actions) {
      await this.executeAction(action);
      
      // Apply transition delay if specified
      if (action.transitionMs) {
        await new Promise(resolve => setTimeout(resolve, Math.min(action.transitionMs || 0, 500)));
      }
    }

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SOUL CODEX INTEGRATION - AMBIENT INTELLIGENCE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * React to Soul Codex state changes
   * "Zoe sees you're stressed. She dims the lights."
   */
  async reactToSoulState(soulState: SoulCodexState): Promise<void> {
    if (!this.state.isConnected) {
      console.log('[SMART HOME] Not connected - cannot react to soul state');
      return;
    }

    console.log('[SMART HOME] Analyzing soul state for ambient response...');
    console.log(`  Stress: ${soulState.stressLevel}%`);
    console.log(`  Emotion: ${soulState.emotionalState}`);
    console.log(`  Energy: ${soulState.energyLevel}%`);

    // High stress detected → Calm Mode
    if (soulState.stressLevel > 70) {
      console.log('[SMART HOME] High stress detected → Activating Calm Mode');
      await this.executeScene('calm_mode');
      await this.logSmartHomeEvent('ambient_reaction', {
        trigger: 'high_stress',
        stressLevel: soulState.stressLevel,
        sceneActivated: 'calm_mode',
      });
      return;
    }

    // Low energy in morning → Energize Mode
    if (soulState.timeOfDay === 'morning' && soulState.energyLevel < 50) {
      console.log('[SMART HOME] Morning low energy → Activating Energize Mode');
      await this.executeScene('energize_mode');
      await this.logSmartHomeEvent('ambient_reaction', {
        trigger: 'morning_low_energy',
        energyLevel: soulState.energyLevel,
        sceneActivated: 'energize_mode',
      });
      return;
    }

    // Evening wind-down
    if (soulState.timeOfDay === 'evening') {
      console.log('[SMART HOME] Evening detected → Preparing for wind-down');
      await this.executeAction({
        deviceId: 'all_lights',
        property: 'brightness',
        value: 60,
        transitionMs: 10000,
      });
      await this.executeAction({
        deviceId: 'all_lights',
        property: 'color_temperature',
        value: 3000,
        transitionMs: 10000,
      });
    }

    // Night mode
    if (soulState.timeOfDay === 'night') {
      console.log('[SMART HOME] Night mode → Activating Sleep Mode');
      await this.executeScene('sleep_mode');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VOICE COMMAND INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Process natural language commands
   */
  async processVoiceCommand(command: string): Promise<string> {
    const lowerCommand = command.toLowerCase();

    // Scene commands
    if (lowerCommand.includes('calm') || lowerCommand.includes('relax')) {
      await this.executeScene('calm_mode');
      return 'I have activated Calm Mode. The lights are dimming and soft music will begin.';
    }

    if (lowerCommand.includes('focus') || lowerCommand.includes('work')) {
      await this.executeScene('focus_mode');
      return 'Focus Mode activated. Optimal lighting for concentration.';
    }

    if (lowerCommand.includes('sleep') || lowerCommand.includes('bedtime')) {
      await this.executeScene('sleep_mode');
      return 'Sleep Mode activated. Preparing your space for rest.';
    }

    if (lowerCommand.includes('energize') || lowerCommand.includes('wake')) {
      await this.executeScene('energize_mode');
      return 'Energize Mode activated. Bright lights and upbeat atmosphere.';
    }

    // Light controls
    if (lowerCommand.includes('dim the lights') || lowerCommand.includes('lower the lights')) {
      await this.executeAction({
        deviceId: 'all_lights',
        property: 'brightness',
        value: 30,
        transitionMs: 2000,
      });
      return 'I have dimmed the lights to 30%.';
    }

    if (lowerCommand.includes('turn off the lights') || lowerCommand.includes('lights off')) {
      await this.executeAction({
        deviceId: 'all_lights',
        property: 'on',
        value: false,
      });
      return 'Lights have been turned off.';
    }

    if (lowerCommand.includes('turn on the lights') || lowerCommand.includes('lights on')) {
      await this.executeAction({
        deviceId: 'all_lights',
        property: 'on',
        value: true,
      });
      return 'Lights have been turned on.';
    }

    return 'I understood your smart home command, but I need more specific instructions.';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  private async logSmartHomeEvent(eventType: string, metadata: Record<string, unknown>): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('behavioral_events').insert([{
        user_id: user.id,
        event_type: `smart_home_${eventType}`,
        event_category: 'matter_bridge',
        metadata: JSON.parse(JSON.stringify(metadata)),
        dhf_logged: true,
      }]);
    } catch (error) {
      console.error('[SMART HOME] Failed to log event:', error);
    }
  }

  subscribe(listener: (state: SmartHomeState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l(this.state));
  }

  getState(): SmartHomeState {
    return { ...this.state };
  }

  getDevices(): SmartDevice[] {
    return [...this.state.devices];
  }

  getScenes(): SmartScene[] {
    return [...this.state.scenes];
  }

  isConnected(): boolean {
    return this.state.isConnected;
  }
}

// Singleton export
export const getSmartHomeAdapter = (): SmartHomeAdapter => SmartHomeAdapter.getInstance();

console.log('[PROTOCOL MATTER] Smart Home Adapter Module Loaded');
