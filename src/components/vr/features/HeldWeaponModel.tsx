/** Existing inventory weapon art, shared without changing geometry or stats. */
import { W870_GRIP_OFFSET, type HeldWeapon } from '@/lib/vrWeaponGrip';
import { W870Model } from './W870Model';

export function HeldWeaponModel({ weapon }: { weapon: HeldWeapon }) {
  if (weapon === 'w870') return <group position={W870_GRIP_OFFSET}><W870Model /></group>;
  if (weapon === 'shotgun') return <mesh position={[0.058, 0.075, 0]}><boxGeometry args={[0.75, 0.07, 0.05]} /><meshStandardMaterial color="#3b2a1c" /></mesh>;
  if (weapon === 'pistol') return <mesh position={[0.07, 0.02, 0]}><boxGeometry args={[0.2, 0.09, 0.04]} /><meshStandardMaterial color="#222" metalness={0.7} /></mesh>;
  return null;
}