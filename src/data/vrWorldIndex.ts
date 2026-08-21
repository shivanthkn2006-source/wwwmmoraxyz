/**
 * VR WORLD SEARCH INDEX
 * Static, zero-cost registry of everything that exists inside the M'mora VR
 * OMEGA world so platform-structure queries ("what components are in the VR
 * world", "is there a metro railway station", "mountains") return real answers.
 */

export interface VrWorldComponent {
  id: string;
  name: string;
  group:
    | 'transit'
    | 'terrain'
    | 'city'
    | 'avatars'
    | 'environment'
    | 'vehicles'
    | 'controls'
    | 'orbital';
  description: string;
  keywords: string[];
  route: string;
}

const VR_ROUTE = '/zoe-omega';

export const VR_WORLD_COMPONENTS: VrWorldComponent[] = [
  { id: 'metro-train', name: 'Metro Train System', group: 'transit', description: 'Driverless metro trains running the elevated city loop', keywords: ['metro', 'train', 'railway', 'rail', 'transit', 'station'], route: VR_ROUTE },
  { id: 'metro-flyover', name: 'Metro Flyover Track', group: 'transit', description: 'Elevated flyover rail track and viaduct structure', keywords: ['metro', 'flyover', 'track', 'railway', 'bridge', 'viaduct'], route: VR_ROUTE },
  { id: 'metro-signs', name: 'Metro Direction Signs', group: 'transit', description: 'Station signage and platform direction boards', keywords: ['metro', 'sign', 'station', 'direction', 'board', 'railway'], route: VR_ROUTE },
  { id: 'platform-commuters', name: 'Platform Commuters', group: 'transit', description: 'Crowd of commuters waiting on the railway station platform', keywords: ['station', 'platform', 'commuters', 'crowd', 'railway', 'passengers'], route: VR_ROUTE },
  { id: 'heritage-train', name: 'Scenic Heritage Train', group: 'transit', description: 'Steam-era heritage train on the mountain scenic route', keywords: ['train', 'heritage', 'steam', 'scenic', 'railway'], route: VR_ROUTE },
  { id: 'city-bus', name: 'City Bus System', group: 'transit', description: 'Bus routes and stops across the city grid', keywords: ['bus', 'transit', 'stop', 'route'], route: VR_ROUTE },

  { id: 'everest-range', name: 'Everest Mountain Range', group: 'terrain', description: 'Snow-capped Everest-scale mountain range on the horizon', keywords: ['mountain', 'mountains', 'everest', 'himalaya', 'snow', 'peak', 'range'], route: VR_ROUTE },
  { id: 'rock-formations', name: 'Mountain Rock Formations', group: 'terrain', description: 'Cliff faces, boulders and rock formations in the highlands', keywords: ['mountain', 'rock', 'cliff', 'boulder', 'formation', 'terrain'], route: VR_ROUTE },
  { id: 'rpo-terrain', name: 'Ready Player One Terrain', group: 'terrain', description: 'Base procedural terrain and heightmap of the world', keywords: ['terrain', 'ground', 'landscape', 'world', 'heightmap'], route: VR_ROUTE },
  { id: 'cycling-trail', name: 'Cycling Trail Terrain', group: 'terrain', description: 'Cycling and hiking trails winding through the hills', keywords: ['trail', 'cycling', 'bike', 'hiking', 'path'], route: VR_ROUTE },

  { id: 'cyber-city', name: 'Procedural Cyber City', group: 'city', description: 'Neon procedural cyber city core', keywords: ['city', 'cyber', 'neon', 'buildings', 'downtown'], route: VR_ROUTE },
  { id: 'city-grid', name: 'Expanded City Grid', group: 'city', description: 'Expanded street grid with blocks and intersections', keywords: ['city', 'grid', 'streets', 'blocks', 'roads'], route: VR_ROUTE },
  { id: 'market-district', name: 'City Market District', group: 'city', description: 'Open-air market district with stalls and vendors', keywords: ['market', 'bazaar', 'shops', 'stalls', 'district'], route: VR_ROUTE },
  { id: 'skyline', name: 'City Skyline Backdrop', group: 'city', description: 'Distant skyline silhouette backdrop', keywords: ['skyline', 'city', 'backdrop', 'skyscrapers'], route: VR_ROUTE },
  { id: 'buildings', name: 'Procedural & Seasonal Buildings', group: 'city', description: 'Procedurally generated buildings that redress per season', keywords: ['buildings', 'architecture', 'seasonal', 'houses'], route: VR_ROUTE },
  { id: 'benches-lights', name: 'Street Furniture & Lighting', group: 'city', description: 'Benches, street lights and pavement props', keywords: ['bench', 'street light', 'lamp', 'furniture', 'props'], route: VR_ROUTE },
  { id: 'zoo', name: 'Animal Zoo System', group: 'city', description: 'Animal zoo enclosure with roaming creatures', keywords: ['zoo', 'animals', 'wildlife', 'creatures'], route: VR_ROUTE },
  { id: 'yellowstone-sign', name: 'Yellowstone Sign Board', group: 'city', description: 'Landmark national-park style sign board', keywords: ['yellowstone', 'sign', 'landmark', 'park'], route: VR_ROUTE },

  { id: 'local-avatar', name: 'Local Player Avatar', group: 'avatars', description: 'Your own embodied avatar and controller', keywords: ['avatar', 'player', 'me', 'body', 'character'], route: VR_ROUTE },
  { id: 'npc-avatars', name: 'NPC Avatar System', group: 'avatars', description: 'Non-player characters populating the world', keywords: ['npc', 'characters', 'people', 'avatars'], route: VR_ROUTE },
  { id: 'crowd-avatars', name: 'Crowd Avatar System', group: 'avatars', description: 'Dense ambient crowds in public spaces', keywords: ['crowd', 'people', 'ambient', 'users'], route: VR_ROUTE },
  { id: 'humanoids', name: 'Realistic Humanoid Avatars', group: 'avatars', description: 'High-fidelity humanoid avatar rigs (Leon, Helena, Party models)', keywords: ['humanoid', 'realistic', 'leon', 'helena', 'rig', 'friends'], route: VR_ROUTE },
  { id: 'seasonal-avatars', name: 'Seasonal Avatar System', group: 'avatars', description: 'Avatar outfits that change with the world season', keywords: ['seasonal', 'outfit', 'clothes', 'avatar'], route: VR_ROUTE },

  { id: 'seasons', name: 'Seasons System', group: 'environment', description: 'Full seasonal cycle driving world dressing', keywords: ['season', 'winter', 'summer', 'autumn', 'spring'], route: VR_ROUTE },
  { id: 'weather', name: 'Weather Effects', group: 'environment', description: 'Rain, snow, fog and wind effects', keywords: ['weather', 'rain', 'snow', 'fog', 'storm'], route: VR_ROUTE },
  { id: 'sun-cycle', name: 'Sun Light Cycle', group: 'environment', description: 'Day/night sun lighting cycle', keywords: ['sun', 'day', 'night', 'light', 'time'], route: VR_ROUTE },
  { id: 'night-sky', name: 'Night Sky System', group: 'environment', description: 'Star field, moon and constellations', keywords: ['night', 'sky', 'stars', 'moon', 'constellation'], route: VR_ROUTE },
  { id: 'post-fx', name: 'Cinematic Post Processing', group: 'environment', description: 'Bloom, depth of field and cinematic grading', keywords: ['cinematic', 'bloom', 'post processing', 'graphics'], route: VR_ROUTE },
  { id: 'splats', name: 'Gaussian Splat Viewer', group: 'environment', description: 'Gaussian splat photoreal scene loader', keywords: ['gaussian', 'splat', 'photoreal', 'scan'], route: VR_ROUTE },

  { id: 'vehicles', name: 'Vehicle System', group: 'vehicles', description: 'Drivable cars and traffic vehicles', keywords: ['vehicle', 'car', 'traffic', 'drive'], route: VR_ROUTE },
  { id: 'motorcycle', name: 'Motorcycle System', group: 'vehicles', description: 'Rideable motorcycles with physics', keywords: ['motorcycle', 'bike', 'ride'], route: VR_ROUTE },
  { id: 'f1', name: 'F1 Circuit System', group: 'vehicles', description: 'Formula 1 style race circuit', keywords: ['f1', 'race', 'circuit', 'track', 'racing'], route: VR_ROUTE },

  { id: 'vr-controls', name: 'VR Control System', group: 'controls', description: 'Joysticks, zoom lens, look controls and WebXR support', keywords: ['controls', 'joystick', 'webxr', 'headset', 'zoom'], route: VR_ROUTE },
  { id: 'voice-narrator', name: 'Proximity Voice Narrator', group: 'controls', description: 'Zoe narrates places as you approach them', keywords: ['voice', 'narrator', 'zoe', 'guide', 'proximity'], route: VR_ROUTE },
  { id: 'time-manipulation', name: 'Time Manipulation Bar', group: 'controls', description: 'Scrub world time forward and backward', keywords: ['time', 'manipulation', 'clock', 'scrub'], route: VR_ROUTE },
  { id: 'health-monitor', name: 'VR System Health Monitor', group: 'controls', description: 'Live FPS, memory and subsystem health readout', keywords: ['health', 'fps', 'performance', 'monitor', 'debug'], route: VR_ROUTE },

  { id: 'orbital-command', name: 'Orbital Command', group: 'orbital', description: 'Satellite orbit view and mission command deck', keywords: ['orbital', 'satellite', 'space', 'orbit', 'command'], route: VR_ROUTE },
  { id: 'satellite-map', name: 'Satellite Map View', group: 'orbital', description: 'Top-down satellite map with waypoints', keywords: ['satellite', 'map', 'waypoint', 'navigation'], route: VR_ROUTE },
  { id: 'solar-system', name: 'Solar System Explorer', group: 'orbital', description: 'Explorable solar system with planets', keywords: ['solar', 'planets', 'system', 'space', 'explore'], route: VR_ROUTE },
];

export const VR_GROUP_LABELS: Record<VrWorldComponent['group'], string> = {
  transit: 'Transit & railway',
  terrain: 'Terrain & mountains',
  city: 'City & districts',
  avatars: 'Avatars & people',
  environment: 'Environment & sky',
  vehicles: 'Vehicles',
  controls: 'Controls & HUD',
  orbital: 'Orbital & space',
};

const VR_SCOPE_WORDS = ['vr', 'vr world', 'world', 'omega', 'metaverse', '3d', 'virtual'];

/** True when a query is asking about the VR world / platform structure. */
export function isVrWorldQuery(query: string): boolean {
  const q = query.toLowerCase();
  return VR_SCOPE_WORDS.some((word) => q.includes(word));
}

/** Keyword + name match over the VR registry. */
export function searchVrWorld(query: string, limit = 8): VrWorldComponent[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  const tokens = q.split(/\s+/).filter((t) => t.length >= 3);

  const scored = VR_WORLD_COMPONENTS.map((component) => {
    const haystack = `${component.name} ${component.description} ${component.keywords.join(' ')}`.toLowerCase();
    let score = 0;
    if (haystack.includes(q)) score += 5;
    for (const token of tokens) if (haystack.includes(token)) score += 2;
    if (component.keywords.some((k) => k === q)) score += 4;
    return { component, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  // A broad "vr world" query lists the whole world rather than nothing.
  if (!scored.length && isVrWorldQuery(q)) {
    return VR_WORLD_COMPONENTS.slice(0, limit);
  }
  return scored.slice(0, limit).map((entry) => entry.component);
}

export function vrGroupCounts(): Array<{ group: VrWorldComponent['group']; count: number }> {
  const counts = new Map<VrWorldComponent['group'], number>();
  for (const component of VR_WORLD_COMPONENTS) {
    counts.set(component.group, (counts.get(component.group) || 0) + 1);
  }
  return Array.from(counts.entries()).map(([group, count]) => ({ group, count }));
}
