/**
 * Village quest board near the square: lists active missions (Old Village
 * Map → Church Medallion → Lord's Crest) and draws a tall gold marker over
 * each quest item that is still to be found.
 */
import React, { useSyncExternalStore } from 'react';
import { Html } from '@react-three/drei';
import { GEAR, useGear } from '@/lib/vrGear';
import { QUESTS, getVRQuestSnapshot, subscribeVRQuests } from '@/lib/vrQuests';

const CHAIN = [
  { quest: 'village_map', gear: 'map' },
  { quest: 'church_medallion', gear: 'medallion' },
  { quest: 'lords_crest', gear: 'crest' },
];

export const VillageQuestBoard: React.FC = () => {
  const owned = useGear();
  const { state } = useSyncExternalStore(subscribeVRQuests, getVRQuestSnapshot, getVRQuestSnapshot);
  const rows = CHAIN.map((c) => ({ q: QUESTS.find((x) => x.id === c.quest)!, g: GEAR.find((x) => x.id === c.gear)!, done: owned.includes(c.gear) || !!state.done[c.quest] }));
  return (
    <>
      <group position={[4, 0, -4]} rotation={[0, -Math.PI / 4, 0]}>
        {[-0.9, 0.9].map((x) => <mesh key={x} position={[x, 1, 0]}><boxGeometry args={[0.1, 2, 0.1]} /><meshStandardMaterial color="#3b2a1c" /></mesh>)}
        <mesh position={[0, 1.55, 0]}><boxGeometry args={[2, 1.1, 0.06]} /><meshStandardMaterial color="#5a4128" roughness={0.9} /></mesh>
        <Html position={[0, 1.55, 0.05]} transform distanceFactor={2.2} occlude={false} style={{ pointerEvents: 'none' }}>
          <div style={{ width: 260, fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#f3e6c8', fontSize: 13, lineHeight: 1.35 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Quest board</div>
            {rows.map((r) => (
              <div key={r.q.id} style={{ opacity: r.done ? 0.5 : 1, textDecoration: r.done ? 'line-through' : 'none' }}>
                {r.done ? '✓' : '•'} {r.q.title}: {r.q.description}
              </div>
            ))}
          </div>
        </Html>
      </group>
      {rows.filter((r) => !r.done).map((r) => (
        <group key={r.g.id} position={[r.g.pos[0], 0, r.g.pos[2]]}>
          <mesh position={[0, 10, 0]}><cylinderGeometry args={[0.12, 0.12, 20, 8, 1, true]} /><meshBasicMaterial color="#ffd25a" transparent opacity={0.35} depthWrite={false} /></mesh>
          <mesh position={[0, 20.6, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.5, 1, 4]} /><meshBasicMaterial color="#ffd25a" /></mesh>
        </group>
      ))}
    </>
  );
};
export default VillageQuestBoard;
