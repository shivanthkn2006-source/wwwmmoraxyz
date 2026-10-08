/**
 * Inside a building (Resident Evil style): a dim room with a wooden side
 * table. Tap the drawer to open it, tap a Green Herb or coins to get the
 * "Take the …? Yes / No" prompt. Leave returns you to the street.
 */
import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { coinMaterial } from '@/lib/vrCoinLook';
import { useRoom, leaveRoom } from '@/lib/vrInterior';
import { usePickups, takePickup } from '@/lib/vrPickups';
import { GreenHerb } from '@/worlds/mmora/PickupHouses';

const wood = new THREE.MeshStandardMaterial({ color: '#8a5a32', roughness: 0.55 });
const woodDark = new THREE.MeshStandardMaterial({ color: '#5b3a20', roughness: 0.6 });
const inside = new THREE.MeshStandardMaterial({ color: '#c79a62', roughness: 0.8 });
const knob = new THREE.MeshStandardMaterial({ color: '#b08a4a', metalness: 0.7, roughness: 0.35 });
const coinMat = coinMaterial();
// Rooms you walk between: [camera x, camera z, look x, look z, name]
// Spots you walk between: [camera x, camera z, look x, look z, name]
const ROOMS: [number, number, number, number, string][] = [
  [1.6, 3.6, 1.6, 0, 'Doorway'], [0, 1.7, 0, 0, 'Hall table'], [3.2, 1.25, 3.2, 0, 'Back room drawer'],
];
const wall = new THREE.MeshStandardMaterial({ color: '#3b3128', roughness: 1 });
const floor = new THREE.MeshStandardMaterial({ color: '#4a3424', roughness: 0.9 });

type Ask = { what: 'herb' | 'coin'; text: string } | null;

const Table: React.FC<{ open: boolean; onDrawer: () => void; coins: number; herb: boolean; onAsk: (a: Ask) => void }> = ({ open, onDrawer, coins, herb, onAsk }) => {
  const drawer = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (drawer.current) drawer.current.position.z = THREE.MathUtils.damp(drawer.current.position.z, open ? 0.32 : 0, 6, dt); });
  const tap = (e: { stopPropagation: () => void }, fn: () => void) => { e.stopPropagation(); fn(); };
  return (
    <group>
      <mesh material={wood} position={[0, 0.72, 0]}><boxGeometry args={[0.8, 0.05, 0.55]} /></mesh>
      <mesh material={woodDark} position={[0, 0.36, -0.02]}><boxGeometry args={[0.72, 0.66, 0.48]} /></mesh>
      <mesh material={wood} position={[0, 0.2, 0.235]}><boxGeometry args={[0.64, 0.22, 0.02]} /></mesh>
      <group ref={drawer} position={[0, 0, 0]} onClick={(e) => tap(e, onDrawer)}>
        <mesh material={inside} position={[0, 0.5, 0.02]}><boxGeometry args={[0.62, 0.02, 0.44]} /></mesh>
        <mesh material={inside} position={[-0.3, 0.56, 0.02]}><boxGeometry args={[0.02, 0.12, 0.44]} /></mesh>
        <mesh material={inside} position={[0.3, 0.56, 0.02]}><boxGeometry args={[0.02, 0.12, 0.44]} /></mesh>
        <mesh material={wood} position={[0, 0.55, 0.245]}><boxGeometry args={[0.64, 0.2, 0.025]} /></mesh>
        <mesh material={knob} position={[0, 0.55, 0.27]}><sphereGeometry args={[0.03, 10, 10]} /></mesh>
        {open && coins > 0 && (
          <group position={[0, 0.52, 0.04]} onClick={(e) => tap(e, () => onAsk({ what: 'coin', text: `Take the M'Mora Coin${coins > 1 ? 's' : ''} (${coins})?` }))}>
            {Array.from({ length: coins }, (_, i) => (
              <mesh key={i} material={coinMat} position={[(i % 3) * 0.07 - 0.07, 0.008 + Math.floor(i / 3) * 0.014, (i % 2) * 0.06 - 0.03]}><cylinderGeometry args={[0.04, 0.04, 0.012, 20]} /></mesh>
            ))}
          </group>
        )}
      </group>
      {herb && <group position={[0.18, 0.745, -0.05]} onClick={(e) => tap(e, () => onAsk({ what: 'herb', text: 'Take the Green Herb?' }))}>
        <GreenHerb />
      </group>}
    </group>
  );
};

/** Walks the camera smoothly between rooms. */
const CamRig: React.FC<{ at: number }> = ({ at }) => {
  const look = useRef(new THREE.Vector3(1.6, 0.55, 0));
  useFrame(({ camera }, dt) => {
    const [cx, cz, lx, lz] = ROOMS[at];
    camera.position.x = THREE.MathUtils.damp(camera.position.x, cx, 2.5, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, cz, 2.5, dt);
    camera.position.y = 1.55 + Math.sin(performance.now() / 180) * 0.008 * Math.min(1, Math.abs(camera.position.x - cx));
    look.current.x = THREE.MathUtils.damp(look.current.x, lx, 2.5, dt);
    look.current.z = THREE.MathUtils.damp(look.current.z, lz, 2.5, dt);
    camera.lookAt(look.current);
  });
  return null;
};

export const VRRoomInterior: React.FC = () => {
  const room = useRoom();
  const p = usePickups();
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState<Ask>(null);
  const [note, setNote] = useState<string | null>(null);
  const [at, setAt] = useState(0);
  if (!room) return null;
  const herb = !!room.herbId && !p.taken.includes(room.herbId);
  const coins = room.coinId && !p.taken.includes(room.coinId) ? room.coinAmt ?? 1 : 0;
  const yes = () => {
    if (ask?.what === 'herb' && room.herbId) { takePickup({ id: room.herbId, kind: 'herb', amount: 1, pos: [0, 0, 0] }); setNote('Green Herb added to your bag'); }
    if (ask?.what === 'coin' && room.coinId) { takePickup({ id: room.coinId, kind: 'coin', amount: room.coinAmt ?? 1, pos: [0, 0, 0] }); setNote(`${room.coinAmt ?? 1} M'Mora Coin${(room.coinAmt ?? 1) > 1 ? 's' : ''} added`); }
    setAsk(null);
  };
  const leave = () => { setAt(0); setOpen(false); setAsk(null); setNote(null); leaveRoom(); };
  return (
    <div className="pointer-events-auto fixed inset-0 z-[10000] bg-black" data-exclude-phantom-tap data-testid="vr-room">
      <Canvas dpr={[1, 1.5]} camera={{ position: [1.6, 1.5, 3.6], fov: 55 }}>
        <color attach="background" args={['#0b0907']} />
        <fog attach="fog" args={['#0b0907', 3, 9]} />
        <ambientLight intensity={0.25} />
        <pointLight position={[0.3, 1.8, 0.8]} intensity={2.2} distance={5} color="#ffcf8a" />
        {/* Enclosed rooms: floor, ceiling, four walls and a wall between the two rooms with an opening */}
        <mesh material={floor} rotation-x={-Math.PI / 2} position={[1.6, 0, 1.6]}><planeGeometry args={[6.4, 5]} /></mesh>
        <mesh material={wall} rotation-x={Math.PI / 2} position={[1.6, 2.6, 1.6]}><planeGeometry args={[6.4, 5]} /></mesh>
        <mesh material={wall} position={[1.6, 1.3, -0.6]}><planeGeometry args={[6.4, 2.6]} /></mesh>
        <mesh material={wall} position={[-1.6, 1.3, 1.6]} rotation-y={Math.PI / 2}><planeGeometry args={[5, 2.6]} /></mesh>
        <mesh material={wall} position={[4.8, 1.3, 1.6]} rotation-y={-Math.PI / 2}><planeGeometry args={[5, 2.6]} /></mesh>
        <mesh material={wall} position={[1.6, 1.3, -0.1]} rotation-y={Math.PI / 2}><planeGeometry args={[1, 2.6]} /></mesh>
        <mesh material={wall} position={[1.6, 1.3, 2.6]} rotation-y={Math.PI / 2}><planeGeometry args={[1.4, 2.6]} /></mesh>
        <CamRig at={at} />
        <Table open={false} onDrawer={() => setAt(2)} coins={0} herb={herb} onAsk={setAsk} />
        <group position={[3.2, 0, 0]}>
          <Table open={open} onDrawer={() => setOpen((v) => !v)} coins={coins} herb={false} onAsk={setAsk} />
        </group>
        <pointLight position={[3.4, 2.2, 0.8]} intensity={1.6} distance={4} color="#ffcf8a" />
      </Canvas>
      <div className="absolute left-1/2 top-4 -translate-x-1/2 text-sm font-semibold text-white">{room.name} · {ROOMS[at][4]}</div>
      {!ask && <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-6 text-sm font-semibold text-white">
        {at !== 1 && <button type="button" onClick={() => setAt(1)}>Walk to hall table</button>}
        {at !== 2 && <button type="button" onClick={() => setAt(2)}>Walk to back room</button>}
        {at === 2 && <button type="button" onClick={() => setOpen((v) => !v)}>{open ? 'Close drawer' : 'Open drawer'}</button>}
        <button type="button" onClick={leave}>Leave</button>
      </div>}
      {!herb && !coins && <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-xs text-white/80">Nothing left here</div>}
      {note && !ask && <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-xs font-semibold text-white">{note}</div>}
      {ask && (
        <div className="absolute inset-x-0 bottom-0 border-t border-white/20 bg-black/80 px-6 py-6 text-center font-serif text-white" role="dialog" aria-label={ask.text}>
          <p className="text-xl">{ask.text}</p>
          <div className="mt-3 flex justify-center gap-10 text-lg">
            <button type="button" onClick={yes}>▸ Yes</button>
            <button type="button" onClick={() => setAsk(null)}>No</button>
          </div>
        </div>
      )}
    </div>
  );
};
export default VRRoomInterior;
