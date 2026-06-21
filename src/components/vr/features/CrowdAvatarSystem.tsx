/**
 * CROWD AVATAR SYSTEM — 500 unique city NPCs
 * Activities: walking roads, sitting benches, riding bikes (opposing dirs), sitting trains
 * Diverse dress colors, skin tones, @username nametags
 * Uses InstancedMesh for GPU-efficient rendering
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { generateNames } from '@/utils/nameGenerator';

// ─── Constants ───────────────────────────────────────────────────────────────
const TOTAL_NPC = 500;
const CITY_RADIUS = 800;
const ROAD_SPACING = 400;

// Activity distribution
const WALKERS = 220;
const BENCH_SITTERS = 80;
const BIKE_RIDERS = 120;
const TRAIN_SITTERS = 80;

// ─── Color Palettes (diverse, never monotone) ────────────────────────────────
const SKIN_TONES = [
  '#ffe0bd', '#ffcd94', '#f5c5a3', '#e0ac69', '#c68642',
  '#a0673a', '#8d5524', '#6b4423', '#4a2f1b', '#d4a880',
  '#f2d1b3', '#c9956b', '#b07848', '#dbb896', '#e8c9a0',
];

const SHIRT_COLORS = [
  '#f5f5f5', '#e8e8e8', '#add8e6', '#87ceeb', '#b0c4de',
  '#fffacd', '#ffd700', '#f0e68c', '#2b2b2b', '#1a1a1a',
  '#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#ec4899',
  '#06b6d4', '#f97316', '#14b8a6', '#8b5cf6', '#f43f5e',
  '#6366f1', '#0ea5e9', '#84cc16', '#d946ef', '#fb923c',
  '#fbbf24', '#34d399', '#c084fc', '#f472b6', '#38bdf8',
];

const PANTS_COLORS = [
  '#1f2937', '#374151', '#111827', '#1e3a5f', '#2d2d2d',
  '#3d3d3d', '#4b5563', '#292524', '#1c1917', '#0c4a6e',
  '#6b7280', '#44403c', '#1e293b',
];

const BIKE_BODY_COLORS = [
  '#dc2626', '#2563eb', '#16a34a', '#ca8a04', '#7c3aed',
  '#0891b2', '#1f2937', '#f5f5f5', '#ea580c', '#db2777',
];

const CAR_COLORS = [
  '#1e40af', '#dc2626', '#16a34a', '#ca8a04', '#7c3aed',
  '#0891b2', '#1f2937', '#f5f5f5',
];

// ─── Activity enum ───────────────────────────────────────────────────────────
type NPCActivity = 'walking' | 'bench' | 'bike' | 'train';

interface NPCEntity {
  activity: NPCActivity;
  roadX: number;
  roadZ: number;
  offset: number;
  speed: number;
  direction: 1 | -1;
  isHorizontal: boolean;
  shirtIdx: number;
  skinIdx: number;
  pantsIdx: number;
  name: string;
  bikeColorIdx: number;
}

// ─── Bench positions (spread across city) ────────────────────────────────────
const BENCH_POSITIONS: [number, number][] = [];
for (let i = 0; i < 80; i++) {
  const angle = (i / 80) * Math.PI * 2;
  const r = 100 + (i % 5) * 120;
  BENCH_POSITIONS.push([Math.cos(angle) * r + 60, Math.sin(angle) * r + 45]);
}

// ─── Train seat positions along metro path ───────────────────────────────────
const TRAIN_POSITIONS: [number, number][] = [];
for (let i = 0; i < 80; i++) {
  const angle = (i / 80) * Math.PI * 2;
  const rx = 700, rz = 500;
  TRAIN_POSITIONS.push([Math.cos(angle) * rx, Math.sin(angle) * rz]);
}

// ─── Generate NPC data ───────────────────────────────────────────────────────
const generateNPCData = (): NPCEntity[] => {
  const npcs: NPCEntity[] = [];
  const names = generateNames({ count: TOTAL_NPC, seed: 42 });

  const roads: { x: number; z: number; horizontal: boolean }[] = [];
  for (let z = -CITY_RADIUS; z <= CITY_RADIUS; z += ROAD_SPACING) {
    roads.push({ x: 0, z, horizontal: true });
  }
  for (let x = -CITY_RADIUS; x <= CITY_RADIUS; x += ROAD_SPACING) {
    roads.push({ x, z: 0, horizontal: false });
  }

  let idx = 0;
  const addNPC = (activity: NPCActivity, count: number) => {
    for (let i = 0; i < count; i++) {
      const road = roads[idx % roads.length];
      const progress = (Math.random() - 0.5) * CITY_RADIUS * 2;
      const dir: 1 | -1 = Math.random() > 0.5 ? 1 : -1;

      let rx = road.horizontal ? progress : road.x + (Math.random() - 0.5) * 3;
      let rz = road.horizontal ? road.z + (Math.random() - 0.5) * 3 : progress;

      if (activity === 'bench' && BENCH_POSITIONS[i % BENCH_POSITIONS.length]) {
        rx = BENCH_POSITIONS[i % BENCH_POSITIONS.length][0];
        rz = BENCH_POSITIONS[i % BENCH_POSITIONS.length][1];
      }
      if (activity === 'train' && TRAIN_POSITIONS[i % TRAIN_POSITIONS.length]) {
        rx = TRAIN_POSITIONS[i % TRAIN_POSITIONS.length][0];
        rz = TRAIN_POSITIONS[i % TRAIN_POSITIONS.length][1];
      }

      npcs.push({
        activity,
        roadX: rx,
        roadZ: rz,
        offset: Math.random() * Math.PI * 2,
        speed: activity === 'bike' ? (1.5 + Math.random() * 3) :
               activity === 'walking' ? (0.03 + Math.random() * 0.06) : 0,
        direction: dir,
        isHorizontal: road.horizontal,
        shirtIdx: idx % SHIRT_COLORS.length,
        skinIdx: idx % SKIN_TONES.length,
        pantsIdx: idx % PANTS_COLORS.length,
        name: `@${names[idx % names.length]}`,
        bikeColorIdx: idx % BIKE_BODY_COLORS.length,
      });
      idx++;
    }
  };

  addNPC('walking', WALKERS);
  addNPC('bench', BENCH_SITTERS);
  addNPC('bike', BIKE_RIDERS);
  addNPC('train', TRAIN_SITTERS);

  return npcs;
};

// ─── Vehicle data (cars on roads) ────────────────────────────────────────────
const VEHICLE_COUNT = 80;
interface VehicleEntity {
  roadX: number; roadZ: number; offset: number;
  speed: number; direction: 1 | -1; isHorizontal: boolean;
}

const generateVehicles = (): VehicleEntity[] => {
  const vehicles: VehicleEntity[] = [];
  const roads: { x: number; z: number; horizontal: boolean }[] = [];
  for (let z = -CITY_RADIUS; z <= CITY_RADIUS; z += ROAD_SPACING) roads.push({ x: 0, z, horizontal: true });
  for (let x = -CITY_RADIUS; x <= CITY_RADIUS; x += ROAD_SPACING) roads.push({ x, z: 0, horizontal: false });

  for (let i = 0; i < VEHICLE_COUNT; i++) {
    const road = roads[i % roads.length];
    const progress = (Math.random() - 0.5) * CITY_RADIUS * 2;
    vehicles.push({
      roadX: road.horizontal ? progress : road.x + (Math.random() > 0.5 ? 2 : -2),
      roadZ: road.horizontal ? road.z + (Math.random() > 0.5 ? 2 : -2) : progress,
      offset: Math.random() * Math.PI * 2,
      speed: 2 + Math.random() * 4,
      direction: Math.random() > 0.5 ? 1 : -1,
      isHorizontal: road.horizontal,
    });
  }
  return vehicles;
};

// ─── Nametag label component (batched, only renders nearest ~40) ─────────────
const NPCNametag: React.FC<{ position: THREE.Vector3; name: string }> = ({ position, name }) => (
  <Html position={position} center sprite distanceFactor={80} occlude={false} style={{ pointerEvents: 'none' }}>
    <span className="whitespace-nowrap rounded-full bg-background/40 px-0.5 text-[3px] font-mono font-medium leading-none text-foreground">
      {name}
    </span>
  </Html>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const CrowdAvatarSystem: React.FC = () => {
  // Refs for instanced meshes
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const legsRef = useRef<THREE.InstancedMesh>(null);
  const armsRef = useRef<THREE.InstancedMesh>(null);
  const bikeFrameRef = useRef<THREE.InstancedMesh>(null);
  const bikeWheelFRef = useRef<THREE.InstancedMesh>(null);
  const bikeWheelRRef = useRef<THREE.InstancedMesh>(null);
  const vehicleRef = useRef<THREE.InstancedMesh>(null);

  const npcData = useMemo(() => generateNPCData(), []);
  const vehicleData = useMemo(() => generateVehicles(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Pre-compute color arrays
  const bodyColorArr = useMemo(() => {
    const arr = new Float32Array(TOTAL_NPC * 3);
    for (let i = 0; i < TOTAL_NPC; i++) {
      const c = new THREE.Color(SHIRT_COLORS[npcData[i].shirtIdx]);
      arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
    }
    return arr;
  }, [npcData]);

  const headColorArr = useMemo(() => {
    const arr = new Float32Array(TOTAL_NPC * 3);
    for (let i = 0; i < TOTAL_NPC; i++) {
      const c = new THREE.Color(SKIN_TONES[npcData[i].skinIdx]);
      arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
    }
    return arr;
  }, [npcData]);

  const legsColorArr = useMemo(() => {
    const arr = new Float32Array(TOTAL_NPC * 3);
    for (let i = 0; i < TOTAL_NPC; i++) {
      const c = new THREE.Color(PANTS_COLORS[npcData[i].pantsIdx]);
      arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
    }
    return arr;
  }, [npcData]);

  const bikeColorArr = useMemo(() => {
    const arr = new Float32Array(BIKE_RIDERS * 3);
    let bi = 0;
    for (let i = 0; i < TOTAL_NPC; i++) {
      if (npcData[i].activity === 'bike') {
        const c = new THREE.Color(BIKE_BODY_COLORS[npcData[i].bikeColorIdx]);
        arr[bi * 3] = c.r; arr[bi * 3 + 1] = c.g; arr[bi * 3 + 2] = c.b;
        bi++;
      }
    }
    return arr;
  }, [npcData]);

  const carColorArr = useMemo(() => {
    const arr = new Float32Array(VEHICLE_COUNT * 3);
    for (let i = 0; i < VEHICLE_COUNT; i++) {
      const c = new THREE.Color(CAR_COLORS[i % CAR_COLORS.length]);
      arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
    }
    return arr;
  }, []);

  // Apply instanced colors
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.instanceColor = new THREE.InstancedBufferAttribute(bodyColorArr, 3);
    if (headRef.current) headRef.current.instanceColor = new THREE.InstancedBufferAttribute(headColorArr, 3);
    if (legsRef.current) legsRef.current.instanceColor = new THREE.InstancedBufferAttribute(legsColorArr, 3);
    if (bikeFrameRef.current) bikeFrameRef.current.instanceColor = new THREE.InstancedBufferAttribute(bikeColorArr, 3);
    if (vehicleRef.current) vehicleRef.current.instanceColor = new THREE.InstancedBufferAttribute(carColorArr, 3);
  }, [bodyColorArr, headColorArr, legsColorArr, bikeColorArr, carColorArr]);

  // Nametag visibility (show nearest ~40 to camera)
  const nametagPositions = useRef<{ pos: THREE.Vector3; name: string; visible: boolean }[]>([]);
  const visibleTags = useRef<{ pos: THREE.Vector3; name: string }[]>([]);
  const tagUpdateCounter = useRef(0);

  useEffect(() => {
    nametagPositions.current = npcData.map(n => ({
      pos: new THREE.Vector3(n.roadX + 60, 2.1, n.roadZ + 45),
      name: n.name,
      visible: false,
    }));
  }, [npcData]);

  const frameSkip = useRef(0);

  useFrame((state) => {
    frameSkip.current++;
    if (frameSkip.current % 3 !== 0) return;

    const time = state.clock.elapsedTime;
    const camPos = state.camera.position;

    // ── Update nametag visibility every 30 frames ──
    tagUpdateCounter.current++;
    if (tagUpdateCounter.current % 10 === 0) {
      const sorted = nametagPositions.current
        .map((t, i) => ({ dist: camPos.distanceToSquared(t.pos), i }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 40);

      const visSet = new Set(sorted.map(s => s.i));
      visibleTags.current = [];
      nametagPositions.current.forEach((t, i) => {
        t.visible = visSet.has(i);
        if (t.visible) visibleTags.current.push({ pos: t.pos, name: t.name });
      });
    }

    if (!bodyRef.current || !headRef.current || !legsRef.current || !armsRef.current) return;

    let bikeIdx = 0;

    for (let i = 0; i < TOTAL_NPC; i++) {
      const n = npcData[i];
      let px: number, pz: number, ry = 0;

      switch (n.activity) {
        case 'walking': {
          const walk = Math.sin(time * n.speed * 2 + n.offset) * 0.1;
          if (n.isHorizontal) {
            px = n.roadX + Math.sin(time * n.speed * 0.3 + n.offset) * 200 * n.direction;
            pz = n.roadZ;
            if (px > CITY_RADIUS) px -= CITY_RADIUS * 2;
            if (px < -CITY_RADIUS) px += CITY_RADIUS * 2;
            ry = n.direction > 0 ? Math.PI / 2 : -Math.PI / 2;
          } else {
            px = n.roadX;
            pz = n.roadZ + Math.sin(time * n.speed * 0.3 + n.offset) * 200 * n.direction;
            if (pz > CITY_RADIUS) pz -= CITY_RADIUS * 2;
            if (pz < -CITY_RADIUS) pz += CITY_RADIUS * 2;
            ry = n.direction > 0 ? 0 : Math.PI;
          }

          const cx = px + 60, cz = pz + 45;

          // Body (torso)
          dummy.position.set(cx, 0.7 + walk * 0.05, cz);
          dummy.rotation.set(0, ry, 0);
          dummy.scale.set(0.4, 0.6, 0.3);
          dummy.updateMatrix();
          bodyRef.current!.setMatrixAt(i, dummy.matrix);

          // Head
          dummy.position.set(cx, 1.3 + walk * 0.05, cz);
          dummy.scale.set(0.22, 0.22, 0.22);
          dummy.updateMatrix();
          headRef.current!.setMatrixAt(i, dummy.matrix);

          // Legs (animated stride)
          const legSwing = Math.sin(time * n.speed * 4 + n.offset) * 0.15;
          dummy.position.set(cx, 0.22, cz);
          dummy.rotation.set(legSwing, ry, 0);
          dummy.scale.set(0.15, 0.38, 0.15);
          dummy.updateMatrix();
          legsRef.current!.setMatrixAt(i, dummy.matrix);

          // Arms (swing opposite to legs)
          dummy.position.set(cx, 0.75 + walk * 0.03, cz);
          dummy.rotation.set(-legSwing * 0.7, ry, 0);
          dummy.scale.set(0.1, 0.45, 0.1);
          dummy.updateMatrix();
          armsRef.current!.setMatrixAt(i, dummy.matrix);

          // Update nametag pos
          if (nametagPositions.current[i]) {
            nametagPositions.current[i].pos.set(cx, 2.1, cz);
          }
          break;
        }

        case 'bench': {
          px = n.roadX;
          pz = n.roadZ;
          const cx = px, cz = pz;
          const breathe = Math.sin(time * 0.8 + n.offset) * 0.01;

          // Seated body (lower Y, slightly leaned back)
          dummy.position.set(cx, 0.52 + breathe, cz);
          dummy.rotation.set(-0.1, n.offset, 0);
          dummy.scale.set(0.4, 0.5, 0.3);
          dummy.updateMatrix();
          bodyRef.current!.setMatrixAt(i, dummy.matrix);

          // Head
          dummy.position.set(cx, 0.95 + breathe, cz);
          dummy.rotation.set(0, n.offset, 0);
          dummy.scale.set(0.22, 0.22, 0.22);
          dummy.updateMatrix();
          headRef.current!.setMatrixAt(i, dummy.matrix);

          // Legs (bent forward, seated)
          dummy.position.set(cx, 0.25, cz + Math.cos(n.offset) * 0.2);
          dummy.rotation.set(Math.PI / 4, n.offset, 0);
          dummy.scale.set(0.15, 0.35, 0.15);
          dummy.updateMatrix();
          legsRef.current!.setMatrixAt(i, dummy.matrix);

          // Arms resting
          dummy.position.set(cx, 0.55, cz);
          dummy.rotation.set(Math.PI / 6, n.offset, 0);
          dummy.scale.set(0.1, 0.35, 0.1);
          dummy.updateMatrix();
          armsRef.current!.setMatrixAt(i, dummy.matrix);

          if (nametagPositions.current[i]) {
            nametagPositions.current[i].pos.set(cx, 1.5, cz);
          }
          break;
        }

        case 'bike': {
          // Bikes travel along roads in OPPOSITE directions
          if (n.isHorizontal) {
            px = ((time * n.speed * n.direction + n.offset * 500) % (CITY_RADIUS * 2)) - CITY_RADIUS;
            pz = n.roadZ + (n.direction > 0 ? 4 : -4); // offset to road side
            ry = n.direction > 0 ? Math.PI / 2 : -Math.PI / 2;
          } else {
            px = n.roadX + (n.direction > 0 ? 4 : -4);
            pz = ((time * n.speed * n.direction + n.offset * 500) % (CITY_RADIUS * 2)) - CITY_RADIUS;
            ry = n.direction > 0 ? 0 : Math.PI;
          }

          const cx = px + 60, cz = pz + 45;

          // Rider body (seated on bike, leaned forward)
          dummy.position.set(cx, 0.9, cz);
          dummy.rotation.set(-0.25, ry, 0);
          dummy.scale.set(0.38, 0.55, 0.28);
          dummy.updateMatrix();
          bodyRef.current!.setMatrixAt(i, dummy.matrix);

          // Rider head
          dummy.position.set(cx, 1.35, cz);
          dummy.rotation.set(0, ry, 0);
          dummy.scale.set(0.2, 0.2, 0.2);
          dummy.updateMatrix();
          headRef.current!.setMatrixAt(i, dummy.matrix);

          // Rider legs (on bike pegs)
          dummy.position.set(cx, 0.35, cz);
          dummy.rotation.set(0.5, ry, 0);
          dummy.scale.set(0.13, 0.35, 0.13);
          dummy.updateMatrix();
          legsRef.current!.setMatrixAt(i, dummy.matrix);

          // Rider arms (reaching handlebars)
          dummy.position.set(cx, 0.95, cz);
          dummy.rotation.set(-0.6, ry, 0);
          dummy.scale.set(0.09, 0.4, 0.09);
          dummy.updateMatrix();
          armsRef.current!.setMatrixAt(i, dummy.matrix);

          // Bike frame
          if (bikeFrameRef.current) {
            dummy.position.set(cx, 0.4, cz);
            dummy.rotation.set(0, ry, 0);
            dummy.scale.set(0.5, 0.35, 1.1);
            dummy.updateMatrix();
            bikeFrameRef.current.setMatrixAt(bikeIdx, dummy.matrix);
          }

          // Front wheel (spinning)
          const wheelSpin = time * n.speed * 8;
          if (bikeWheelFRef.current) {
            const fwdX = Math.sin(ry) * 0.7;
            const fwdZ = Math.cos(ry) * 0.7;
            dummy.position.set(cx + fwdX, 0.25, cz + fwdZ);
            dummy.rotation.set(wheelSpin, ry, 0);
            dummy.scale.set(0.25, 0.25, 0.08);
            dummy.updateMatrix();
            bikeWheelFRef.current.setMatrixAt(bikeIdx, dummy.matrix);
          }

          // Rear wheel (spinning)
          if (bikeWheelRRef.current) {
            const bkX = -Math.sin(ry) * 0.5;
            const bkZ = -Math.cos(ry) * 0.5;
            dummy.position.set(cx + bkX, 0.25, cz + bkZ);
            dummy.rotation.set(wheelSpin, ry, 0);
            dummy.scale.set(0.25, 0.25, 0.08);
            dummy.updateMatrix();
            bikeWheelRRef.current.setMatrixAt(bikeIdx, dummy.matrix);
          }

          bikeIdx++;

          if (nametagPositions.current[i]) {
            nametagPositions.current[i].pos.set(cx, 1.9, cz);
          }
          break;
        }

        case 'train': {
          // Seated in trains along metro oval
          const trainAngle = (time * 0.15 + n.offset) % (Math.PI * 2);
          px = Math.cos(trainAngle) * 700;
          pz = Math.sin(trainAngle) * 500;
          ry = trainAngle + Math.PI / 2;
          const cx = px + 60, cz = pz + 45;
          const sway = Math.sin(time * 2 + n.offset) * 0.015;

          // Seated body
          dummy.position.set(cx, 2.8 + sway, cz);
          dummy.rotation.set(0, ry, 0);
          dummy.scale.set(0.38, 0.5, 0.28);
          dummy.updateMatrix();
          bodyRef.current!.setMatrixAt(i, dummy.matrix);

          // Head
          dummy.position.set(cx, 3.25 + sway, cz);
          dummy.rotation.set(0, ry + Math.sin(time * 0.5 + n.offset) * 0.1, 0);
          dummy.scale.set(0.2, 0.2, 0.2);
          dummy.updateMatrix();
          headRef.current!.setMatrixAt(i, dummy.matrix);

          // Legs
          dummy.position.set(cx, 2.4, cz);
          dummy.rotation.set(Math.PI / 4, ry, 0);
          dummy.scale.set(0.13, 0.32, 0.13);
          dummy.updateMatrix();
          legsRef.current!.setMatrixAt(i, dummy.matrix);

          // Arms resting on lap
          dummy.position.set(cx, 2.75, cz);
          dummy.rotation.set(Math.PI / 5, ry, 0);
          dummy.scale.set(0.09, 0.32, 0.09);
          dummy.updateMatrix();
          armsRef.current!.setMatrixAt(i, dummy.matrix);

          if (nametagPositions.current[i]) {
            nametagPositions.current[i].pos.set(cx, 3.8, cz);
          }
          break;
        }
      }
    }

    bodyRef.current!.instanceMatrix.needsUpdate = true;
    headRef.current!.instanceMatrix.needsUpdate = true;
    legsRef.current!.instanceMatrix.needsUpdate = true;
    armsRef.current!.instanceMatrix.needsUpdate = true;
    if (bikeFrameRef.current) bikeFrameRef.current.instanceMatrix.needsUpdate = true;
    if (bikeWheelFRef.current) bikeWheelFRef.current.instanceMatrix.needsUpdate = true;
    if (bikeWheelRRef.current) bikeWheelRRef.current.instanceMatrix.needsUpdate = true;

    // Update vehicles
    if (vehicleRef.current) {
      for (let i = 0; i < VEHICLE_COUNT; i++) {
        const v = vehicleData[i];
        let vpx: number, vpz: number, vry: number;
        if (v.isHorizontal) {
          vpx = ((time * v.speed * v.direction + v.offset * 500) % (CITY_RADIUS * 2)) - CITY_RADIUS;
          vpz = v.roadZ;
          vry = v.direction > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else {
          vpx = v.roadX;
          vpz = ((time * v.speed * v.direction + v.offset * 500) % (CITY_RADIUS * 2)) - CITY_RADIUS;
          vry = v.direction > 0 ? 0 : Math.PI;
        }
        dummy.position.set(vpx + 60, 0.4, vpz + 45);
        dummy.rotation.set(0, vry, 0);
        dummy.scale.set(1, 0.5, 2);
        dummy.updateMatrix();
        vehicleRef.current.setMatrixAt(i, dummy.matrix);
      }
      vehicleRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* NPC Bodies (torsos) — 500 */}
      <instancedMesh ref={bodyRef} args={[undefined, undefined, TOTAL_NPC]} castShadow frustumCulled>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>

      {/* NPC Heads — 500 */}
      <instancedMesh ref={headRef} args={[undefined, undefined, TOTAL_NPC]} frustumCulled>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>

      {/* NPC Legs — 500 */}
      <instancedMesh ref={legsRef} args={[undefined, undefined, TOTAL_NPC]} frustumCulled>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>

      {/* NPC Arms — 500 */}
      <instancedMesh ref={armsRef} args={[undefined, undefined, TOTAL_NPC]} frustumCulled>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#c68642" roughness={0.7} />
      </instancedMesh>

      {/* Bike frames — for riders only */}
      <instancedMesh ref={bikeFrameRef} args={[undefined, undefined, BIKE_RIDERS]} castShadow frustumCulled>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial metalness={0.6} roughness={0.3} />
      </instancedMesh>

      {/* Bike front wheels */}
      <instancedMesh ref={bikeWheelFRef} args={[undefined, undefined, BIKE_RIDERS]} frustumCulled>
        <cylinderGeometry args={[1, 1, 1, 12]} />
        <meshStandardMaterial color="#111111" roughness={0.9} />
      </instancedMesh>

      {/* Bike rear wheels */}
      <instancedMesh ref={bikeWheelRRef} args={[undefined, undefined, BIKE_RIDERS]} frustumCulled>
        <cylinderGeometry args={[1, 1, 1, 12]} />
        <meshStandardMaterial color="#111111" roughness={0.9} />
      </instancedMesh>

      {/* Cars / vehicles */}
      <instancedMesh ref={vehicleRef} args={[undefined, undefined, VEHICLE_COUNT]} castShadow frustumCulled>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial metalness={0.6} roughness={0.3} />
      </instancedMesh>

      {/* Nametags (nearest ~40 only for performance) */}
      <NpcNametagRenderer npcData={npcData} nametagPositions={nametagPositions} />
    </group>
  );
};

// Separate nametag renderer to avoid re-render overhead
const NpcNametagRenderer: React.FC<{
  npcData: NPCEntity[];
  nametagPositions: React.MutableRefObject<{ pos: THREE.Vector3; name: string; visible: boolean }[]>;
}> = ({ nametagPositions }) => {
  // Re-render every ~2s by tracking a key
  const [tick, setTick] = React.useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(iv);
  }, []);

  const visible = nametagPositions.current.filter(t => t.visible).slice(0, 40);

  return (
    <>
      {visible.map((t, i) => (
        <NPCNametag key={`${t.name}-${i}`} position={t.pos} name={t.name} />
      ))}
    </>
  );
};

export default CrowdAvatarSystem;
