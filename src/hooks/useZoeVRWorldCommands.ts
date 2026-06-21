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
  { pattern: /^(?:zoe\s+)?(?:5\s*x\s*(?:zoom|lens)|zoom\s*5\s*x|telescope|binoculars?)$/i, action: 'zoom_5x', category: 'camera', description: '5X zoom lens', voiceResponse: 'Activating 5X zoom lens.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:normal\s*zoom|reset\s*zoom|1\s*x\s*zoom|disable\s*(?:zoom|lens))$/i, action: 'zoom_1x', category: 'camera', description: 'Normal zoom', voiceResponse: 'Returning to normal zoom.', priority: 10 },
  { pattern: /^(?:zoe\s+)?look\s+up$/i, action: 'look_up', category: 'camera', description: 'Look up', voiceResponse: 'Looking up.', priority: 8 },
  { pattern: /^(?:zoe\s+)?look\s+down$/i, action: 'look_down', category: 'camera', description: 'Look down', voiceResponse: 'Looking down.', priority: 8 },
  { pattern: /^(?:zoe\s+)?look\s+left$/i, action: 'look_left', category: 'camera', description: 'Look left', voiceResponse: 'Looking left.', priority: 8 },
  { pattern: /^(?:zoe\s+)?look\s+right$/i, action: 'look_right', category: 'camera', description: 'Look right', voiceResponse: 'Looking right.', priority: 8 },
  { pattern: /^(?:zoe\s+)?look\s+around$/i, action: 'look_around', category: 'camera', description: 'Look around 360', voiceResponse: 'Scanning surroundings.', priority: 8 },
  { pattern: /^(?:zoe\s+)?reset\s+(?:view|camera)$/i, action: 'reset_camera', category: 'camera', description: 'Reset camera', voiceResponse: 'Resetting camera view.', priority: 9 },
  { pattern: /^(?:zoe\s+)?first\s+person\s*(?:view)?$/i, action: 'first_person_view', category: 'camera', description: 'First person view', voiceResponse: 'Switching to first person view.', priority: 9 },
  { pattern: /^(?:zoe\s+)?third\s+person\s*(?:view)?$/i, action: 'third_person_view', category: 'camera', description: 'Third person view', voiceResponse: 'Switching to third person view.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:satellite|satellite\s+view|show\s+satellite|bird'?s\s*eye\s*view)$/i, action: 'satellite_view', category: 'camera', description: 'Satellite view', voiceResponse: 'Switching to satellite bird\'s eye view.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:aerial|aerial\s+view|drone\s+view)$/i, action: 'aerial_view', category: 'camera', description: 'Aerial view', voiceResponse: 'Switching to aerial drone view.', priority: 9 },
  { pattern: /^(?:zoe\s+)?(?:mountain\s+view|mountain\s+top\s+view|go\s+to\s+mountains?)$/i, action: 'mountain_view', category: 'navigation', description: 'Go to mountains', voiceResponse: 'Taking you to the mountain range.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:mountain\s+summit\s+view|summit\s+view|top\s+of\s+mountain)$/i, action: 'mountain_summit_view', category: 'navigation', description: 'Mountain summit panorama', voiceResponse: 'Taking you to mountain summit view.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:show\s+city\s+core|go\s+to\s+city\s+center)$/i, action: 'city_center_view', category: 'navigation', description: 'Go to city center', voiceResponse: 'Taking you to the city core.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:guide\s+me|vr\s+guide|help\s+me\s+explore)$/i, action: 'guide_vr_world', category: 'system', description: 'VR guided tour', voiceResponse: 'Starting a quick VR navigation guide.', priority: 10 },
  
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
  // "TAKE ME TO" NAVIGATION - Zoe guides user to any POI
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^(?:zoe\s+)?(?:take\s+me\s+to|go\s+to|navigate\s+to|walk\s+(?:me\s+)?to)\s+(?:the\s+)?(?:kfc|kentucky\s+fried)$/i, action: 'navigate_to_kfc', category: 'navigation', description: 'Go to KFC', voiceResponse: 'Taking you to KFC. Follow me.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:take\s+me\s+to|go\s+to|navigate\s+to|walk\s+(?:me\s+)?to)\s+(?:the\s+)?(?:mcdonalds?|mac\s*donalds?)$/i, action: 'navigate_to_mcdonalds', category: 'navigation', description: 'Go to McDonalds', voiceResponse: 'Taking you to McDonalds. Follow me.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:take\s+me\s+to|go\s+to|navigate\s+to|walk\s+(?:me\s+)?to)\s+(?:the\s+)?starbucks$/i, action: 'navigate_to_starbucks', category: 'navigation', description: 'Go to Starbucks', voiceResponse: 'Taking you to Starbucks. Follow me.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:take\s+me\s+to|go\s+to|navigate\s+to|walk\s+(?:me\s+)?to)\s+(?:the\s+)?(?:hospital|general\s+hospital)$/i, action: 'navigate_to_hospital', category: 'navigation', description: 'Go to hospital', voiceResponse: 'Taking you to the General Hospital. Follow me.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:take\s+me\s+to|go\s+to|navigate\s+to|walk\s+(?:me\s+)?to)\s+(?:the\s+)?(?:hotel|hyatt|marriott|grand\s+hyatt)$/i, action: 'navigate_to_hotel', category: 'navigation', description: 'Go to hotel', voiceResponse: 'Taking you to the Grand Hyatt Hotel. Follow me.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:take\s+me\s+to|go\s+to|navigate\s+to|walk\s+(?:me\s+)?to)\s+(?:the\s+)?(?:school|central\s+school)$/i, action: 'navigate_to_school', category: 'navigation', description: 'Go to school', voiceResponse: 'Taking you to Central School. Follow me.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:take\s+me\s+to|go\s+to|navigate\s+to|walk\s+(?:me\s+)?to)\s+(?:the\s+)?(?:church|st\.?\s*mary)$/i, action: 'navigate_to_church', category: 'navigation', description: 'Go to church', voiceResponse: 'Taking you to St. Mary Church. Follow me.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:take\s+me\s+to|go\s+to|navigate\s+to|walk\s+(?:me\s+)?to)\s+(?:the\s+)?(?:temple|shiva\s+temple)$/i, action: 'navigate_to_temple', category: 'navigation', description: 'Go to temple', voiceResponse: 'Taking you to Shiva Temple. Follow me.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:take\s+me\s+to|go\s+to|navigate\s+to|walk\s+(?:me\s+)?to)\s+(?:the\s+)?(?:metro|metro\s+station|train\s+station|railway)$/i, action: 'navigate_to_metro', category: 'navigation', description: 'Go to metro station', voiceResponse: 'Taking you to the nearest metro station. Follow me.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:take\s+me\s+to|go\s+to|navigate\s+to|walk\s+(?:me\s+)?to)\s+(?:the\s+)?(?:park|central\s+park)$/i, action: 'navigate_to_park', category: 'navigation', description: 'Go to park', voiceResponse: 'Taking you to Central Park. Follow me.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:take\s+me\s+to|go\s+to|navigate\s+to|walk\s+(?:me\s+)?to)\s+(?:the\s+)?(?:stadium|city\s+stadium)$/i, action: 'navigate_to_stadium', category: 'navigation', description: 'Go to stadium', voiceResponse: 'Taking you to City Stadium. Follow me.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:take\s+me\s+to|go\s+to|navigate\s+to|walk\s+(?:me\s+)?to)\s+(?:the\s+)?(?:fire\s+station)$/i, action: 'navigate_to_fire_station', category: 'navigation', description: 'Go to fire station', voiceResponse: 'Taking you to Fire Station. Follow me.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:take\s+me\s+to|go\s+to|navigate\s+to|walk\s+(?:me\s+)?to)\s+(?:the\s+)?(?:police|police\s+(?:station|hq))$/i, action: 'navigate_to_police', category: 'navigation', description: 'Go to police HQ', voiceResponse: 'Taking you to Police Headquarters. Follow me.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:take\s+me\s+to|go\s+to|navigate\s+to|walk\s+(?:me\s+)?to)\s+(?:the\s+)?(?:cafe|city\s+caf[eé])$/i, action: 'navigate_to_cafe', category: 'navigation', description: 'Go to café', voiceResponse: 'Taking you to the nearest café. Follow me.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:take\s+me\s+to|go\s+to|navigate\s+to|walk\s+(?:me\s+)?to)\s+(?:the\s+)?(?:omega\s+tower|tower|skyline|high\s*rise)$/i, action: 'navigate_to_tower', category: 'navigation', description: 'Go to Omega Tower', voiceResponse: 'Taking you to Omega Tower. Follow me.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:take\s+me\s+to|go\s+to|navigate\s+to|walk\s+(?:me\s+)?to)\s+(?:the\s+)?(?:fashion\s+store|fashion\s+boutique|boutique)$/i, action: 'navigate_to_fashion', category: 'navigation', description: 'Go to fashion store', voiceResponse: 'Taking you to the fashion boutique. Follow me.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:take\s+me\s+to|go\s+to|navigate\s+to|walk\s+(?:me\s+)?to)\s+(?:the\s+)?(?:pet\s+shop|pet\s+store)$/i, action: 'navigate_to_pet_shop', category: 'navigation', description: 'Go to pet shop', voiceResponse: 'Taking you to the pet shop. Follow me.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:take\s+me\s+to|go\s+to|navigate\s+to|walk\s+(?:me\s+)?to)\s+(?:the\s+)?(?:laundry|laundry\s+store)$/i, action: 'navigate_to_laundry', category: 'navigation', description: 'Go to laundry', voiceResponse: 'Taking you to the laundry store. Follow me.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:take\s+me\s+to|go\s+to|navigate\s+to|walk\s+(?:me\s+)?to)\s+(?:the\s+)?(?:vegetable\s+market|veggie\s+market)$/i, action: 'navigate_to_vegetable_market', category: 'navigation', description: 'Go to vegetable market', voiceResponse: 'Taking you to the vegetable market. Follow me.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:take\s+me\s+to|go\s+to|navigate\s+to|walk\s+(?:me\s+)?to)\s+(?:the\s+)?(?:fruit\s+market)$/i, action: 'navigate_to_fruit_market', category: 'navigation', description: 'Go to fruit market', voiceResponse: 'Taking you to the fruit market. Follow me.', priority: 10 },
  
  // F1 Circuit
  { pattern: /^(?:zoe\s+)?(?:take\s+me\s+to|go\s+to|navigate\s+to)\s+(?:the\s+)?(?:f1|formula\s*1|race\s*track|omega\s*circuit|circuit)$/i, action: 'navigate_to_f1', category: 'navigation', description: 'Go to F1 circuit', voiceResponse: 'Taking you to the F1 Omega Circuit.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:enter|get\s+in(?:to)?)\s+(?:the\s+)?(?:f1\s+)?car$/i, action: 'enter_f1_car', category: 'avatar', description: 'Enter F1 car', voiceResponse: 'Getting into the F1 car. Buckle up.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:exit|get\s+out(?:\s+of)?)\s+(?:the\s+)?(?:f1\s+)?car$/i, action: 'exit_f1_car', category: 'avatar', description: 'Exit F1 car', voiceResponse: 'Exiting the F1 car.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:start|begin)\s+(?:the\s+)?(?:f1\s+)?race$/i, action: 'start_f1_race', category: 'system', description: 'Start F1 race', voiceResponse: 'Lights out and away we go.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:pit\s*stop|box\s+box)$/i, action: 'f1_pit_stop', category: 'system', description: 'F1 pit stop', voiceResponse: 'Pit stop initiated.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:f1\s+)?standings?$/i, action: 'f1_standings', category: 'system', description: 'F1 standings', voiceResponse: 'Reporting current race standings.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:f1\s+)?lap\s*time$/i, action: 'f1_lap_time', category: 'system', description: 'F1 lap time', voiceResponse: 'Reporting lap time.', priority: 10 },
  { pattern: /^(?:zoe\s+)?(?:f1\s+)?(?:car\s+status|tire\s+wear|tyre\s+wear)$/i, action: 'f1_car_status', category: 'system', description: 'F1 car status', voiceResponse: 'Reporting car status.', priority: 10 },

  // Metro / Train (high-priority so these do not fall through to generic "go to <location>")
  { pattern: /^(?:zoe\s+)?(?:take\s+me\s+to|go\s+to|navigate\s+to|walk\s+(?:me\s+)?to)\s+(?:the\s+)?(?:metro\s+)?(?:entrance|station\s+entrance|platform\s+entrance|stairs?|steps?|escalator|elevator|lift)$/i, action: 'navigate_to_metro_entrance', category: 'navigation', description: 'Go to metro entrance', voiceResponse: 'Taking you to the metro entrance with stairs, escalator, and elevator access.', priority: 11 },
  { pattern: /^(?:zoe\s+)?(?:board|enter|get\s+(?:on|in(?:to)?)|go\s+inside)\s+(?:the\s+)?(?:metro|train|carriage|coach)$/i, action: 'board_train', category: 'navigation', description: 'Board metro train', voiceResponse: 'Boarding the metro train now. Please mind the gap.', priority: 11 },
  { pattern: /^(?:zoe\s+)?(?:exit|leave|get\s+(?:off|out(?:\s+of)?)|step\s+out)\s+(?:the\s+)?(?:metro|train|carriage|coach)$/i, action: 'exit_train', category: 'navigation', description: 'Exit metro train', voiceResponse: 'Exiting the train to the nearest platform.', priority: 11 },
  { pattern: /^(?:zoe\s+)?(?:next|which)\s+(?:metro\s+)?station$/i, action: 'next_station', category: 'system', description: 'Next metro station', voiceResponse: 'Checking the next station now.', priority: 11 },
  { pattern: /^(?:zoe\s+)?(?:metro|train)\s+(?:status|schedule|timetable)$/i, action: 'metro_status', category: 'system', description: 'Metro line status', voiceResponse: 'All five metro trains are operating across fourteen stations.', priority: 11 },
  
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

    const emitMatch = (action: string, category: VRWorldVoiceCommand['category'], response: string, params: string | null = null) => {
      logVRWorldCommand(trimmedInput, action, category);
      speakAs(response);

      window.dispatchEvent(new CustomEvent('vr-world-voice-action', {
        detail: {
          action,
          command: trimmedInput,
          category,
          params,
        }
      }));

      toast.success(response, { duration: 2000 });
      return { matched: true, action, response };
    };

    // 1) Strict command table matching
    const sortedCommands = [...VR_WORLD_COMMANDS].sort((a, b) => (b.priority || 5) - (a.priority || 5));
    for (const cmd of sortedCommands) {
      const match = trimmedInput.match(cmd.pattern);
      if (!match) continue;

      let response = cmd.voiceResponse;
      if (match[1]) {
        response = response.replace('{location}', match[1])
          .replace('{query}', match[1])
          .replace('{store}', match[1]);
      }

      if (cmd.action === 'fly_to_location' || cmd.action === 'teleport_to') {
        const location = match[1];
        if (location) {
          smartFlyTo(location, { duration: 2000 });
        }
      }

      return emitMatch(cmd.action, cmd.category, response, match[1] || null);
    }

    // 2) Loose fallback matching for natural speech variants
    if (/(satellite|bird'?s\s*eye)/i.test(trimmedInput)) {
      return emitMatch('satellite_view', 'camera', 'Switching to satellite bird\'s eye view.');
    }
    if (/(aerial|drone\s*view|air\s*view)/i.test(trimmedInput)) {
      return emitMatch('aerial_view', 'camera', 'Switching to aerial drone view.');
    }
    if (/(mountain|summit|everest)/i.test(trimmedInput) && /(go|show|take|view|top|climb)/i.test(trimmedInput)) {
      if (/(summit|top)/i.test(trimmedInput)) {
        return emitMatch('mountain_summit_view', 'navigation', 'Taking you to mountain summit view.');
      }
      return emitMatch('mountain_view', 'navigation', 'Taking you to the mountain range.');
    }
    if (/(city\s*core|city\s*center|downtown)/i.test(trimmedInput)) {
      return emitMatch('city_center_view', 'navigation', 'Taking you to the city core.');
    }
    if (/(guide\s*me|help\s*me\s*explore|tour\s*the\s*vr|how\s*to\s*control)/i.test(trimmedInput)) {
      return emitMatch('guide_vr_world', 'system', 'Starting a quick VR navigation guide.');
    }

    // 3) Ultra-loose POI shortcuts: "Zoe kfc", "kfc", "hospital", "metro" etc.
    const poiShortcuts: Record<string, { action: string; name: string }> = {
      'kfc': { action: 'navigate_to_kfc', name: 'KFC' },
      'kentucky': { action: 'navigate_to_kfc', name: 'KFC' },
      'mcdonald': { action: 'navigate_to_mcdonalds', name: "McDonald's" },
      'mcdonalds': { action: 'navigate_to_mcdonalds', name: "McDonald's" },
      'mac donald': { action: 'navigate_to_mcdonalds', name: "McDonald's" },
      'starbucks': { action: 'navigate_to_starbucks', name: 'Starbucks' },
      'starbuck': { action: 'navigate_to_starbucks', name: 'Starbucks' },
      'hospital': { action: 'navigate_to_hospital', name: 'General Hospital' },
      'hotel': { action: 'navigate_to_hotel', name: 'Grand Hyatt Hotel' },
      'hyatt': { action: 'navigate_to_hotel', name: 'Grand Hyatt Hotel' },
      'marriott': { action: 'navigate_to_hotel', name: 'Marriott Hotel' },
      'school': { action: 'navigate_to_school', name: 'Central School' },
      'church': { action: 'navigate_to_church', name: 'St. Mary Church' },
      'temple': { action: 'navigate_to_temple', name: 'Shiva Temple' },
      'metro': { action: 'navigate_to_metro', name: 'Metro Station' },
      'train': { action: 'navigate_to_metro', name: 'Metro Station' },
      'railway': { action: 'navigate_to_metro', name: 'Metro Station' },
      'metro entrance': { action: 'navigate_to_metro_entrance', name: 'Metro Entrance' },
      'station entrance': { action: 'navigate_to_metro_entrance', name: 'Metro Entrance' },
      'platform entrance': { action: 'navigate_to_metro_entrance', name: 'Metro Entrance' },
      'stairs': { action: 'navigate_to_metro_entrance', name: 'Metro Entrance Stairs' },
      'steps': { action: 'navigate_to_metro_entrance', name: 'Metro Entrance Steps' },
      'escalator': { action: 'navigate_to_metro_entrance', name: 'Metro Escalator' },
      'elevator': { action: 'navigate_to_metro_entrance', name: 'Metro Elevator' },
      'lift': { action: 'navigate_to_metro_entrance', name: 'Metro Elevator' },
      'inside train': { action: 'board_train', name: 'Metro Train' },
      'board train': { action: 'board_train', name: 'Metro Train' },
      'park': { action: 'navigate_to_park', name: 'Central Park' },
      'stadium': { action: 'navigate_to_stadium', name: 'City Stadium' },
      'fire station': { action: 'navigate_to_fire_station', name: 'Fire Station' },
      'police': { action: 'navigate_to_police', name: 'Police HQ' },
      'tower': { action: 'navigate_to_tower', name: 'Omega Tower' },
      'cafe': { action: 'navigate_to_cafe', name: 'City Café' },
      'coffee': { action: 'navigate_to_cafe', name: 'City Café' },
      'fashion': { action: 'navigate_to_fashion', name: 'Fashion Boutique' },
      'boutique': { action: 'navigate_to_fashion', name: 'Fashion Boutique' },
      'pet shop': { action: 'navigate_to_pet_shop', name: 'Pet Shop' },
      'pet store': { action: 'navigate_to_pet_shop', name: 'Pet Shop' },
      'laundry': { action: 'navigate_to_laundry', name: 'Laundry Store' },
      'vegetable market': { action: 'navigate_to_vegetable_market', name: 'Vegetable Market' },
      'veggie market': { action: 'navigate_to_vegetable_market', name: 'Vegetable Market' },
      'fruit market': { action: 'navigate_to_fruit_market', name: 'Fruit Market' },
      'f1': { action: 'navigate_to_f1', name: 'F1 Omega Circuit' },
      'formula 1': { action: 'navigate_to_f1', name: 'F1 Omega Circuit' },
      'race track': { action: 'navigate_to_f1', name: 'F1 Omega Circuit' },
    };

    // Strip "zoe" prefix for matching
    const cleaned = trimmedInput.replace(/^zoe\s+/i, '').trim();
    for (const [keyword, poi] of Object.entries(poiShortcuts)) {
      if (cleaned === keyword || cleaned.includes(keyword)) {
        return emitMatch(poi.action, 'navigation', `Taking you to ${poi.name}. Follow me.`);
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
