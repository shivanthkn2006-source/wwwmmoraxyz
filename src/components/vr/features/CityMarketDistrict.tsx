/**
 * CITY MARKET DISTRICT - Vector-style city components
 * Standalone component - NO cross-wiring with existing systems
 * Renders: Market stalls, shops, housing, construction, buses, banks, medical, animal care
 * All positioned OFF roads using road clearance logic
 */

import React, { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

// ─── Road clearance (must match other systems) ─────────────────────────────
const ROAD_SPACING = 400;
const ROAD_CLEARANCE = 95;

const pushOff = (v: number): number => {
  const nearest = Math.round(v / ROAD_SPACING) * ROAD_SPACING;
  const d = v - nearest;
  if (Math.abs(d) < ROAD_CLEARANCE) {
    return nearest + (d === 0 ? 1 : Math.sign(d)) * ROAD_CLEARANCE;
  }
  return v;
};

const safePos = (x: number, z: number): [number, number] => [pushOff(x), pushOff(z)];

// ─── Color palette ──────────────────────────────────────────────────────────
const C = {
  canopy1: '#e74c3c', canopy2: '#2980b9', canopy3: '#f39c12', canopy4: '#27ae60',
  stripe1: '#c0392b', stripe2: '#ecf0f1',
  wood: '#8B6914', crate: '#A0522D', metal: '#7f8c8d',
  concrete: '#95a5a6', glass: '#87CEEB', brick: '#b5651d',
  roof: '#c0392b', roofBlue: '#34495e',
  bus: '#f1c40f', busRed: '#e74c3c',
  bank: '#2c3e50', medical: '#ecf0f1', medCross: '#e74c3c',
  crane: '#f39c12', jcb: '#f1c40f',
  grass: '#27ae60',
};

// ─── Individual vector components ───────────────────────────────────────────

/** Fruit/Vegetable market stall with striped canopy */
const MarketStall: React.FC<{ position: [number, number, number]; type: 'fruit' | 'meat' | 'fish' | 'water'; rotation?: number }> = ({ position, type, rotation = 0 }) => {
  const canopyColor = type === 'fruit' ? C.canopy3 : type === 'meat' ? C.canopy1 : type === 'fish' ? C.canopy2 : C.canopy4;
  const label = type === 'fruit' ? '🍎 Fresh Fruits' : type === 'meat' ? '🥩 Meat Shop' : type === 'fish' ? '🐟 Fish Market' : '💧 Water Shop';

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Counter/table */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[3, 1, 2]} />
        <meshStandardMaterial color={C.wood} />
      </mesh>
      {/* Goods on counter */}
      {[...Array(6)].map((_, i) => (
        <mesh key={i} position={[-1 + i * 0.4, 1.15, -0.3 + (i % 2) * 0.6]}>
          <boxGeometry args={[0.35, 0.25, 0.35]} />
          <meshStandardMaterial color={type === 'fruit' ? ['#e74c3c', '#f39c12', '#27ae60', '#8e44ad', '#e67e22', '#2ecc71'][i] : type === 'meat' ? '#c0392b' : type === 'fish' ? '#5dade2' : '#3498db'} />
        </mesh>
      ))}
      {/* Canopy poles */}
      <mesh position={[-1.3, 1.5, -0.9]}><boxGeometry args={[0.08, 2, 0.08]} /><meshStandardMaterial color={C.metal} /></mesh>
      <mesh position={[1.3, 1.5, -0.9]}><boxGeometry args={[0.08, 2, 0.08]} /><meshStandardMaterial color={C.metal} /></mesh>
      <mesh position={[-1.3, 1.5, 0.9]}><boxGeometry args={[0.08, 2, 0.08]} /><meshStandardMaterial color={C.metal} /></mesh>
      <mesh position={[1.3, 1.5, 0.9]}><boxGeometry args={[0.08, 2, 0.08]} /><meshStandardMaterial color={C.metal} /></mesh>
      {/* Canopy */}
      <mesh position={[0, 2.6, 0]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[3.4, 0.08, 2.4]} />
        <meshStandardMaterial color={canopyColor} />
      </mesh>
      {/* Stripe on canopy */}
      <mesh position={[0, 2.62, 0]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[3.4, 0.02, 0.4]} />
        <meshStandardMaterial color={C.stripe2} />
      </mesh>
      {/* Label */}
      <Text position={[0, 3.1, 0]} fontSize={0.3} color="#ffffff" anchorX="center" anchorY="middle"
        outlineWidth={0.02} outlineColor="#000000">{label}</Text>
    </group>
  );
};

/** Apartment/Condo building */
const ApartmentBuilding: React.FC<{ position: [number, number, number]; floors: number; color: string }> = ({ position, floors, color }) => {
  const h = floors * 3.5;
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[8, h, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Windows grid */}
      {[...Array(floors)].map((_, f) =>
        [...Array(3)].map((_, w) => (
          <mesh key={`${f}-${w}`} position={[-2.5 + w * 2.5, 2 + f * 3.5, 3.01]}>
            <boxGeometry args={[1.2, 1.6, 0.05]} />
            <meshStandardMaterial color={C.glass} emissive="#4a90d9" emissiveIntensity={0.15} />
          </mesh>
        ))
      )}
      {/* Roof */}
      <mesh position={[0, h + 0.15, 0]}>
        <boxGeometry args={[8.4, 0.3, 6.4]} />
        <meshStandardMaterial color={C.roofBlue} />
      </mesh>
    </group>
  );
};

/** Mini house */
const MiniHouse: React.FC<{ position: [number, number, number]; color: string }> = ({ position, color }) => (
  <group position={position}>
    <mesh position={[0, 1.5, 0]}>
      <boxGeometry args={[4, 3, 3.5]} />
      <meshStandardMaterial color={color} />
    </mesh>
    {/* Pitched roof */}
    <mesh position={[0, 3.5, 0]} rotation={[0, 0, Math.PI / 4]}>
      <boxGeometry args={[3.2, 3.2, 3.8]} />
      <meshStandardMaterial color={C.roof} />
    </mesh>
    {/* Door */}
    <mesh position={[0, 0.9, 1.76]}>
      <boxGeometry args={[0.8, 1.8, 0.05]} />
      <meshStandardMaterial color={C.wood} />
    </mesh>
    {/* Window */}
    <mesh position={[-1.2, 1.8, 1.76]}>
      <boxGeometry args={[0.7, 0.7, 0.05]} />
      <meshStandardMaterial color={C.glass} />
    </mesh>
  </group>
);

/** Construction crane */
const ConstructionCrane: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    {/* Base */}
    <mesh position={[0, 0.3, 0]}><boxGeometry args={[3, 0.6, 3]} /><meshStandardMaterial color={C.concrete} /></mesh>
    {/* Tower */}
    <mesh position={[0, 12, 0]}><boxGeometry args={[0.8, 24, 0.8]} /><meshStandardMaterial color={C.crane} /></mesh>
    {/* Jib arm */}
    <mesh position={[6, 24, 0]}><boxGeometry args={[14, 0.5, 0.5]} /><meshStandardMaterial color={C.crane} /></mesh>
    {/* Counter-weight arm */}
    <mesh position={[-3, 24, 0]}><boxGeometry args={[5, 0.5, 0.5]} /><meshStandardMaterial color={C.crane} /></mesh>
    {/* Counter weight */}
    <mesh position={[-5, 23.5, 0]}><boxGeometry args={[1.5, 1, 1]} /><meshStandardMaterial color={C.concrete} /></mesh>
    {/* Cable */}
    <mesh position={[10, 20, 0]}><boxGeometry args={[0.05, 8, 0.05]} /><meshStandardMaterial color={C.metal} /></mesh>
    {/* Hook block */}
    <mesh position={[10, 16, 0]}><boxGeometry args={[0.4, 0.6, 0.4]} /><meshStandardMaterial color={C.metal} /></mesh>
    <Text position={[0, 25.5, 0]} fontSize={0.5} color="#f39c12" anchorX="center">🏗 CRANE</Text>
  </group>
);

/** JCB/Excavator */
const JCBExcavator: React.FC<{ position: [number, number, number]; rotation?: number }> = ({ position, rotation = 0 }) => (
  <group position={position} rotation={[0, rotation, 0]}>
    {/* Tracks */}
    <mesh position={[-0.8, 0.25, 0]}><boxGeometry args={[0.6, 0.5, 2.5]} /><meshStandardMaterial color="#333" /></mesh>
    <mesh position={[0.8, 0.25, 0]}><boxGeometry args={[0.6, 0.5, 2.5]} /><meshStandardMaterial color="#333" /></mesh>
    {/* Body */}
    <mesh position={[0, 0.9, 0]}><boxGeometry args={[2, 0.8, 2]} /><meshStandardMaterial color={C.jcb} /></mesh>
    {/* Cab */}
    <mesh position={[0, 1.7, -0.3]}><boxGeometry args={[1.4, 1.2, 1.2]} /><meshStandardMaterial color={C.jcb} /></mesh>
    {/* Cab window */}
    <mesh position={[0, 1.8, 0.31]}><boxGeometry args={[1, 0.7, 0.02]} /><meshStandardMaterial color={C.glass} /></mesh>
    {/* Boom arm */}
    <mesh position={[0, 2.2, 1.5]} rotation={[0.6, 0, 0]}><boxGeometry args={[0.3, 0.3, 2.5]} /><meshStandardMaterial color={C.jcb} /></mesh>
    {/* Bucket */}
    <mesh position={[0, 3.2, 2.8]} rotation={[0.3, 0, 0]}><boxGeometry args={[1.2, 0.6, 0.8]} /><meshStandardMaterial color={C.metal} /></mesh>
  </group>
);

/** City bus */
const CityBus: React.FC<{ position: [number, number, number]; color: string; rotation?: number }> = ({ position, color, rotation = 0 }) => (
  <group position={position} rotation={[0, rotation, 0]}>
    {/* Body */}
    <mesh position={[0, 1.2, 0]}><boxGeometry args={[2.8, 2.4, 8]} /><meshStandardMaterial color={color} /></mesh>
    {/* Windows */}
    {[-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((z, i) => (
      <mesh key={i} position={[1.41, 1.8, z]}><boxGeometry args={[0.05, 1, 0.8]} /><meshStandardMaterial color={C.glass} emissive="#4a90d9" emissiveIntensity={0.1} /></mesh>
    ))}
    {/* Wheels */}
    <mesh position={[-1.2, 0.3, -2.5]}><cylinderGeometry args={[0.4, 0.4, 0.3, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
    <mesh position={[1.2, 0.3, -2.5]}><cylinderGeometry args={[0.4, 0.4, 0.3, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
    <mesh position={[-1.2, 0.3, 2.5]}><cylinderGeometry args={[0.4, 0.4, 0.3, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
    <mesh position={[1.2, 0.3, 2.5]}><cylinderGeometry args={[0.4, 0.4, 0.3, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
    {/* Route sign */}
    <mesh position={[0, 2.5, -3.9]}><boxGeometry args={[2, 0.5, 0.1]} /><meshStandardMaterial color="#2c3e50" /></mesh>
    <Text position={[0, 2.5, -4.0]} fontSize={0.2} color="#f1c40f" anchorX="center">CITY BUS</Text>
  </group>
);

/** Bank/ATM building */
const BankBuilding: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    <mesh position={[0, 4, 0]}><boxGeometry args={[10, 8, 8]} /><meshStandardMaterial color={C.bank} /></mesh>
    {/* Columns */}
    {[-3.5, -1.5, 1.5, 3.5].map((x, i) => (
      <mesh key={i} position={[x, 3, 4.1]}><cylinderGeometry args={[0.25, 0.25, 6, 8]} /><meshStandardMaterial color="#bdc3c7" /></mesh>
    ))}
    {/* Pediment */}
    <mesh position={[0, 8.3, 4]}><boxGeometry args={[10.5, 0.6, 0.3]} /><meshStandardMaterial color="#bdc3c7" /></mesh>
    {/* ATM */}
    <mesh position={[4.5, 1.2, 4.1]}><boxGeometry args={[1, 1.8, 0.3]} /><meshStandardMaterial color="#2ecc71" emissive="#2ecc71" emissiveIntensity={0.3} /></mesh>
    <Text position={[0, 8.8, 4.1]} fontSize={0.5} color="#f1c40f" anchorX="center" outlineWidth={0.02} outlineColor="#000">🏦 NATIONAL BANK</Text>
    <Text position={[4.5, 2.5, 4.2]} fontSize={0.25} color="#ffffff" anchorX="center">ATM</Text>
  </group>
);

/** Medical/Hospital building */
const MedicalFacility: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    <mesh position={[0, 5, 0]}><boxGeometry args={[12, 10, 8]} /><meshStandardMaterial color={C.medical} /></mesh>
    {/* Red cross */}
    <mesh position={[0, 8, 4.01]}><boxGeometry args={[1.5, 4, 0.1]} /><meshStandardMaterial color={C.medCross} emissive={C.medCross} emissiveIntensity={0.4} /></mesh>
    <mesh position={[0, 8, 4.02]}><boxGeometry args={[4, 1.5, 0.1]} /><meshStandardMaterial color={C.medCross} emissive={C.medCross} emissiveIntensity={0.4} /></mesh>
    {/* Windows */}
    {[...Array(3)].map((_, f) =>
      [...Array(4)].map((_, w) => (
        <mesh key={`${f}-${w}`} position={[-4 + w * 2.8, 2.5 + f * 3, 4.01]}>
          <boxGeometry args={[1.4, 1.8, 0.05]} />
          <meshStandardMaterial color={C.glass} emissive="#4a90d9" emissiveIntensity={0.1} />
        </mesh>
      ))
    )}
    {/* Entrance */}
    <mesh position={[0, 1.5, 4.1]}><boxGeometry args={[3, 3, 0.1]} /><meshStandardMaterial color={C.glass} /></mesh>
    <Text position={[0, 10.5, 4.1]} fontSize={0.5} color="#e74c3c" anchorX="center" outlineWidth={0.02} outlineColor="#fff">🏥 GENERAL HOSPITAL</Text>
    {/* Pharmacy next to it */}
    <mesh position={[8, 2, 0]}><boxGeometry args={[4, 4, 5]} /><meshStandardMaterial color="#2ecc71" /></mesh>
    <Text position={[8, 4.5, 2.6]} fontSize={0.3} color="#ffffff" anchorX="center">💊 PHARMACY</Text>
  </group>
);

/** Animal care / Vet clinic */
const AnimalCare: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    <mesh position={[0, 2.5, 0]}><boxGeometry args={[6, 5, 5]} /><meshStandardMaterial color="#f5e6ca" /></mesh>
    {/* Roof */}
    <mesh position={[0, 5.2, 0]}><boxGeometry args={[6.5, 0.4, 5.5]} /><meshStandardMaterial color="#8e44ad" /></mesh>
    {/* Door */}
    <mesh position={[0, 1.2, 2.51]}><boxGeometry args={[1.2, 2.4, 0.05]} /><meshStandardMaterial color={C.wood} /></mesh>
    {/* Window */}
    <mesh position={[-1.8, 2.8, 2.51]}><boxGeometry args={[1, 1, 0.05]} /><meshStandardMaterial color={C.glass} /></mesh>
    <mesh position={[1.8, 2.8, 2.51]}><boxGeometry args={[1, 1, 0.05]} /><meshStandardMaterial color={C.glass} /></mesh>
    <Text position={[0, 5.8, 2.5]} fontSize={0.35} color="#8e44ad" anchorX="center" outlineWidth={0.02} outlineColor="#fff">🐾 VET CLINIC</Text>
  </group>
);

// ─── Main district component ────────────────────────────────────────────────
const CityMarketDistrict: React.FC = () => {
  const elements = useMemo(() => {
    const items: { component: React.ReactNode; key: string }[] = [];

    // Market stalls - scattered in safe positions
    const stallConfigs: { type: 'fruit' | 'meat' | 'fish' | 'water'; rawX: number; rawZ: number; rot: number }[] = [
      { type: 'fruit', rawX: 120, rawZ: 80, rot: 0 },
      { type: 'fruit', rawX: -150, rawZ: 200, rot: Math.PI / 3 },
      { type: 'meat', rawX: 130, rawZ: 90, rot: Math.PI / 2 },
      { type: 'meat', rawX: -180, rawZ: -120, rot: 0 },
      { type: 'fish', rawX: 160, rawZ: -80, rot: Math.PI / 4 },
      { type: 'fish', rawX: -200, rawZ: 150, rot: 0 },
      { type: 'water', rawX: 100, rawZ: -200, rot: Math.PI / 6 },
      { type: 'water', rawX: -140, rawZ: -180, rot: 0 },
    ];
    stallConfigs.forEach((s, i) => {
      const [x, z] = safePos(s.rawX, s.rawZ);
      items.push({ key: `stall-${i}`, component: <MarketStall position={[x, 0, z]} type={s.type} rotation={s.rot} /> });
    });

    // Apartments & housing
    const housingConfigs = [
      { rawX: 250, rawZ: 250, floors: 8, color: '#7f8c8d' },
      { rawX: -280, rawZ: 300, floors: 12, color: '#95a5a6' },
      { rawX: 300, rawZ: -250, floors: 6, color: '#bdc3c7' },
      { rawX: -320, rawZ: -280, floors: 10, color: '#7f8c8d' },
    ];
    housingConfigs.forEach((h, i) => {
      const [x, z] = safePos(h.rawX, h.rawZ);
      items.push({ key: `apt-${i}`, component: <ApartmentBuilding position={[x, 0, z]} floors={h.floors} color={h.color} /> });
    });

    // Mini houses
    const houseColors = ['#e8d5b7', '#d4c5a0', '#c9b98e', '#f0e6d3', '#e0d0b8', '#d5c8ab'];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dist = 350 + (i % 3) * 60;
      const [x, z] = safePos(Math.cos(angle) * dist, Math.sin(angle) * dist);
      items.push({ key: `house-${i}`, component: <MiniHouse position={[x, 0, z]} color={houseColors[i]} /> });
    }

    // Construction equipment
    const [craneX1, craneZ1] = safePos(200, -350);
    const [craneX2, craneZ2] = safePos(-350, 200);
    items.push({ key: 'crane-1', component: <ConstructionCrane position={[craneX1, 0, craneZ1]} /> });
    items.push({ key: 'crane-2', component: <ConstructionCrane position={[craneX2, 0, craneZ2]} /> });

    const [jcbX1, jcbZ1] = safePos(220, -330);
    const [jcbX2, jcbZ2] = safePos(-330, 180);
    items.push({ key: 'jcb-1', component: <JCBExcavator position={[jcbX1, 0, jcbZ1]} rotation={0.5} /> });
    items.push({ key: 'jcb-2', component: <JCBExcavator position={[jcbX2, 0, jcbZ2]} rotation={2.1} /> });

    // Buses
    const busConfigs = [
      { rawX: 80, rawZ: -100, color: C.bus, rot: 0 },
      { rawX: -120, rawZ: 80, color: C.busRed, rot: Math.PI / 2 },
      { rawX: 200, rawZ: 150, color: '#3498db', rot: Math.PI },
    ];
    busConfigs.forEach((b, i) => {
      const [x, z] = safePos(b.rawX, b.rawZ);
      items.push({ key: `bus-${i}`, component: <CityBus position={[x, 0, z]} color={b.color} rotation={b.rot} /> });
    });

    // Bank
    const [bankX, bankZ] = safePos(350, 120);
    items.push({ key: 'bank', component: <BankBuilding position={[bankX, 0, bankZ]} /> });

    // Hospital + Pharmacy
    const [hospX, hospZ] = safePos(-350, -100);
    items.push({ key: 'hospital', component: <MedicalFacility position={[hospX, 0, hospZ]} /> });

    // Vet clinic
    const [vetX, vetZ] = safePos(280, -150);
    items.push({ key: 'vet', component: <AnimalCare position={[vetX, 0, vetZ]} /> });

    return items;
  }, []);

  return (
    <group>
      {elements.map(({ component, key }) => (
        <React.Fragment key={key}>{component}</React.Fragment>
      ))}
    </group>
  );
};

export default CityMarketDistrict;
