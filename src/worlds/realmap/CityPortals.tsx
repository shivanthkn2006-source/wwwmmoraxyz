/**
 * Extra M'Mora World portals across the Real Map: one per ~1 km grid cell,
 * only the cell the player is in is mounted, so every city and neighbourhood
 * has a portal within ~500 m while just one extra doorway is ever drawn.
 */
import React, { useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PortalDoorway } from '../portal/PortalDoorway';
import { enterMMora } from '../worldMode';
import { PortalBeam } from './PortalBeam';

export const PORTAL_GRID_M = 1000;

/** Centre of the grid cell holding (x, z); the origin cell is skipped (main portal lives there). */
export function portalCellFor(x: number, z: number): [number, number] | null {
  const i = Math.round(x / PORTAL_GRID_M), j = Math.round(z / PORTAL_GRID_M);
  return i === 0 && j === 0 ? null : [i * PORTAL_GRID_M, j * PORTAL_GRID_M];
}

export const CityPortals: React.FC = () => {
  const { camera } = useThree();
  const [cell, setCell] = useState<[number, number] | null>(null);
  useFrame(() => {
    const c = portalCellFor(camera.position.x, camera.position.z);
    if (c?.[0] !== cell?.[0] || c?.[1] !== cell?.[1]) setCell(c);
  });
  if (!cell) return null;
  const pos: [number, number, number] = [cell[0], 0, cell[1]];
  return (
    <group key={cell.join(',')}>
      <PortalDoorway position={pos} label="M'Mora World" onEnter={enterMMora} />
      <PortalBeam position={pos} />
    </group>
  );
};
