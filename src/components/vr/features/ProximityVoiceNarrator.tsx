/**
 * VR Proximity Voice Narrator - Runs inside R3F Canvas
 * =====================================================
 * Uses useFrame to monitor camera position and dispatches
 * vr-voice-narrate events for the parent VROMEGAWorld to handle
 * via Deepgram aura-2-janus-en voice narration.
 */

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

// Known zones in the VR world (expanded 1-mile city)
const ZONES = [
  { name: 'the Forest Zone', center: [-20, 0, -20], radius: 40, type: 'zone' as const, 
    announcement: 'You are entering the forest zone. Watch for wildlife. Lions, tigers, deer, and birds roam freely here.' },
  { name: 'Yellow Stone National Park', center: [2500, 0, -2000], radius: 800, type: 'landmark' as const,
    announcement: 'Yellow Stone National Park is ahead. A stunning geological formation with snow-capped peaks.' },
  { name: 'the Cycling Trail', center: [800, 0, -600], radius: 200, type: 'landmark' as const,
    announcement: 'You are approaching the cycling trail. A scenic route through rolling hills.' },
  { name: 'City Center', center: [0, 0, -20], radius: 60, type: 'zone' as const,
    announcement: 'Welcome to the city center. Offices, shops, restaurants, and residential buildings surround you.' },
  { name: 'the Metro Railway', center: [0, 0, 0], radius: 850, type: 'zone' as const,
    announcement: 'You can see the elevated metro railway. Trains run continuously between twelve stations across the city.' },
  { name: 'Hotel District', center: [500, 0, 0], radius: 100, type: 'zone' as const,
    announcement: 'Welcome to the hotel district. The Grand Hyatt and Marriott five star hotels are nearby.' },
  { name: 'the Restaurant Quarter', center: [-500, 0, 500], radius: 100, type: 'zone' as const,
    announcement: 'You are in the restaurant quarter. KFC, McDonalds, and Starbucks are within walking distance.' },
  { name: 'the F1 Omega Circuit', center: [1100, 0, -500], radius: 220, type: 'landmark' as const,
    announcement: 'Welcome to the F1 Omega Circuit! Five racing cars are competing on the track. You can watch from the grandstands or ask me to get you into a car.' },
];

interface ProximityVoiceNarratorProps {
  buildings: Array<{ id: string; type: string; position: [number, number, number] }>;
}

const ProximityVoiceNarrator: React.FC<ProximityVoiceNarratorProps> = ({ buildings }) => {
  const { camera } = useThree();
  const tickRef = useRef(0);
  const visitedZones = useRef<Set<string>>(new Set());
  const narratedBuildings = useRef<Set<string>>(new Set());
  const lastNarrationTick = useRef(0);
  
  // Reset visited zones periodically (every 2 minutes)
  const resetCounter = useRef(0);

  useFrame(() => {
    tickRef.current++;
    
    // Check every 90 frames (~1.5s at 60fps) for performance
    if (tickRef.current % 90 !== 0) return;
    
    // Throttle: only one narration every ~5 seconds
    if (tickRef.current - lastNarrationTick.current < 300) return;

    const px = camera.position.x;
    const pz = camera.position.z;
    const py = camera.position.y;

    // Don't narrate if at satellite altitude
    if (py > 100) return;

    // Reset visited zones every ~2 minutes
    resetCounter.current++;
    if (resetCounter.current >= 80) { // 80 * 1.5s = ~2min
      resetCounter.current = 0;
      visitedZones.current.clear();
      narratedBuildings.current.clear();
    }

    // ─── Zone proximity checks ────────────────────────────────────────
    for (const zone of ZONES) {
      if (visitedZones.current.has(zone.name)) continue;
      const dx = px - zone.center[0];
      const dz = pz - zone.center[2];
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < zone.radius) {
        visitedZones.current.add(zone.name);
        lastNarrationTick.current = tickRef.current;
        window.dispatchEvent(new CustomEvent('vr-voice-narrate', {
          detail: { type: 'zone', text: zone.announcement, zoneName: zone.name }
        }));
        return; // One narration per tick
      }

      // Distance callout for landmarks when approaching
      if (zone.type === 'landmark' && dist < zone.radius * 3 && dist > zone.radius) {
        const distKey = `${zone.name}-distance`;
        if (!visitedZones.current.has(distKey)) {
          visitedZones.current.add(distKey);
          lastNarrationTick.current = tickRef.current;
          window.dispatchEvent(new CustomEvent('vr-voice-narrate', {
            detail: { type: 'distance', landmarkName: zone.name, distance: dist }
          }));
          return;
        }
      }
    }

    // ─── Building proximity (closest unnarrated building) ─────────────
    let closestBuilding: typeof buildings[0] | null = null;
    let closestDist = Infinity;

    for (const b of buildings) {
      if (narratedBuildings.current.has(b.id)) continue;
      const dx = px - b.position[0];
      const dz = pz - b.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 18 && dist < closestDist) {
        closestDist = dist;
        closestBuilding = b;
      }
    }

    if (closestBuilding) {
      narratedBuildings.current.add(closestBuilding.id);
      lastNarrationTick.current = tickRef.current;
      window.dispatchEvent(new CustomEvent('vr-voice-narrate', {
        detail: { type: 'building', buildingType: closestBuilding.type, buildingId: closestBuilding.id }
      }));
    }
  });

  return null; // Pure logic component
};

export default ProximityVoiceNarrator;
