// ═══════════════════════════════════════════════════════════════════════════════
// ZOE VR WORLD VOICE COMMANDS - DHF Core Integrated Voice Control
// Comprehensive hands-free voice commands for Zoe VR OMEGA World
// 60+ commands for navigation, building, search, avatars, environment control
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef } from 'react';
import { speakAs } from '@/utils/assistantVoice';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { smartFlyTo } from '@/services/globeNavigationService';

// ═══════════════════════════════════════════════════════════════════════════════
// VR WORLD VOICE COMMAND TYPES
// ═══════════════════════════════════════════════════════════════════════════════
export interface VRWorldVoiceCommand {
  pattern: RegExp;
  action: string;
  category: 'navigation' | 'camera' | 'search' | 'building' | 'environment' | 'avatar' | 'ui' | 'system';
  description: string;
  voiceResponse: string;
  priority?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VR WORLD VOICE COMMANDS - 60+ Commands
// ═══════════════════════════════════════════════════════════════════════════════
export const VR_WORLD_COMMANDS: VRWorldVoiceCommand[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // NAVIGATION & MOVEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?(?:open|enter|launch)\s+(?:vr\s+world|omega\s+world|virtual\s+reality)$/i, action: 'open_vr_world', category: 'navigation', description: 'Open VR World', voiceResponse: 'Entering VR OMEGA World. Prepare for immersion.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:exit|leave|close)\s+(?:vr|vr\s+world|omega\s+world)$/i, action: 'exit_vr_world', category: 'navigation', description: 'Exit VR World', voiceResponse: 'Exiting VR World. Returning to reality.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:fly|go|navigate)\s+to\s+(.+)$/i, action: 'fly_to_location', category: 'navigation', description: 'Fly to location', voiceResponse: 'Flying to {location}. Enjoy the view.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:teleport|warp)\s+(?:to\s+)?(.+)$/i, action: 'teleport_to', category: 'navigation', description: 'Teleport to location', voiceResponse: 'Teleporting to {location}. Hold tight.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:walk|move)\s+(?:forward|ahead)$/i, action: 'walk_forward', category: 'navigation', description: 'Walk forward', voiceResponse: 'Walking forward.', priority: 8 },
  { pattern: /^(?:zoe\s+)?(?:walk|move)\s+(?:backward|back)$/i, action: 'walk_backward', category: 'navigation', description: 'Walk backward', voiceResponse: 'Walking backward.', priority: 8 },
  { pattern: /^(?:zoe\s+)?(?:turn|rotate)\s+left$/i, action: 'turn_left', category: 'navigation', description: 'Turn left', voiceResponse: 'Turning left.', priority: 8 },
  { pattern: /^(?:zoe\s+)?(?:turn|rotate)\s+right$/i, action: 'turn_right', category: 'navigation', description: 'Turn right', voiceResponse: 'Turning right.', priority: 8 },
  { pattern: /^(?:zoe\s+)?stop(?:\s+moving)?$/i, action: 'stop_movement', category: 'navigation', description: 'Stop movement', voiceResponse: 'Stopping.', priority: 8 },
  { pattern: /^(?:zoe\s+)?run$/i, action: 'run', category: 'navigation', description: 'Run', voiceResponse: 'Running.', priority: 8 },
  { pattern: /^(?:zoe\s+)?sprint$/i, action: 'sprint', category: 'navigation', description: 'Sprint', voiceResponse: 'Sprinting at full speed!', priority: 8 },
  { pattern: /^(?:zoe\s+)?jump$/i, action: 'jump', category: 'navigation', description: 'Jump', voiceResponse: 'Jumping!', priority: 8 },
  { pattern: /^(?:zoe\s+)?fly\s*(?:up|higher)?$/i, action: 'fly_up', category: 'navigation', description: 'Fly up', voiceResponse: 'Ascending.', priority: 8 },
  { pattern: /^(?:zoe\s+)?fly\s+down$/i, action: 'fly_down', category: 'navigation', description: 'Fly down', voiceResponse: 'Descending.', priority: 8 },
  { pattern: /^(?:zoe\s+)?land$/i, action: 'land', category: 'navigation', description: 'Land', voiceResponse: 'Landing safely.', priority: 8 },
  { pattern: /^(?:zoe\s+)?hover$/i, action: 'hover', category: 'navigation', description: 'Hover', voiceResponse: 'Hovering in place.', priority: 8 },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CAMERA & ZOOM CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?zoom\s+in$/i, action: 'zoom_in', category: 'camera', description: 'Zoom in', voiceResponse: 'Zooming in.', priority: 9 },
  { pattern: /^(?:zoe\s+)?zoom\s+out$/i, action: 'zoom_out', category: 'camera', description: 'Zoom out', voiceResponse: 'Zooming out.', priority: 9 },
  { pattern: /^(?:zoe\s+)?zoom\s+(?:to\s+)?(?:max|maximum)$/i, action: 'zoom_max', category: 'camera', description: 'Maximum zoom', voiceResponse: 'Maximum zoom.', priority: 9 },
  { pattern: /^(?:zoe\s+)?zoom\s+(?:to\s+)?(?:min|minimum|reset)$/i, action: 'zoom_reset', category: 'camera', description: 'Reset zoom', voiceResponse: 'Resetting zoom level.', priority: 9 },
  { pattern: /^(?:zoe\s+)?look\s+up$/i, action: 'look_up', category: 'camera', description: 'Look up', voiceResponse: 'Looking up.', priority: 8 },
  { pattern: /^(?:zoe\s+)?look\s+down$/i, action: 'look_down', category: 'camera', description: 'Look down', voiceResponse: 'Looking down.', priority: 8 },
  { pattern: /^(?:zoe\s+)?look\s+left$/i, action: 'look_left', category: 'camera', description: 'Look left', voiceResponse: 'Looking left.', priority: 8 },
  { pattern: /^(?:zoe\s+)?look\s+right$/i, action: 'look_right', category: 'camera', description: 'Look right', voiceResponse: 'Looking right.', priority: 8 },
  { pattern: /^(?:zoe\s+)?look\s+around$/i, action: 'look_around', category: 'camera', description: 'Look around 360', voiceResponse: 'Scanning surroundings.', priority: 8 },
  { pattern: /^(?:zoe\s+)?reset\s+(?:view|camera)$/i, action: 'reset_camera', category: 'camera', description: 'Reset camera', voiceResponse: 'Resetting camera view.', priority: 9 },
  { pattern: /^(?:zoe\s+)?first\s+person\s*(?:view)?$/i, action: 'first_person_view', category: 'camera', description: 'First person view', voiceResponse: 'Switching to first person view.', priority: 9 },
  { pattern: /^(?:zoe\s+)?third\s+person\s*(?:view)?$/i, action: 'third_person_view', category: 'camera', description: 'Third person view', voiceResponse: 'Switching to third person view.', priority: 9 },
  { pattern: /^(?:zoe\s+)?satellite\s*(?:view)?$/i, action: 'satellite_view', category: 'camera', description: 'Satellite view', voiceResponse: 'Switching to satellite bird\'s eye view.', priority: 9 },
  { pattern: /^(?:zoe\s+)?aerial\s*(?:view)?$/i, action: 'aerial_view', category: 'camera', description: 'Aerial view', voiceResponse: 'Switching to aerial drone view.', priority: 9 },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH & DISCOVERY
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?(?:search|find)\s+(?:for\s+)?(.+)$/i, action: 'search', category: 'search', description: 'Search for items', voiceResponse: 'Searching for {query}.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:find|locate)\s+(?:nearby\s+)?users?$/i, action: 'find_users', category: 'search', description: 'Find users', voiceResponse: 'Locating nearby users.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:find|search)\s+(?:for\s+)?(?:the\s+)?mall(?:s)?$/i, action: 'find_malls', category: 'search', description: 'Find malls', voiceResponse: 'Searching for malls nearby.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:find|search)\s+(?:for\s+)?brands?$/i, action: 'find_brands', category: 'search', description: 'Find brands', voiceResponse: 'Searching for brand stores.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:find|search)\s+(?:for\s+)?products?$/i, action: 'find_products', category: 'search', description: 'Find products', voiceResponse: 'Searching for products.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:find|search)\s+(.+)\s+store$/i, action: 'find_store', category: 'search', description: 'Find specific store', voiceResponse: 'Searching for {store} store.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:show|display)\s+(?:all\s+)?avatars?$/i, action: 'show_avatars', category: 'search', description: 'Show avatars', voiceResponse: 'Displaying all avatars in the world.', priority: 8 },
  { pattern: /^(?:zoe\s+)?(?:show|display)\s+buildings?$/i, action: 'show_buildings', category: 'search', description: 'Show buildings', voiceResponse: 'Highlighting all buildings.', priority: 8 },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // BUILDING & CREATION
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?city$/i, action: 'build_city', category: 'building', description: 'Build city', voiceResponse: 'Constructing a new city with full amenities.', priority: 10 },
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?house$/i, action: 'build_house', category: 'building', description: 'Build house', voiceResponse: 'Building a house.', priority: 9 },
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?hospital$/i, action: 'build_hospital', category: 'building', description: 'Build hospital', voiceResponse: 'Constructing a hospital.', priority: 9 },
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?school$/i, action: 'build_school', category: 'building', description: 'Build school', voiceResponse: 'Building a school.', priority: 9 },
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?park$/i, action: 'build_park', category: 'building', description: 'Build park', voiceResponse: 'Creating a park with trees and benches.', priority: 9 },
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?road$/i, action: 'build_road', category: 'building', description: 'Build road', voiceResponse: 'Constructing roads.', priority: 9 },
  { pattern: /^(?:zoe\s+)?spawn\s+(?:a\s+)?car$/i, action: 'spawn_car', category: 'building', description: 'Spawn car', voiceResponse: 'Spawning a car.', priority: 8 },
  { pattern: /^(?:zoe\s+)?spawn\s+(?:a\s+)?vehicle$/i, action: 'spawn_vehicle', category: 'building', description: 'Spawn vehicle', voiceResponse: 'Spawning a vehicle.', priority: 8 },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ENVIRONMENT & WEATHER
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?(?:set|change)\s+(?:to\s+)?(?:day|daytime)$/i, action: 'set_day', category: 'environment', description: 'Set daytime', voiceResponse: 'Setting world to daytime.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:set|change)\s+(?:to\s+)?(?:night|nighttime)$/i, action: 'set_night', category: 'environment', description: 'Set nighttime', voiceResponse: 'Setting world to nighttime.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:set|change)\s+(?:to\s+)?sunset$/i, action: 'set_sunset', category: 'environment', description: 'Set sunset', voiceResponse: 'Setting world to sunset.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:set|change)\s+(?:to\s+)?sunrise$/i, action: 'set_sunrise', category: 'environment', description: 'Set sunrise', voiceResponse: 'Setting world to sunrise.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:make\s+it\s+)?rain$/i, action: 'set_rain', category: 'environment', description: 'Start rain', voiceResponse: 'Starting rain.', priority: 8 },
  { pattern: /^(?:zoe\s+)?(?:make\s+it\s+)?snow$/i, action: 'set_snow', category: 'environment', description: 'Start snow', voiceResponse: 'Starting snowfall.', priority: 8 },
  { pattern: /^(?:zoe\s+)?(?:stop|clear)\s+(?:the\s+)?(?:rain|weather)$/i, action: 'clear_weather', category: 'environment', description: 'Clear weather', voiceResponse: 'Clearing the weather.', priority: 8 },
  { pattern: /^(?:zoe\s+)?(?:toggle|show|hide)\s+cyber\s+city$/i, action: 'toggle_cyber_city', category: 'environment', description: 'Toggle cyber city', voiceResponse: 'Toggling cyber city view.', priority: 8 },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // AVATAR & INTERACTION
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?(?:interact|talk)\s+(?:with\s+)?(?:avatar|user)$/i, action: 'interact_avatar', category: 'avatar', description: 'Interact with avatar', voiceResponse: 'Approaching for interaction.', priority: 8 },
  { pattern: /^(?:zoe\s+)?wave$/i, action: 'wave', category: 'avatar', description: 'Wave gesture', voiceResponse: 'Waving hello!', priority: 7 },
  { pattern: /^(?:zoe\s+)?sit(?:\s+down)?$/i, action: 'sit', category: 'avatar', description: 'Sit down', voiceResponse: 'Taking a seat.', priority: 7 },
  { pattern: /^(?:zoe\s+)?stand(?:\s+up)?$/i, action: 'stand', category: 'avatar', description: 'Stand up', voiceResponse: 'Standing up.', priority: 7 },
  { pattern: /^(?:zoe\s+)?dance$/i, action: 'dance', category: 'avatar', description: 'Dance', voiceResponse: 'Let\'s dance!', priority: 7 },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // UI CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?(?:show|open)\s+(?:the\s+)?controls?$/i, action: 'show_controls', category: 'ui', description: 'Show controls panel', voiceResponse: 'Showing controls panel.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:hide|close)\s+(?:the\s+)?controls?$/i, action: 'hide_controls', category: 'ui', description: 'Hide controls panel', voiceResponse: 'Hiding controls panel.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:show|open)\s+(?:the\s+)?(?:hud|interface)$/i, action: 'show_hud', category: 'ui', description: 'Show HUD', voiceResponse: 'Showing the HUD.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:hide|close)\s+(?:the\s+)?(?:hud|interface)$/i, action: 'hide_hud', category: 'ui', description: 'Hide HUD', voiceResponse: 'Hiding the HUD.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:show|open)\s+(?:the\s+)?map$/i, action: 'show_map', category: 'ui', description: 'Show map', voiceResponse: 'Opening the map.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:show|open)\s+(?:the\s+)?wallet$/i, action: 'show_wallet', category: 'ui', description: 'Show wallet', voiceResponse: 'Opening your wallet.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:toggle|switch)\s+fullscreen$/i, action: 'toggle_fullscreen', category: 'ui', description: 'Toggle fullscreen', voiceResponse: 'Toggling fullscreen mode.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:show|open)\s+(?:the\s+)?bi\s*cameral(?:\s+hud)?$/i, action: 'show_bicameral', category: 'ui', description: 'Show BiCameral HUD', voiceResponse: 'Showing BiCameral interface.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:show|open)\s+(?:the\s+)?timeline$/i, action: 'show_timeline', category: 'ui', description: 'Show timeline', voiceResponse: 'Opening time manipulation bar.', priority: 9 },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM & HELP
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?help$/i, action: 'show_help', category: 'system', description: 'Show help', voiceResponse: 'Here are the available commands.', priority: 10 },
  { pattern: /^(?:zoe\s+)?what\s+can\s+(?:you|I)\s+do$/i, action: 'list_commands', category: 'system', description: 'List commands', voiceResponse: 'You can navigate, build, search, and control the entire VR world.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:toggle|enable|disable)\s+sound$/i, action: 'toggle_sound', category: 'system', description: 'Toggle sound', voiceResponse: 'Toggling sound.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:mute|unmute)$/i, action: 'toggle_mute', category: 'system', description: 'Toggle mute', voiceResponse: 'Toggling audio.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:fix|repair)\s+(?:the\s+)?(?:zoom|camera)$/i, action: 'fix_camera', category: 'system', description: 'Fix camera issues', voiceResponse: 'Fixing camera controls.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:reset|restart)\s+(?:the\s+)?world$/i, action: 'reset_world', category: 'system', description: 'Reset world', voiceResponse: 'Resetting the world state.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:show|open)\s+(?:the\s+)?(?:zoe\s+)?orb$/i, action: 'show_zoe_orb', category: 'system', description: 'Show Zoe orb', voiceResponse: 'Showing Zoe\'s orb.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:bio|restore)\s+sync$/i, action: 'bio_sync', category: 'system', description: 'Activate Bio-Sync', voiceResponse: 'Initiating Bio-Sync. Hold for 10 seconds.', priority: 10 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// VR WORLD VOICE COMMAND HOOK
// ═══════════════════════════════════════════════════════════════════════════════
export const useZoeVRWorldCommands = () => {
  const { user } = useAuth();
  const lastCommandRef = useRef<string>('');
  const lastCommandTimeRef = useRef<number>(0);
  
  // Log command to DHF behavioral events
  const logVRWorldCommand = useCallback(async (command: string, action: string, category: string) => {
    if (!user?.id) return;
    
    try {
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'vr_world_voice_command',
        event_category: 'voice_interaction',
        metadata: {
          command,
          action,
          category,
          timestamp: new Date().toISOString(),
          source: 'zoe_vr_world_commands',
        },
        context_snippet: `VR World: ${command}`,
      });
    } catch (error) {
      console.error('[VR World Commands] Failed to log:', error);
    }
  }, [user?.id]);
  
  // Process voice command
  const processCommand = useCallback(async (input: string): Promise<{ matched: boolean; action: string; response: string }> => {
    const trimmedInput = input.trim().toLowerCase();
    
    // Debounce - prevent duplicate commands within 1 second
    const now = Date.now();
    if (trimmedInput === lastCommandRef.current && now - lastCommandTimeRef.current < 1000) {
      return { matched: false, action: '', response: '' };
    }
    
    lastCommandRef.current = trimmedInput;
    lastCommandTimeRef.current = now;
    
    // Sort by priority (higher first) and match
    const sortedCommands = [...VR_WORLD_COMMANDS].sort((a, b) => (b.priority || 5) - (a.priority || 5));
    
    for (const cmd of sortedCommands) {
      const match = trimmedInput.match(cmd.pattern);
      if (match) {
        // Extract parameters from match groups
        let response = cmd.voiceResponse;
        if (match[1]) {
          response = response.replace('{location}', match[1])
            .replace('{query}', match[1])
            .replace('{store}', match[1]);
        }
        
        // Log to DHF
        logVRWorldCommand(trimmedInput, cmd.action, cmd.category);
        
        // Speak response
        speakAs(response);
        
        // Dispatch action event
        window.dispatchEvent(new CustomEvent('vr-world-voice-action', {
          detail: {
            action: cmd.action,
            command: trimmedInput,
            category: cmd.category,
            params: match[1] || null,
          }
        }));
        
        // Show toast
        toast.success(response, { duration: 2000 });
        
        // Handle special actions that need immediate execution
        if (cmd.action === 'fly_to_location' || cmd.action === 'teleport_to') {
          const location = match[1];
          if (location) {
            smartFlyTo(location, { duration: 2000 });
          }
        }
        
        return { matched: true, action: cmd.action, response };
      }
    }
    
    return { matched: false, action: '', response: '' };
  }, [logVRWorldCommand]);
  
  // Listen for global voice commands
  useEffect(() => {
    const handleGlobalVoiceCommand = (event: CustomEvent) => {
      const { transcript } = event.detail || {};
      if (transcript) {
        processCommand(transcript);
      }
    };
    
    window.addEventListener('zoe-voice-command', handleGlobalVoiceCommand as EventListener);
    window.addEventListener('vr-voice-input', handleGlobalVoiceCommand as EventListener);
    
    return () => {
      window.removeEventListener('zoe-voice-command', handleGlobalVoiceCommand as EventListener);
      window.removeEventListener('vr-voice-input', handleGlobalVoiceCommand as EventListener);
    };
  }, [processCommand]);
  
  return {
    processCommand,
    commands: VR_WORLD_COMMANDS,
    commandCount: VR_WORLD_COMMANDS.length,
  };
};

export default useZoeVRWorldCommands;
