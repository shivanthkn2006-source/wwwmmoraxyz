// ═══════════════════════════════════════════════════════════════════════════════
// VR VOICE COMMANDS - Comprehensive Zoe VR World Voice Control System
// Integrated with Zoe DHF Core for adaptive learning
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef } from 'react';
import { speakAsZoe } from '@/utils/zoeVoice';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VRCommand {
  pattern: RegExp;
  action: string;
  category: 'navigation' | 'movement' | 'action' | 'control' | 'environment' | 'interaction';
  description: string;
  voiceResponse: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE VR VOICE COMMANDS
// ═══════════════════════════════════════════════════════════════════════════════
export const VR_COMMANDS: VRCommand[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // NAVIGATION & ENTRY COMMANDS
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?(?:open|enter|launch|activate|start)\s+(?:vr|vr\s+world|virtual\s+reality|omega\s+world)$/i, action: 'open_vr', category: 'navigation', description: 'Open VR World', voiceResponse: 'Entering VR OMEGA World. Prepare for immersive experience.' },
  { pattern: /^(?:zoe\s+)?(?:exit|leave|close|quit)\s+(?:vr|vr\s+world|virtual\s+reality)$/i, action: 'exit_vr', category: 'navigation', description: 'Exit VR World', voiceResponse: 'Returning to reality.' },
  { pattern: /^(?:zoe\s+)?(?:activate|enable|start)\s+voice\s+controls?$/i, action: 'activate_voice', category: 'control', description: 'Activate voice controls', voiceResponse: 'Voice controls activated. I am listening.' },
  { pattern: /^(?:zoe\s+)?(?:deactivate|disable|stop)\s+voice\s+controls?$/i, action: 'deactivate_voice', category: 'control', description: 'Deactivate voice controls', voiceResponse: 'Voice controls deactivated.' },

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC MOVEMENT COMMANDS
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?(?:walk|move)\s+(?:forward|ahead|straight)$/i, action: 'walk_forward', category: 'movement', description: 'Walk forward', voiceResponse: 'Walking forward.' },
  { pattern: /^(?:zoe\s+)?(?:walk|move)\s+(?:backward|back|backwards)$/i, action: 'walk_backward', category: 'movement', description: 'Walk backward', voiceResponse: 'Walking backward.' },
  { pattern: /^(?:zoe\s+)?(?:walk|move|turn)\s+left$/i, action: 'walk_left', category: 'movement', description: 'Move left', voiceResponse: 'Moving left.' },
  { pattern: /^(?:zoe\s+)?(?:walk|move|turn)\s+right$/i, action: 'walk_right', category: 'movement', description: 'Move right', voiceResponse: 'Moving right.' },
  { pattern: /^(?:zoe\s+)?stop(?:\s+moving)?$/i, action: 'stop', category: 'movement', description: 'Stop movement', voiceResponse: 'Stopping.' },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RUNNING COMMANDS
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?run(?:\s+forward)?$/i, action: 'run_forward', category: 'movement', description: 'Run forward', voiceResponse: 'Running forward.' },
  { pattern: /^(?:zoe\s+)?run\s+fast$/i, action: 'run_fast', category: 'movement', description: 'Run fast', voiceResponse: 'Running at full speed.' },
  { pattern: /^(?:zoe\s+)?sprint$/i, action: 'sprint', category: 'movement', description: 'Sprint', voiceResponse: 'Sprinting!' },
  { pattern: /^(?:zoe\s+)?jog(?:\s+slowly)?$/i, action: 'jog', category: 'movement', description: 'Jog slowly', voiceResponse: 'Jogging at a steady pace.' },

  // ═══════════════════════════════════════════════════════════════════════════
  // JUMP COMMANDS
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?jump$/i, action: 'jump', category: 'movement', description: 'Jump', voiceResponse: 'Jumping!' },
  { pattern: /^(?:zoe\s+)?jump\s+(?:high|higher)$/i, action: 'jump_high', category: 'movement', description: 'Jump high', voiceResponse: 'High jump!' },
  { pattern: /^(?:zoe\s+)?double\s+jump$/i, action: 'double_jump', category: 'movement', description: 'Double jump', voiceResponse: 'Double jump executed.' },
  { pattern: /^(?:zoe\s+)?leap$/i, action: 'leap', category: 'movement', description: 'Leap', voiceResponse: 'Leaping forward.' },

  // ═══════════════════════════════════════════════════════════════════════════
  // DRIVING COMMANDS
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?(?:drive|start\s+driving)$/i, action: 'drive', category: 'movement', description: 'Start driving', voiceResponse: 'Driving mode activated.' },
  { pattern: /^(?:zoe\s+)?drive\s+slowly$/i, action: 'drive_slow', category: 'movement', description: 'Drive slowly', voiceResponse: 'Driving at low speed.' },
  { pattern: /^(?:zoe\s+)?drive\s+(?:medium|normal)$/i, action: 'drive_medium', category: 'movement', description: 'Drive at medium speed', voiceResponse: 'Cruising at medium speed.' },
  { pattern: /^(?:zoe\s+)?drive\s+fast$/i, action: 'drive_fast', category: 'movement', description: 'Drive fast', voiceResponse: 'Accelerating to high speed.' },
  { pattern: /^(?:zoe\s+)?(?:accelerate|speed\s+up)$/i, action: 'accelerate', category: 'movement', description: 'Accelerate', voiceResponse: 'Accelerating.' },
  { pattern: /^(?:zoe\s+)?(?:brake|slow\s+down)$/i, action: 'brake', category: 'movement', description: 'Brake', voiceResponse: 'Braking.' },
  { pattern: /^(?:zoe\s+)?(?:park|stop\s+driving)$/i, action: 'park', category: 'movement', description: 'Park/Stop driving', voiceResponse: 'Parking the vehicle.' },

  // ═══════════════════════════════════════════════════════════════════════════
  // FLYING COMMANDS
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?fly$/i, action: 'fly', category: 'movement', description: 'Fly', voiceResponse: 'Taking flight.' },
  { pattern: /^(?:zoe\s+)?fly\s+(?:up|higher|upward)$/i, action: 'fly_up', category: 'movement', description: 'Fly up', voiceResponse: 'Ascending.' },
  { pattern: /^(?:zoe\s+)?fly\s+(?:down|lower|downward)$/i, action: 'fly_down', category: 'movement', description: 'Fly down', voiceResponse: 'Descending.' },
  { pattern: /^(?:zoe\s+)?fly\s+(?:above|over)\s+(?:the\s+)?clouds?$/i, action: 'fly_above_clouds', category: 'movement', description: 'Fly above clouds', voiceResponse: 'Soaring above the clouds.' },
  { pattern: /^(?:zoe\s+)?hover$/i, action: 'hover', category: 'movement', description: 'Hover in place', voiceResponse: 'Hovering in place.' },
  { pattern: /^(?:zoe\s+)?land$/i, action: 'land', category: 'movement', description: 'Land', voiceResponse: 'Landing safely.' },
  { pattern: /^(?:zoe\s+)?glide$/i, action: 'glide', category: 'movement', description: 'Glide', voiceResponse: 'Gliding smoothly.' },

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMERA/VIEW COMMANDS
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?look\s+(?:up|upward)$/i, action: 'look_up', category: 'control', description: 'Look up', voiceResponse: 'Looking up.' },
  { pattern: /^(?:zoe\s+)?look\s+(?:down|downward)$/i, action: 'look_down', category: 'control', description: 'Look down', voiceResponse: 'Looking down.' },
  { pattern: /^(?:zoe\s+)?look\s+left$/i, action: 'look_left', category: 'control', description: 'Look left', voiceResponse: 'Looking left.' },
  { pattern: /^(?:zoe\s+)?look\s+right$/i, action: 'look_right', category: 'control', description: 'Look right', voiceResponse: 'Looking right.' },
  { pattern: /^(?:zoe\s+)?look\s+(?:around|360)$/i, action: 'look_around', category: 'control', description: 'Look around', voiceResponse: 'Scanning surroundings.' },
  { pattern: /^(?:zoe\s+)?zoom\s+in$/i, action: 'zoom_in', category: 'control', description: 'Zoom in', voiceResponse: 'Zooming in.' },
  { pattern: /^(?:zoe\s+)?zoom\s+out$/i, action: 'zoom_out', category: 'control', description: 'Zoom out', voiceResponse: 'Zooming out.' },
  { pattern: /^(?:zoe\s+)?reset\s+(?:view|camera)$/i, action: 'reset_view', category: 'control', description: 'Reset camera view', voiceResponse: 'Resetting view.' },
  { pattern: /^(?:zoe\s+)?first\s+person$/i, action: 'first_person', category: 'control', description: 'First person view', voiceResponse: 'Switching to first person view.' },
  { pattern: /^(?:zoe\s+)?third\s+person$/i, action: 'third_person', category: 'control', description: 'Third person view', voiceResponse: 'Switching to third person view.' },

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILDING/CREATION COMMANDS - Natural Language Support
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?house$/i, action: 'build_house', category: 'action', description: 'Build a house', voiceResponse: 'Constructing a house with rooms and furniture.' },
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?building$/i, action: 'build_building', category: 'action', description: 'Build a building', voiceResponse: 'Constructing a multi-story building.' },
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?road$/i, action: 'build_road', category: 'action', description: 'Build a road', voiceResponse: 'Constructing a road network.' },
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?bridge$/i, action: 'build_bridge', category: 'action', description: 'Build a bridge', voiceResponse: 'Constructing a bridge.' },
  { pattern: /^(?:zoe\s+)?plant\s+(?:a\s+)?tree$/i, action: 'plant_tree', category: 'action', description: 'Plant a tree', voiceResponse: 'Planting a tree.' },
  { pattern: /^(?:zoe\s+)?create\s+(?:a\s+)?forest$/i, action: 'create_forest', category: 'action', description: 'Create a forest', voiceResponse: 'Growing a beautiful forest.' },
  
  // CITY BUILDING - Natural Language "Zoe build a city"
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+|an?\s+)?city$/i, action: 'build_city', category: 'action', description: 'Build a city', voiceResponse: 'Initiating city construction with residential areas, commercial zones, parks, and essential infrastructure for avatars to live like humans.' },
  { pattern: /^(?:zoe\s+)?(?:create|make|construct)\s+(?:a\s+|an?\s+)?city$/i, action: 'build_city', category: 'action', description: 'Create a city', voiceResponse: 'Building a complete city with housing, shops, hospitals, schools, and parks.' },
  { pattern: /^(?:zoe\s+)?build\s+(?:me\s+)?(?:a\s+)?(?:basic\s+)?city\s+(?:with\s+)?(?:all\s+)?(?:basic\s+)?amenities$/i, action: 'build_city_full', category: 'action', description: 'Build city with amenities', voiceResponse: 'Constructing a fully functional city with homes, hospitals, schools, markets, parks, roads, and utilities for avatars.' },
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?(?:town|village|settlement)$/i, action: 'build_town', category: 'action', description: 'Build a town', voiceResponse: 'Creating a cozy town with essential facilities.' },
  
  // VEHICLE & TRANSPORT
  { pattern: /^(?:zoe\s+)?(?:create|spawn|make)\s+(?:a\s+)?vehicle$/i, action: 'create_vehicle', category: 'action', description: 'Create a vehicle', voiceResponse: 'Spawning vehicle.' },
  { pattern: /^(?:zoe\s+)?(?:spawn|create|make)\s+(?:a\s+)?car$/i, action: 'spawn_car', category: 'action', description: 'Spawn a car', voiceResponse: 'Spawning a car.' },
  { pattern: /^(?:zoe\s+)?(?:spawn|create)\s+(?:a\s+)?(?:bus|train|plane|helicopter|boat|bike|motorcycle)$/i, action: 'spawn_transport', category: 'action', description: 'Spawn transport', voiceResponse: 'Spawning transportation.' },
  
  // INFRASTRUCTURE
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?hospital$/i, action: 'build_hospital', category: 'action', description: 'Build a hospital', voiceResponse: 'Constructing a hospital with medical facilities.' },
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?school$/i, action: 'build_school', category: 'action', description: 'Build a school', voiceResponse: 'Building an educational facility.' },
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?(?:shop|store|market)$/i, action: 'build_shop', category: 'action', description: 'Build a shop', voiceResponse: 'Constructing a commercial building.' },
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?park$/i, action: 'build_park', category: 'action', description: 'Build a park', voiceResponse: 'Creating a beautiful park with trees and benches.' },
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?(?:factory|warehouse)$/i, action: 'build_industrial', category: 'action', description: 'Build industrial', voiceResponse: 'Constructing industrial facilities.' },

  // ═══════════════════════════════════════════════════════════════════════════
  // FIX/REPAIR COMMANDS
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?fix\s+(?:the\s+)?car$/i, action: 'fix_car', category: 'action', description: 'Fix the car', voiceResponse: 'Repairing the vehicle.' },
  { pattern: /^(?:zoe\s+)?fix\s+(?:the\s+)?house$/i, action: 'fix_house', category: 'action', description: 'Fix the house', voiceResponse: 'Repairing the structure.' },
  { pattern: /^(?:zoe\s+)?fix\s+(?:this|that|it)$/i, action: 'fix_object', category: 'action', description: 'Fix nearby object', voiceResponse: 'Repairing the object.' },
  { pattern: /^(?:zoe\s+)?repair\s+(.+)$/i, action: 'repair', category: 'action', description: 'Repair specified item', voiceResponse: 'Initiating repairs.' },
  { pattern: /^(?:zoe\s+)?restore\s+(.+)$/i, action: 'restore', category: 'action', description: 'Restore item', voiceResponse: 'Restoring to original state.' },

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERACTION COMMANDS
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?(?:interact|use|activate)$/i, action: 'interact', category: 'interaction', description: 'Interact with object', voiceResponse: 'Interacting.' },
  { pattern: /^(?:zoe\s+)?(?:pick\s+up|grab|take)$/i, action: 'pickup', category: 'interaction', description: 'Pick up object', voiceResponse: 'Picking up.' },
  { pattern: /^(?:zoe\s+)?(?:drop|release|put\s+down)$/i, action: 'drop', category: 'interaction', description: 'Drop object', voiceResponse: 'Dropping.' },
  { pattern: /^(?:zoe\s+)?(?:open|enter)\s+(?:the\s+)?door$/i, action: 'open_door', category: 'interaction', description: 'Open door', voiceResponse: 'Opening door.' },
  { pattern: /^(?:zoe\s+)?(?:close)\s+(?:the\s+)?door$/i, action: 'close_door', category: 'interaction', description: 'Close door', voiceResponse: 'Closing door.' },
  { pattern: /^(?:zoe\s+)?sit\s+down$/i, action: 'sit', category: 'interaction', description: 'Sit down', voiceResponse: 'Taking a seat.' },
  { pattern: /^(?:zoe\s+)?stand\s+up$/i, action: 'stand', category: 'interaction', description: 'Stand up', voiceResponse: 'Standing up.' },
  { pattern: /^(?:zoe\s+)?crouch$/i, action: 'crouch', category: 'interaction', description: 'Crouch', voiceResponse: 'Crouching.' },
  { pattern: /^(?:zoe\s+)?lie\s+down$/i, action: 'lie_down', category: 'interaction', description: 'Lie down', voiceResponse: 'Lying down.' },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENVIRONMENT COMMANDS - Weather, Seasons, Real-World Integration
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?(?:set|change)\s+(?:time\s+to\s+)?day$/i, action: 'set_day', category: 'environment', description: 'Set daytime', voiceResponse: 'Setting environment to daytime.' },
  { pattern: /^(?:zoe\s+)?(?:set|change)\s+(?:time\s+to\s+)?night$/i, action: 'set_night', category: 'environment', description: 'Set nighttime', voiceResponse: 'Setting environment to nighttime.' },
  { pattern: /^(?:zoe\s+)?(?:set|change)\s+(?:time\s+to\s+)?(?:dawn|morning|sunrise)$/i, action: 'set_dawn', category: 'environment', description: 'Set morning time', voiceResponse: 'Setting sunrise atmosphere.' },
  { pattern: /^(?:zoe\s+)?(?:set|change)\s+(?:time\s+to\s+)?(?:dusk|evening|sunset)$/i, action: 'set_dusk', category: 'environment', description: 'Set evening time', voiceResponse: 'Setting sunset atmosphere.' },
  
  // Weather commands
  { pattern: /^(?:zoe\s+)?(?:set|change)\s+(?:weather\s+to\s+)?sunny$/i, action: 'set_sunny', category: 'environment', description: 'Set sunny weather', voiceResponse: 'Clearing the skies.' },
  { pattern: /^(?:zoe\s+)?(?:set|change)\s+(?:weather\s+to\s+)?rainy$/i, action: 'set_rain', category: 'environment', description: 'Set rainy weather', voiceResponse: 'Bringing the rain.' },
  { pattern: /^(?:zoe\s+)?(?:set|change)\s+(?:weather\s+to\s+)?cloudy$/i, action: 'set_cloudy', category: 'environment', description: 'Set cloudy weather', voiceResponse: 'Adding clouds.' },
  { pattern: /^(?:zoe\s+)?(?:set|change|start)\s+(?:weather\s+to\s+)?snowy?$/i, action: 'set_snow', category: 'environment', description: 'Set snowy weather', voiceResponse: 'Let it snow.' },
  { pattern: /^(?:zoe\s+)?(?:start|make\s+it)\s+storm(?:ing)?$/i, action: 'set_storm', category: 'environment', description: 'Start storm', voiceResponse: 'Initiating storm sequence.' },
  { pattern: /^(?:zoe\s+)?(?:set|make)\s+(?:it\s+)?foggy?$/i, action: 'set_fog', category: 'environment', description: 'Set fog', voiceResponse: 'Adding atmospheric fog.' },
  
  // Season commands - Real world like
  { pattern: /^(?:zoe\s+)?(?:start|set|change\s+to)\s+winter\s+season$/i, action: 'set_season_winter', category: 'environment', description: 'Set winter season', voiceResponse: 'Activating winter season. Snow is falling, temperatures dropping.' },
  { pattern: /^(?:zoe\s+)?(?:start|set|change\s+to)\s+spring\s+season$/i, action: 'set_season_spring', category: 'environment', description: 'Set spring season', voiceResponse: 'Activating spring season. Flowers blooming, birds singing.' },
  { pattern: /^(?:zoe\s+)?(?:start|set|change\s+to)\s+summer\s+season$/i, action: 'set_season_summer', category: 'environment', description: 'Set summer season', voiceResponse: 'Activating summer season. Warm sunshine, green trees.' },
  { pattern: /^(?:zoe\s+)?(?:start|set|change\s+to)\s+(?:autumn|fall)\s+season$/i, action: 'set_season_autumn', category: 'environment', description: 'Set autumn season', voiceResponse: 'Activating autumn season. Leaves falling, golden colors.' },
  { pattern: /^(?:zoe\s+)?follow\s+(?:the\s+)?real[\s-]?world\s+(?:weather|forecast)?$/i, action: 'sync_real_weather', category: 'environment', description: 'Sync real world weather', voiceResponse: 'Syncing weather with your real location. Fetching current conditions.' },
  { pattern: /^(?:zoe\s+)?(?:set|sync)\s+(?:to\s+)?real[\s-]?time$/i, action: 'sync_real_time', category: 'environment', description: 'Sync real world time', voiceResponse: 'Syncing time with your real location.' },
  
  // Temperature
  { pattern: /^(?:zoe\s+)?(?:set|change)\s+temperature\s+(?:to\s+)?(\d+)(?:\s+degrees)?$/i, action: 'set_temperature', category: 'environment', description: 'Set temperature', voiceResponse: 'Adjusting world temperature.' },
  { pattern: /^(?:zoe\s+)?make\s+it\s+(?:hot|warm|cold|cool|freezing)$/i, action: 'set_temp_preset', category: 'environment', description: 'Set temperature preset', voiceResponse: 'Adjusting ambient temperature.' },
  
  { pattern: /^(?:zoe\s+)?toggle\s+(?:ambient\s+)?sounds?$/i, action: 'toggle_sound', category: 'environment', description: 'Toggle ambient sounds', voiceResponse: 'Toggling ambient sounds.' },

  // ═══════════════════════════════════════════════════════════════════════════
  // VEHICLE INTERACTION - Enter, Drive, Navigate
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?enter\s+(?:the\s+)?(?:car|vehicle)$/i, action: 'enter_vehicle', category: 'interaction', description: 'Enter vehicle', voiceResponse: 'Getting into the vehicle.' },
  { pattern: /^(?:zoe\s+)?exit\s+(?:the\s+)?(?:car|vehicle)$/i, action: 'exit_vehicle', category: 'interaction', description: 'Exit vehicle', voiceResponse: 'Exiting the vehicle.' },
  { pattern: /^(?:zoe\s+)?(?:start|turn\s+on)\s+(?:the\s+)?(?:car|engine)$/i, action: 'start_engine', category: 'interaction', description: 'Start engine', voiceResponse: 'Starting the engine.' },
  { pattern: /^(?:zoe\s+)?(?:stop|turn\s+off)\s+(?:the\s+)?(?:car|engine)$/i, action: 'stop_engine', category: 'interaction', description: 'Stop engine', voiceResponse: 'Turning off the engine.' },
  { pattern: /^(?:zoe\s+)?(?:drive|go)\s+(?:to|from)\s+(.+)\s+(?:to|through)\s+(.+)$/i, action: 'navigate_route', category: 'movement', description: 'Navigate route', voiceResponse: 'Calculating route and starting navigation.' },
  { pattern: /^(?:zoe\s+)?(?:drive|take)\s+me\s+to\s+(.+)$/i, action: 'drive_to', category: 'movement', description: 'Drive to location', voiceResponse: 'Navigating to destination. Creating road if needed.' },
  { pattern: /^(?:zoe\s+)?auto[\s-]?pilot$/i, action: 'autopilot', category: 'movement', description: 'Enable autopilot', voiceResponse: 'Engaging autopilot mode.' },
  { pattern: /^(?:zoe\s+)?manual\s+(?:drive|mode)$/i, action: 'manual_drive', category: 'movement', description: 'Manual driving mode', voiceResponse: 'Switching to manual driving mode.' },
  
  // Door interactions
  { pattern: /^(?:zoe\s+)?open\s+(?:the\s+)?(?:car\s+)?door$/i, action: 'open_car_door', category: 'interaction', description: 'Open car door', voiceResponse: 'Opening the car door.' },
  { pattern: /^(?:zoe\s+)?close\s+(?:the\s+)?(?:car\s+)?door$/i, action: 'close_car_door', category: 'interaction', description: 'Close car door', voiceResponse: 'Closing the car door.' },
  { pattern: /^(?:zoe\s+)?open\s+(?:the\s+)?(?:house|building)\s+door$/i, action: 'open_building_door', category: 'interaction', description: 'Open building door', voiceResponse: 'Opening the door.' },
  { pattern: /^(?:zoe\s+)?enter\s+(?:the\s+)?(?:house|building|hospital|school|shop|store)$/i, action: 'enter_building', category: 'interaction', description: 'Enter building', voiceResponse: 'Entering the building.' },

  // ═══════════════════════════════════════════════════════════════════════════
  // EMERGENCY SERVICES & PUBLIC BUILDINGS
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?(?:fire\s+station|fire\s+department)$/i, action: 'build_fire_station', category: 'action', description: 'Build fire station', voiceResponse: 'Constructing a fire station with emergency vehicles.' },
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?police\s+station$/i, action: 'build_police_station', category: 'action', description: 'Build police station', voiceResponse: 'Constructing a police station.' },
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?(?:temple|church|mosque|synagogue|shrine)$/i, action: 'build_religious', category: 'action', description: 'Build religious building', voiceResponse: 'Constructing a place of worship.' },
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?(?:gym|fitness\s+center|sports\s+center)$/i, action: 'build_gym', category: 'action', description: 'Build gym', voiceResponse: 'Constructing a fitness center.' },
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?(?:restaurant|cafe|coffee\s+shop)$/i, action: 'build_restaurant', category: 'action', description: 'Build restaurant', voiceResponse: 'Constructing a dining establishment.' },
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?(?:library|museum|gallery)$/i, action: 'build_cultural', category: 'action', description: 'Build cultural building', voiceResponse: 'Constructing a cultural center.' },
  { pattern: /^(?:zoe\s+)?build\s+(?:a\s+)?(?:stadium|arena|sports\s+complex)$/i, action: 'build_stadium', category: 'action', description: 'Build stadium', voiceResponse: 'Constructing a sports arena.' },

  // ═══════════════════════════════════════════════════════════════════════════
  // GEOLOCATION & MAP INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?show\s+(?:my\s+)?(?:current\s+)?location$/i, action: 'show_location', category: 'control', description: 'Show current location', voiceResponse: 'Displaying your current location on the map.' },
  { pattern: /^(?:zoe\s+)?(?:use|sync)\s+(?:my\s+)?(?:real\s+)?geolocation$/i, action: 'use_geolocation', category: 'control', description: 'Use real geolocation', voiceResponse: 'Syncing world with your real-world location.' },
  { pattern: /^(?:zoe\s+)?(?:show|open)\s+(?:the\s+)?map$/i, action: 'show_map', category: 'control', description: 'Show map', voiceResponse: 'Opening world map.' },
  { pattern: /^(?:zoe\s+)?(?:teleport|go)\s+to\s+real[\s-]?world\s+(.+)$/i, action: 'teleport_real_place', category: 'navigation', description: 'Teleport to real place', voiceResponse: 'Recreating real-world location in VR.' },
  { pattern: /^(?:zoe\s+)?recreate\s+(.+)\s+(?:city|town|area)$/i, action: 'recreate_place', category: 'action', description: 'Recreate real place', voiceResponse: 'Generating virtual replica of the location.' },

  // ═══════════════════════════════════════════════════════════════════════════
  // HELP & INFO COMMANDS
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?(?:show|open)\s+(?:vr\s+)?help$/i, action: 'show_help', category: 'control', description: 'Show VR help', voiceResponse: 'Opening VR help panel.' },
  { pattern: /^(?:zoe\s+)?(?:show|display)\s+commands?$/i, action: 'show_commands', category: 'control', description: 'Show commands list', voiceResponse: 'Displaying available commands.' },
  { pattern: /^(?:zoe\s+)?(?:show|display)\s+(?:vr\s+)?controls?$/i, action: 'show_controls', category: 'control', description: 'Show VR controls', voiceResponse: 'Displaying VR controls.' },
  { pattern: /^(?:zoe\s+)?what\s+can\s+(?:i|you)\s+do$/i, action: 'what_can_do', category: 'control', description: 'What can I do?', voiceResponse: 'You can walk, run, jump, fly, drive, build cities, control weather, change seasons, enter buildings and vehicles, and explore the VR world like the real world.' },
  { pattern: /^(?:zoe\s+)?tutorial$/i, action: 'show_tutorial', category: 'control', description: 'Show tutorial', voiceResponse: 'Opening VR tutorial.' },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIAL OMEGA COMMANDS
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?bio[\s-]?sync$/i, action: 'bio_sync', category: 'control', description: 'Activate Bio-Sync', voiceResponse: 'Initiating Bio-Sync restoration.' },
  { pattern: /^(?:zoe\s+)?restore\s+integrity$/i, action: 'restore_integrity', category: 'control', description: 'Restore integrity', voiceResponse: 'Restoring biological integrity.' },
  { pattern: /^(?:zoe\s+)?(?:show|view)\s+memories?$/i, action: 'show_memories', category: 'interaction', description: 'Show memories', voiceResponse: 'Displaying memory engrams.' },
  { pattern: /^(?:zoe\s+)?(?:select|view)\s+engram$/i, action: 'select_engram', category: 'interaction', description: 'Select memory engram', voiceResponse: 'Focusing on memory engram.' },
  { pattern: /^(?:zoe\s+)?(?:show|view)\s+holo[\s-]?wall$/i, action: 'show_holowall', category: 'interaction', description: 'Show Holo-Wall', voiceResponse: 'Displaying ECN timeline on Holo-Wall.' },

  // ═══════════════════════════════════════════════════════════════════════════
  // PANEL CONTROL COMMANDS - Open/Close/Toggle Windows
  // ═══════════════════════════════════════════════════════════════════════════
  // Voice Commands Panel
  { pattern: /^(?:zoe\s+)?(?:open|show|expand)\s+(?:vr\s+)?voice\s+(?:commands?|panel)$/i, action: 'open_voice_panel', category: 'control', description: 'Open voice commands panel', voiceResponse: 'Opening voice commands panel.' },
  { pattern: /^(?:zoe\s+)?(?:close|hide|collapse)\s+(?:vr\s+)?voice\s+(?:commands?|panel)$/i, action: 'close_voice_panel', category: 'control', description: 'Close voice commands panel', voiceResponse: 'Closing voice commands panel.' },
  { pattern: /^(?:zoe\s+)?toggle\s+(?:vr\s+)?voice\s+(?:commands?|panel)$/i, action: 'toggle_voice_panel', category: 'control', description: 'Toggle voice commands panel', voiceResponse: 'Toggling voice commands panel.' },
  
  // Controls Panel
  { pattern: /^(?:zoe\s+)?(?:open|show|expand)\s+(?:vr\s+)?controls?\s+panel$/i, action: 'open_controls_panel', category: 'control', description: 'Open controls panel', voiceResponse: 'Opening VR controls panel.' },
  { pattern: /^(?:zoe\s+)?(?:close|hide|collapse)\s+(?:vr\s+)?controls?\s+panel$/i, action: 'close_controls_panel', category: 'control', description: 'Close controls panel', voiceResponse: 'Closing VR controls panel.' },
  { pattern: /^(?:zoe\s+)?toggle\s+(?:vr\s+)?controls?\s+panel$/i, action: 'toggle_controls_panel', category: 'control', description: 'Toggle controls panel', voiceResponse: 'Toggling controls panel.' },
  
  // Wallet / Karma Forge Panel
  { pattern: /^(?:zoe\s+)?(?:open|show)\s+(?:the\s+)?(?:wallet|karma\s+(?:forge|converter)|economy)$/i, action: 'open_wallet', category: 'control', description: 'Open wallet/karma forge', voiceResponse: 'Opening Karma Forge wallet.' },
  { pattern: /^(?:zoe\s+)?(?:close|hide)\s+(?:the\s+)?(?:wallet|karma\s+(?:forge|converter)|economy)$/i, action: 'close_wallet', category: 'control', description: 'Close wallet', voiceResponse: 'Closing wallet.' },
  { pattern: /^(?:zoe\s+)?toggle\s+(?:the\s+)?(?:wallet|karma\s+forge)$/i, action: 'toggle_wallet', category: 'control', description: 'Toggle wallet', voiceResponse: 'Toggling wallet panel.' },
  
  // Memory/Engram Details Panel
  { pattern: /^(?:zoe\s+)?(?:close|hide|dismiss)\s+(?:the\s+)?(?:memory|engram)\s+(?:details?|panel|window)$/i, action: 'close_memory_panel', category: 'control', description: 'Close memory details', voiceResponse: 'Closing memory details.' },
  
  // General Panel Commands
  { pattern: /^(?:zoe\s+)?(?:close|hide)\s+(?:all\s+)?(?:panels?|windows?)$/i, action: 'close_all_panels', category: 'control', description: 'Close all panels', voiceResponse: 'Closing all panels.' },
  { pattern: /^(?:zoe\s+)?(?:minimize|collapse)\s+(?:all\s+)?(?:panels?|windows?)$/i, action: 'minimize_all_panels', category: 'control', description: 'Minimize all panels', voiceResponse: 'Minimizing all panels.' },
  { pattern: /^(?:zoe\s+)?(?:reset|restore)\s+(?:panel|window)\s+positions?$/i, action: 'reset_panel_positions', category: 'control', description: 'Reset panel positions', voiceResponse: 'Resetting panel positions to default.' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════
export const useVRVoiceCommands = (isVRActive: boolean, userId?: string) => {
  const isListeningRef = useRef(false);
  
  // Log VR command to DHF
  const logVRCommand = useCallback(async (command: string, action: string) => {
    if (!userId) return;
    
    try {
      await supabase.from('behavioral_events').insert({
        user_id: userId,
        event_type: 'vr_voice_command',
        event_category: 'vr_interaction',
        metadata: { command, action, timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.error('[VR Voice] DHF log error:', error);
    }
  }, [userId]);

  // Process VR voice command
  const processVRCommand = useCallback((transcript: string): { matched: boolean; action?: string; response?: string } => {
    const cleanTranscript = transcript.toLowerCase().trim();
    
    for (const cmd of VR_COMMANDS) {
      if (cmd.pattern.test(cleanTranscript)) {
        // Dispatch VR action event
        window.dispatchEvent(new CustomEvent('vr-voice-command', {
          detail: { action: cmd.action, command: cleanTranscript, category: cmd.category }
        }));
        
        // Speak response
        speakAsZoe(cmd.voiceResponse);
        
        // Log to DHF
        logVRCommand(cleanTranscript, cmd.action);
        
        toast.success(`VR: ${cmd.description}`, { duration: 2000 });
        
        return { matched: true, action: cmd.action, response: cmd.voiceResponse };
      }
    }
    
    return { matched: false };
  }, [logVRCommand]);

  // Get commands by category
  const getCommandsByCategory = useCallback((category: VRCommand['category']) => {
    return VR_COMMANDS.filter(cmd => cmd.category === category);
  }, []);

  // Get all commands grouped by category
  const getAllCommandsGrouped = useCallback(() => {
    const categories: Record<string, VRCommand[]> = {
      navigation: [],
      movement: [],
      action: [],
      control: [],
      environment: [],
      interaction: []
    };
    
    VR_COMMANDS.forEach(cmd => {
      categories[cmd.category].push(cmd);
    });
    
    return categories;
  }, []);

  // Listen for VR activation commands globally
  useEffect(() => {
    const handleGlobalVoiceCommand = (event: CustomEvent) => {
      const transcript = event.detail?.transcript || event.detail?.command || '';
      if (!transcript) return;
      
      // Check for VR activation commands
      if (/(?:zoe\s+)?(?:open|enter|launch|activate)\s+(?:vr|vr\s+world|virtual\s+reality)/i.test(transcript)) {
        window.dispatchEvent(new CustomEvent('navigate-to-omega'));
        speakAsZoe('Entering VR OMEGA World. Prepare for immersive experience.');
        toast.success('Opening VR OMEGA World');
      }
    };
    
    window.addEventListener('zoe-global-command' as any, handleGlobalVoiceCommand);
    return () => window.removeEventListener('zoe-global-command' as any, handleGlobalVoiceCommand);
  }, []);

  return {
    processVRCommand,
    getCommandsByCategory,
    getAllCommandsGrouped,
    commands: VR_COMMANDS,
    isVRActive
  };
};

export default useVRVoiceCommands;
