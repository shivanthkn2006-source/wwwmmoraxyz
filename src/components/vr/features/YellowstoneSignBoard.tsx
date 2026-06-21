/**
 * YELLOWSTONE NATIONAL PARK - Road Sign Board
 * Placed on the east side of the highway facing WEST toward the city,
 * so users driving east see the sign guiding them to Yellowstone.
 * Classic brown National Park Service style sign with wooden posts.
 * 
 * INDEPENDENT HOOK — does NOT wire into MetroTrainSystem or any other feature.
 */

import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

// ─── Sign positions along the highway heading east ──────────────────────────
const SIGN_POSITIONS: Array<{
  position: [number, number, number];
  text: string;
  subText: string;
  distanceText: string;
}> = [
  {
    position: [120, 0, -8],
    text: 'YELLOWSTONE',
    subText: 'NATIONAL PARK',
    distanceText: '← 330m AHEAD →',
  },
  {
    position: [280, 0, -8],
    text: 'YELLOWSTONE',
    subText: 'NATIONAL PARK',
    distanceText: '← 170m AHEAD →',
  },
  {
    position: [400, 0, -8],
    text: 'YELLOWSTONE',
    subText: 'NATIONAL PARK ENTRANCE',
    distanceText: '🏔️ WELCOME',
  },
];

// ─── Single Road Sign (National Park style) ─────────────────────────────────
const ParkRoadSign: React.FC<{
  position: [number, number, number];
  mainText: string;
  subText: string;
  distanceText: string;
}> = React.memo(({ position, mainText, subText, distanceText }) => {
  return (
    <group position={position}>
      {/* Wooden posts (two thick log-like pillars) */}
      {[-1.8, 1.8].map((x, i) => (
        <mesh key={`post-${i}`} position={[x, 1.8, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.18, 3.6, 8]} />
          <meshStandardMaterial color="#3e2723" roughness={0.95} metalness={0.05} />
        </mesh>
      ))}

      {/* Main sign board — dark brown with cream text (NPS style) */}
      <mesh position={[0, 3.2, 0]} castShadow>
        <boxGeometry args={[4.5, 2.2, 0.2]} />
        <meshStandardMaterial color="#3e2723" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Sign border trim */}
      <mesh position={[0, 3.2, 0.11]}>
        <boxGeometry args={[4.3, 2.0, 0.01]} />
        <meshStandardMaterial color="#5d4037" roughness={0.9} />
      </mesh>

      {/* Main text — facing WEST (negative X direction = towards city) */}
      <Text
        position={[0, 3.55, 0.13]}
        fontSize={0.38}
        color="#f5f0e1"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#1b0e04"
        maxWidth={4}
        font={undefined}
      >
        {mainText}
      </Text>

      <Text
        position={[0, 3.1, 0.13]}
        fontSize={0.25}
        color="#f5f0e1"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.015}
        outlineColor="#1b0e04"
        maxWidth={4}
      >
        {subText}
      </Text>

      <Text
        position={[0, 2.6, 0.13]}
        fontSize={0.18}
        color="#c8b560"
        anchorX="center"
        anchorY="middle"
        maxWidth={4}
      >
        {distanceText}
      </Text>

      {/* Back side text (facing east, for return journey) */}
      <Text
        position={[0, 3.55, -0.13]}
        fontSize={0.38}
        color="#f5f0e1"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#1b0e04"
        maxWidth={4}
        rotation={[0, Math.PI, 0]}
      >
        {mainText}
      </Text>

      <Text
        position={[0, 3.1, -0.13]}
        fontSize={0.25}
        color="#f5f0e1"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.015}
        outlineColor="#1b0e04"
        maxWidth={4}
        rotation={[0, Math.PI, 0]}
      >
        {subText}
      </Text>

      {/* NPS arrowhead emblem (simplified as a shield shape) */}
      <mesh position={[1.6, 3.55, 0.13]}>
        <circleGeometry args={[0.28, 5]} />
        <meshStandardMaterial color="#4a7c59" emissive="#4a7c59" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[1.6, 3.55, 0.14]}>
        <circleGeometry args={[0.22, 5]} />
        <meshStandardMaterial color="#c8702a" />
      </mesh>

      {/* Small decorative horizontal bar under sign */}
      <mesh position={[0, 2.1, 0]} castShadow>
        <boxGeometry args={[4.5, 0.12, 0.22]} />
        <meshStandardMaterial color="#3e2723" roughness={0.9} />
      </mesh>

      {/* Ground anchor stones */}
      {[-1.8, 1.8].map((x, i) => (
        <mesh key={`stone-${i}`} position={[x, 0.15, 0]}>
          <sphereGeometry args={[0.3, 8, 6]} />
          <meshStandardMaterial color="#78909c" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
});
ParkRoadSign.displayName = 'ParkRoadSign';

// ─── Directional Arrow Sign (smaller, on highway) ──────────────────────────
const DirectionalArrowSign: React.FC<{
  position: [number, number, number];
  text: string;
  arrowDirection: 'right' | 'left';
}> = React.memo(({ position, text, arrowDirection }) => (
  <group position={position}>
    {/* Single post */}
    <mesh position={[0, 1.5, 0]} castShadow>
      <cylinderGeometry args={[0.08, 0.1, 3, 6]} />
      <meshStandardMaterial color="#555555" metalness={0.4} roughness={0.7} />
    </mesh>
    {/* Arrow board */}
    <mesh position={[0, 3.2, 0]} castShadow>
      <boxGeometry args={[2.8, 0.7, 0.08]} />
      <meshStandardMaterial color="#2e7d32" roughness={0.7} />
    </mesh>
    <Text
      position={[0, 3.2, 0.05]}
      fontSize={0.2}
      color="#ffffff"
      anchorX="center"
      anchorY="middle"
      maxWidth={2.5}
    >
      {arrowDirection === 'right' ? '→ ' : '← '}{text}
    </Text>
    <Text
      position={[0, 3.2, -0.05]}
      fontSize={0.2}
      color="#ffffff"
      anchorX="center"
      anchorY="middle"
      maxWidth={2.5}
      rotation={[0, Math.PI, 0]}
    >
      {arrowDirection === 'right' ? '→ ' : '← '}{text}
    </Text>
  </group>
));
DirectionalArrowSign.displayName = 'DirectionalArrowSign';

// ─── Main Export ─────────────────────────────────────────────────────────────
export const YellowstoneSignBoard: React.FC = React.memo(() => {
  const { camera } = useThree();
  const [visible, setVisible] = React.useState(false);
  const checkRef = useRef(0);

  // Only render when user is within 500m of the highway
  useFrame((state) => {
    const now = state.clock.elapsedTime * 1000;
    if (now - checkRef.current < 500) return;
    checkRef.current = now;

    const camX = camera.position.x;
    const camZ = camera.position.z;
    // Highway runs along X axis from ~60 to ~450
    const nearHighway = camX > 20 && camX < 520 && Math.abs(camZ) < 200;
    if (nearHighway !== visible) setVisible(nearHighway);
  });

  if (!visible) return null;

  return (
    <group>
      {/* Main Yellowstone park signs along highway */}
      {SIGN_POSITIONS.map((sign, i) => (
        <ParkRoadSign
          key={`ys-sign-${i}`}
          position={sign.position}
          mainText={sign.text}
          subText={sign.subText}
          distanceText={sign.distanceText}
        />
      ))}

      {/* Green directional arrow signs */}
      <DirectionalArrowSign position={[80, 0, 8]} text="YELLOWSTONE N.P." arrowDirection="right" />
      <DirectionalArrowSign position={[180, 0, 8]} text="YELLOWSTONE N.P." arrowDirection="right" />
      <DirectionalArrowSign position={[80, 0, -8]} text="CITY CENTER" arrowDirection="left" />
      <DirectionalArrowSign position={[320, 0, 8]} text="PARK ENTRANCE" arrowDirection="right" />

      {/* Train warning sign near railway crossing area */}
      <group position={[160, 0, 12]}>
        <mesh position={[0, 1.5, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 3, 6]} />
          <meshStandardMaterial color="#555555" metalness={0.4} />
        </mesh>
        {/* Yellow triangle warning */}
        <mesh position={[0, 3.3, 0]} rotation={[0, 0, 0]} castShadow>
          <coneGeometry args={[0.5, 0.9, 3]} />
          <meshStandardMaterial color="#f9a825" emissive="#f9a825" emissiveIntensity={0.2} />
        </mesh>
        <Text position={[0, 3.3, 0.05]} fontSize={0.15} color="#1a1a1a" anchorX="center">
          🚂
        </Text>
        <Text position={[0, 2.7, 0.05]} fontSize={0.12} color="#d32f2f" anchorX="center" outlineWidth={0.01} outlineColor="#fff">
          RAIL CROSSING
        </Text>
      </group>
    </group>
  );
});
YellowstoneSignBoard.displayName = 'YellowstoneSignBoard';

export default YellowstoneSignBoard;
