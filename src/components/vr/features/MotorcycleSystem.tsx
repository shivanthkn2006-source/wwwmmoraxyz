// ═══════════════════════════════════════════════════════════════════════════════
// MOTORCYCLE SYSTEM — Honda 500cc Sport style metallic bike
// Spawns next to avatar, detailed fairings, "500cc Sport" sticker
// Avatar faces East on load. Separate wiring — no legacy deps
// ═══════════════════════════════════════════════════════════════════════════════

import React, { Suspense, useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Html, useGLTF } from '@react-three/drei';
import LeonCharacterModel from './LeonCharacterModel';
import HelenaCharacterModel from './HelenaCharacterModel';
import PartyCharacterModel from './PartyCharacterModel';
import { useVRAvatarProfile, type VRAvatarVariant } from '@/hooks/useVRAvatarProfile';
import { isVRAudioUnlocked } from '@/lib/vrAudioGate';
import bikeEngineStartSrc from '@/assets/audio/bike-engine-start.mp3';
import bikeEngineRunningSrc from '@/assets/audio/bike-engine-running.mp3';
import uploadedBikeModelUrl from '@/assets/models/zero-two-motorcycle.glb';

// ─── Bike scale (sport bike ~2.2m long, ~1.15m tall at tank) ─────────────────
const BK = {
  length: 2.2,
  wheelR: 0.34,
  wheelW: 0.14,
  seatH: 0.85,
  handleH: 1.08,
  handleW: 0.62,
};

// Metallic Honda colors
const METAL_RED = '#2a313c'; // metallic graphite body
const METAL_DARK = '#161b22';
const CHROME = '#e7ecf2';
const GOLD_ACCENT = '#c6a15a';
const DEFAULT_BIKE_VOLUME = 0.22;
const PLAYER_MOUNT_DISTANCE = 3.0;
const BIKE_WORLD_SCALE = 1;
const BIKE_GROUND_Y = 0.15;
const USE_UPLOADED_BIKE_MODEL = true;

// ─── Engine Audio ────────────────────────────────────────────────────────────
class BikeAudioEngine {
  private startAudio: HTMLAudioElement | null = null;
  private runningAudio: HTMLAudioElement | null = null;
  private running = false;
  private masterVolume = DEFAULT_BIKE_VOLUME;
  private speedFactor = 0;

  private ensureAudio() {
    if (typeof window === 'undefined') return;
    if (!this.startAudio) {
      const start = new Audio(bikeEngineStartSrc);
      start.preload = 'auto';
      start.crossOrigin = 'anonymous';
      this.startAudio = start;
    }
    if (!this.runningAudio) {
      const running = new Audio(bikeEngineRunningSrc);
      running.loop = true;
      running.preload = 'auto';
      running.crossOrigin = 'anonymous';
      running.volume = 0;
      this.runningAudio = running;
    }
  }

  private applyRunningMix() {
    if (!this.runningAudio) return;

    const dynamic = 0.14 + this.speedFactor * 0.72;
    const volume = THREE.MathUtils.clamp(dynamic * this.masterVolume, 0, 1);
    this.runningAudio.volume = volume;
    this.runningAudio.playbackRate = THREE.MathUtils.clamp(0.82 + this.speedFactor * 0.56, 0.8, 1.55);

    if (!this.running || !isVRAudioUnlocked() || volume < 0.01) {
      if (!this.runningAudio.paused) void this.runningAudio.pause();
      return;
    }

    if (this.runningAudio.paused) {
      void this.runningAudio.play().catch(() => {});
    }
  }

  start(playIgnition = true) {
    this.ensureAudio();
    if (this.running) return;
    this.running = true;
    this.speedFactor = 0;
    if (playIgnition) this.triggerStart();
    this.applyRunningMix();
  }

  triggerStart() {
    this.ensureAudio();
    if (!this.startAudio || !isVRAudioUnlocked()) return;
    this.startAudio.currentTime = 0;
    this.startAudio.volume = THREE.MathUtils.clamp(this.masterVolume * 1.15, 0, 1);
    void this.startAudio.play().catch(() => {});
    this.applyRunningMix();
  }

  updateSpeed(f: number) {
    this.speedFactor = THREE.MathUtils.clamp(f, 0, 1);
    this.applyRunningMix();
  }

  setVolume(v: number) {
    this.masterVolume = THREE.MathUtils.clamp(v, 0, 1);
    this.applyRunningMix();
  }

  stop() {
    if (!this.running && !this.runningAudio && !this.startAudio) return;
    this.running = false;
    this.speedFactor = 0;
    if (this.runningAudio) {
      this.runningAudio.pause();
      this.runningAudio.currentTime = 0;
    }
    if (this.startAudio) {
      this.startAudio.pause();
      this.startAudio.currentTime = 0;
    }
  }
}

// ─── Sport Bike 3D Model (Honda 500cc style) ─────────────────────────────────
const SportBikeModel: React.FC<{ steerRef: React.MutableRefObject<number>; spinRef: React.MutableRefObject<number> }> = ({ steerRef, spinRef }) => {
  const fWheelRef = useRef<THREE.Group>(null);
  const rWheelRef = useRef<THREE.Group>(null);
  const forkGroupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (fWheelRef.current) { fWheelRef.current.rotation.x = spinRef.current; fWheelRef.current.rotation.y = steerRef.current * 0.35; }
    if (rWheelRef.current) { rWheelRef.current.rotation.x = spinRef.current; }
    if (forkGroupRef.current) { forkGroupRef.current.rotation.set(0.32, steerRef.current * 0.28, 0); }
  });

  return (
    <group>
      {/* ── FUEL TANK (sculpted metallic body) ───────────── */}
      <mesh position={[0, 0.79, 0.14]} rotation={[0.12, 0, 0]}>
        <capsuleGeometry args={[0.19, 0.44, 8, 18]} />
        <meshStandardMaterial color={METAL_RED} metalness={0.9} roughness={0.12} />
      </mesh>
      <mesh position={[0, 0.72, 0.36]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.18, 0.24, 18]} />
        <meshStandardMaterial color={METAL_RED} metalness={0.88} roughness={0.13} />
      </mesh>
      {/* Black accent stripe on tank */}
      <mesh position={[0, 0.92, 0.22]} rotation={[0.08, 0, 0]}>
        <capsuleGeometry args={[0.03, 0.42, 4, 10]} />
        <meshStandardMaterial color={METAL_DARK} metalness={0.7} roughness={0.2} />
      </mesh>

      {/* "500cc Sport" sticker (white text label on tank side) */}
      <Html position={[0.21, 0.78, 0.15]} rotation={[0, Math.PI / 2, 0]}
        center distanceFactor={5} occlude={false}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          fontFamily: 'monospace', fontSize: '8px', fontWeight: 'bold',
          color: '#ffffff', textShadow: '0 0 3px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap', letterSpacing: '1px',
        }}>
          500cc SPORT
        </div>
      </Html>
      <Html position={[-0.21, 0.78, 0.15]} rotation={[0, -Math.PI / 2, 0]}
        center distanceFactor={5} occlude={false}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          fontFamily: 'monospace', fontSize: '8px', fontWeight: 'bold',
          color: '#ffffff', textShadow: '0 0 3px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap', letterSpacing: '1px',
        }}>
          500cc SPORT
        </div>
      </Html>

      {/* ── SEAT ─────────────────────────────────────────── */}
      <mesh position={[0, 0.81, -0.28]} rotation={[0.05, 0, 0]}>
        <capsuleGeometry args={[0.11, 0.44, 8, 14]} />
        <meshStandardMaterial color="#0f0f0f" roughness={0.95} />
      </mesh>

      {/* ── TAIL (sport fairing) ─────────────────────────── */}
      <mesh position={[0, 0.76, -0.63]} rotation={[-0.32, 0, 0]}>
        <capsuleGeometry args={[0.1, 0.26, 6, 12]} />
        <meshStandardMaterial color={METAL_RED} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Tail light */}
      <mesh position={[0, 0.72, -0.78]}>
        <boxGeometry args={[0.20, 0.06, 0.03]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
      </mesh>
      {/* Turn signals */}
      {[-0.12, 0.12].map((x, i) => (
        <mesh key={i} position={[x, 0.72, -0.80]}>
          <sphereGeometry args={[0.015, 6, 6]} />
          <meshStandardMaterial color="#ff8800" emissive="#ff8800" emissiveIntensity={0.3} />
        </mesh>
      ))}

      {/* ── ENGINE BLOCK (V-twin style) ──────────────────── */}
      <mesh position={[0, 0.43, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.2, 0.42, 14]} />
        <meshStandardMaterial color="#252525" metalness={0.85} roughness={0.35} />
      </mesh>
      {/* Cylinder fins */}
      {[-0.1, -0.03, 0.04, 0.1].map((z, i) => (
        <mesh key={i} position={[0.18, 0.44, z]}>
          <boxGeometry args={[0.04, 0.22, 0.05]} />
          <meshStandardMaterial color={CHROME} metalness={0.92} roughness={0.1} />
        </mesh>
      ))}
      {/* Oil cooler */}
      <mesh position={[0, 0.30, 0.30]}>
        <boxGeometry args={[0.25, 0.08, 0.06]} />
        <meshStandardMaterial color="#333" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* ── EXHAUST (dual chrome pipes) ──────────────────── */}
      {[0.16, 0.20].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0.32, -0.20]} rotation={[0, 0, 0.08]}>
            <cylinderGeometry args={[0.022, 0.028, 0.55, 8]} />
            <meshStandardMaterial color={CHROME} metalness={0.93} roughness={0.08} />
          </mesh>
          <mesh position={[x + 0.02, 0.30, -0.50]}>
            <cylinderGeometry args={[0.032, 0.038, 0.16, 8]} />
            <meshStandardMaterial color={CHROME} metalness={0.93} roughness={0.08} />
          </mesh>
        </group>
      ))}

      {/* ── FRONT FORK + HANDLEBARS ──────────────────────── */}
      <group ref={forkGroupRef} position={[0, 0.68, 0.62]} rotation={[0.32, 0, 0]}>
        {/* USD forks (gold like Honda) */}
        {[-0.07, 0.07].map((x, i) => (
          <group key={i}>
            <mesh position={[x, -0.08, 0.05]}>
              <cylinderGeometry args={[0.022, 0.022, 0.50, 8]} />
              <meshStandardMaterial color={GOLD_ACCENT} metalness={0.9} roughness={0.12} />
            </mesh>
            <mesh position={[x, -0.30, 0.05]}>
              <cylinderGeometry args={[0.018, 0.018, 0.18, 6]} />
              <meshStandardMaterial color={CHROME} metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
        ))}
        {/* Triple clamp */}
        <mesh position={[0, 0.1, 0.05]}>
          <boxGeometry args={[0.2, 0.02, 0.06]} />
          <meshStandardMaterial color={METAL_DARK} metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Handlebar */}
        <mesh position={[0, 0.22, 0]}>
          <boxGeometry args={[BK.handleW, 0.022, 0.022]} />
          <meshStandardMaterial color={METAL_DARK} roughness={0.7} />
        </mesh>
        {/* Grips (rubber) */}
        {[-0.29, 0.29].map((x, i) => (
          <mesh key={i} position={[x, 0.22, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.09, 8]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.92} />
          </mesh>
        ))}
        {/* Brake levers */}
        {[-0.26, 0.26].map((x, i) => (
          <mesh key={i} position={[x, 0.20, 0.04]} rotation={[0.5, 0, 0]}>
            <boxGeometry args={[0.01, 0.08, 0.01]} />
            <meshStandardMaterial color={CHROME} metalness={0.9} />
          </mesh>
        ))}
        {/* Headlight */}
        <mesh position={[0, 0.05, 0.22]}>
          <sphereGeometry args={[0.07, 10, 10, 0, Math.PI]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffdd" emissiveIntensity={0.5} />
        </mesh>
        {/* Headlight housing */}
        <mesh position={[0, 0.05, 0.18]}>
          <cylinderGeometry args={[0.075, 0.08, 0.04, 10]} />
          <meshStandardMaterial color={METAL_DARK} metalness={0.7} />
        </mesh>
        {/* Mirrors */}
        {[-0.32, 0.32].map((x, i) => (
          <group key={i}>
            <mesh position={[x, 0.26, 0.02]}>
              <boxGeometry args={[0.01, 0.06, 0.01]} />
              <meshStandardMaterial color={METAL_DARK} />
            </mesh>
            <mesh position={[x, 0.30, 0.02]}>
              <sphereGeometry args={[0.028, 8, 8]} />
              <meshStandardMaterial color={CHROME} metalness={0.95} roughness={0.05} />
            </mesh>
          </group>
        ))}
        {/* Instrument cluster */}
        <mesh position={[0, 0.16, 0.08]}>
          <cylinderGeometry args={[0.04, 0.04, 0.015, 10]} />
          <meshStandardMaterial color="#111" emissive="#00ff88" emissiveIntensity={0.15} />
        </mesh>
      </group>

      {/* ── FRONT WHEEL ──────────────────────────────────── */}
      <group ref={fWheelRef} position={[0, BK.wheelR, 0.76]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[BK.wheelR, 0.065, 10, 28]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.88} />
        </mesh>
        {/* Multi-spoke alloy wheel */}
        {Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2).map((a, i) => (
          <mesh key={i} position={[0, Math.sin(a) * 0.16, Math.cos(a) * 0.16]} rotation={[a, 0, Math.PI / 2]}>
            <boxGeometry args={[0.015, BK.wheelR * 1.5, 0.008]} />
            <meshStandardMaterial color={CHROME} metalness={0.9} roughness={0.1} />
          </mesh>
        ))}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.07, 10]} />
          <meshStandardMaterial color={CHROME} metalness={0.9} roughness={0.08} />
        </mesh>
        {/* Brake disc */}
        <mesh position={[0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.22, 0.015, 4, 20]} />
          <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Front fender */}
        <mesh position={[0, 0.24, 0]} rotation={[0.25, 0, 0]}>
          <boxGeometry args={[0.20, 0.02, 0.50]} />
          <meshStandardMaterial color={METAL_RED} metalness={0.7} roughness={0.2} />
        </mesh>
      </group>

      {/* ── REAR WHEEL ───────────────────────────────────── */}
      <group ref={rWheelRef} position={[0, BK.wheelR, -0.55]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[BK.wheelR, 0.075, 10, 28]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.88} />
        </mesh>
        {Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2).map((a, i) => (
          <mesh key={i} position={[0, Math.sin(a) * 0.16, Math.cos(a) * 0.16]} rotation={[a, 0, Math.PI / 2]}>
            <boxGeometry args={[0.015, BK.wheelR * 1.5, 0.008]} />
            <meshStandardMaterial color={CHROME} metalness={0.9} roughness={0.1} />
          </mesh>
        ))}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.10, 10]} />
          <meshStandardMaterial color={CHROME} metalness={0.9} roughness={0.08} />
        </mesh>
        {/* Chain + sprocket */}
        <mesh position={[0.07, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.09, 0.01, 6, 18]} />
          <meshStandardMaterial color="#555" metalness={0.7} />
        </mesh>
        {/* Brake disc */}
        <mesh position={[-0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.20, 0.012, 4, 20]} />
          <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Rear fender */}
        <mesh position={[0, 0.26, -0.04]} rotation={[-0.18, 0, 0]}>
          <boxGeometry args={[0.22, 0.02, 0.42]} />
          <meshStandardMaterial color={METAL_DARK} metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* ── SIDE FAIRINGS ────────────────────────────────── */}
      {[-1, 1].map(side => (
        <mesh key={side} position={[side * 0.2, 0.56, 0.06]} rotation={[0.04, 0, side * 0.25]}>
          <capsuleGeometry args={[0.03, 0.58, 6, 10]} />
          <meshStandardMaterial color={METAL_RED} metalness={0.8} roughness={0.18} />
        </mesh>
      ))}

      {/* ── FOOTPEGS ─────────────────────────────────────── */}
      {[-0.22, 0.22].map((x, i) => (
        <mesh key={i} position={[x, 0.30, -0.05]}>
          <boxGeometry args={[0.09, 0.015, 0.045]} />
          <meshStandardMaterial color="#333" metalness={0.7} />
        </mesh>
      ))}

      {/* ── KICKSTAND ────────────────────────────────────── */}
      <mesh position={[-0.20, 0.16, -0.08]} rotation={[0, 0, 0.28]}>
        <cylinderGeometry args={[0.01, 0.01, 0.38, 4]} />
        <meshStandardMaterial color="#444" metalness={0.8} />
      </mesh>

      {/* ── SWING ARM ────────────────────────────────────── */}
      <mesh position={[0.08, 0.34, -0.28]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.04, 0.04, 0.55]} />
        <meshStandardMaterial color={METAL_DARK} metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
};

const UploadedBikeModel: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { scene } = useGLTF(uploadedBikeModelUrl) as { scene: THREE.Group };

  const fittedModel = useMemo(() => {
    const cloned = scene.clone(true);

    cloned.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.castShadow = true;
      obj.receiveShadow = true;

      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.roughness = Math.min(0.8, Math.max(0.2, mat.roughness));
          mat.metalness = Math.min(0.9, Math.max(0.1, mat.metalness));
        }
      });
    });

    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const sourceLength = Math.max(size.z, size.x, 0.0001);
    const sourceHeight = Math.max(size.y, 0.0001);
    const targetLength = BK.length;
    const targetHeight = 1.16;
    const fitScale = Math.min(targetLength / sourceLength, targetHeight / sourceHeight);

    cloned.scale.setScalar(fitScale);
    // Place bottom of bike at y=0 with extra lift so wheels sit ON the ground
    const groundOffset = -box.min.y * fitScale + BK.wheelR * 0.35;
    cloned.position.set(-center.x * fitScale, groundOffset, -center.z * fitScale);

    return cloned;
  }, [scene]);

  return (
    <group rotation={[0, Math.PI, 0]}>
      <primitive object={fittedModel} />
      <group position={fittedModel.position.toArray()} scale={fittedModel.scale.toArray()}>
        {children}
      </group>
    </group>
  );
};

// ─── Rider (Leon riding pose) ────────────────────────────────────────────────
const BikeRider: React.FC<{ lean: number; avatarVariant: VRAvatarVariant; displayName: string }> = ({
  lean,
  avatarVariant,
  displayName,
}) => (
  <group position={[0, BK.seatH + 0.15, -0.15]} rotation={[lean * 0.12, Math.PI, lean * 0.08]}>
    <group position={[0, 0, 0]} rotation={[0.18, 0, 0]} scale={[0.95, 0.95, 0.95]}>
      {avatarVariant === 'female' ? (
        <HelenaCharacterModel pose="riding" targetHeight={1.7} />
      ) : avatarVariant === 'party-male' ? (
        <PartyCharacterModel animState="sitting" pose="riding" targetHeight={1.72} />
      ) : (
        <LeonCharacterModel pose="riding" targetHeight={1.72} />
      )}
    </group>
    <Html
      position={[0, 2.05, 0]}
      center
      sprite
      distanceFactor={80}
      occlude={false}
      style={{ pointerEvents: 'none' }}
    >
      <span className="whitespace-nowrap rounded-full bg-background/40 px-0.5 text-[3px] font-mono font-medium leading-none text-foreground">
        {displayName}
      </span>
    </Html>
  </group>
);

// ─── Controller ──────────────────────────────────────────────────────────────
interface MotorcycleControllerProps {
  spawnPosition?: [number, number, number];
  displayName?: string;
}

export const MotorcycleController: React.FC<MotorcycleControllerProps> = ({
  // Spawn right next to avatar (avatar spawns at [60,0,185]), facing East
  spawnPosition = [62, BIKE_GROUND_Y, 185],
  displayName = '@player',
}) => {
  const bikePos = useRef(new THREE.Vector3(...spawnPosition));
  const bikeYaw = useRef(Math.PI / 2); // Face East (matching avatar rotation)
  const speed = useRef(0);
  const steerAngle = useRef(0);
  const wheelSpin = useRef(0);
  const lean = useRef(0);
  const bikeVelocity = useRef(new THREE.Vector3());
  const handbrake = useRef(false);
  const cameraMode = useRef<'back' | 'shoulder'>('back');
  const playerPos = useRef(new THREE.Vector3(60, 0, 185));
  const hasSnapSpawned = useRef(false);
  const promptVisible = useRef(false);
  const volumeRef = useRef(DEFAULT_BIKE_VOLUME);
  const bikeGroupRef = useRef<THREE.Group>(null);
  const bikeCameraPitch = useRef(0);
  const bikeCameraYaw = useRef(0);
  const bikeCamDragging = useRef(false);
  const bikeCamLastPointer = useRef({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [cameraHudMode, setCameraHudMode] = useState<'back' | 'shoulder'>('back');
  const [isNight, setIsNight] = useState(() => {
    const hour = new Date().getHours();
    return hour < 6 || hour >= 18;
  });
  const audioRef = useRef<BikeAudioEngine | null>(null);
  const { avatarVariant } = useVRAvatarProfile();

  const keys = useRef({ forward: false, backward: false, left: false, right: false, boost: false });
  const { camera } = useThree();

  const BIKE_CONFIG = {
    mass: 200,
    maxSpeed: 28,
    acceleration: 18,
    brakeForce: 30,
    steerAngle: 0.6,
    steerSpeed: 2.5,
    wheelRadius: BK.wheelR,
    reverseMaxSpeed: 8,
    drag: 0.26,
    lateralGrip: 5.4,
    cameraOffsets: {
      back: [0, 1.4, -3.2] as [number, number, number],
      shoulder: [0.6, 1.2, -2.2] as [number, number, number],
    },
  };

  const setVolume = useCallback((next: number) => {
    const clamped = THREE.MathUtils.clamp(next, 0, 1);
    volumeRef.current = clamped;
    audioRef.current?.setVolume(clamped);
    (window as any).__vrBikeVolume = clamped;
    return clamped;
  }, []);

  const mountBike = useCallback((force = false) => {
    if (isMounted) return;
    const distance = playerPos.current.distanceTo(bikePos.current);
    if (!force && distance > PLAYER_MOUNT_DISTANCE) return;

    if (force && distance > PLAYER_MOUNT_DISTANCE) {
      bikePos.current.set(playerPos.current.x + 2.4, BIKE_GROUND_Y, playerPos.current.z + 1.1);
      bikeYaw.current = Math.PI / 2;
    }

    bikeVelocity.current.set(0, 0, 0);
    speed.current = 0;
    handbrake.current = false;
    cameraMode.current = 'back';
    setCameraHudMode('back');
    setIsMounted(true);
    if (!audioRef.current) audioRef.current = new BikeAudioEngine();
    audioRef.current.start();
    audioRef.current.setVolume(volumeRef.current);
    window.dispatchEvent(new CustomEvent('vr-bike-mount', {
      detail: { mounted: true, volume: volumeRef.current, cameraMode: cameraMode.current },
    }));
  }, [isMounted]);

  const dismountBike = useCallback(() => {
    if (!isMounted) return;
    setIsMounted(false);
    speed.current = 0;
    bikeVelocity.current.set(0, 0, 0);
    handbrake.current = false;
    keys.current = { forward: false, backward: false, left: false, right: false, boost: false };
    audioRef.current?.stop();
    audioRef.current = null;
    window.dispatchEvent(new CustomEvent('vr-bike-mount', {
      detail: { mounted: false, volume: volumeRef.current },
    }));
  }, [isMounted]);

  // Keep bike near player spawn for immediate mounting after world load
  useEffect(() => {
    const onPlayerPosition = (event: Event) => {
      const p = (event as CustomEvent).detail?.position;
      if (!Array.isArray(p) || p.length !== 3) return;

      playerPos.current.set(p[0], Math.max(0, p[1] ?? 0), p[2]);
      if (!hasSnapSpawned.current && !isMounted) {
        bikePos.current.set(playerPos.current.x + 2.4, BIKE_GROUND_Y, playerPos.current.z + 1.1);
        bikeYaw.current = Math.PI / 2;
        hasSnapSpawned.current = true;
      }
    };

    window.addEventListener('vr-player-position', onPlayerPosition as EventListener);
    return () => window.removeEventListener('vr-player-position', onPlayerPosition as EventListener);
  }, [isMounted]);

  useEffect(() => {
    const syncNight = (event?: Event) => {
      const detail = event ? (event as CustomEvent).detail || {} : {};
      if (typeof detail.isNight === 'boolean') {
        setIsNight(detail.isNight);
        return;
      }
    };

    syncNight();
    window.addEventListener('sky-phase-change', syncNight as EventListener);
    window.addEventListener('vr-sun-hour-change', syncNight as EventListener);

    return () => {
      window.removeEventListener('sky-phase-change', syncNight as EventListener);
      window.removeEventListener('vr-sun-hour-change', syncNight as EventListener);
    };
  }, []);

  // Proximity check (player-position based for stable mounting)
  useFrame(() => {
    if (isMounted) {
      if (promptVisible.current) {
        promptVisible.current = false;
        setShowPrompt(false);
      }
      return;
    }

    const d = playerPos.current.distanceTo(bikePos.current);
    const shouldShow = d < PLAYER_MOUNT_DISTANCE;
    if (shouldShow !== promptVisible.current) {
      promptVisible.current = shouldShow;
      setShowPrompt(shouldShow);
    }
  });

  // Keyboard controls
  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const t = (e.target as HTMLElement)?.tagName;
      return t === 'INPUT' || t === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
    };

    const onDown = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      if (e.code === 'KeyE') {
        e.preventDefault();
        if (isMounted) dismountBike();
        else mountBike();
        return;
      }
      if (e.code === 'KeyV' && isMounted) {
        e.preventDefault();
        cameraMode.current = cameraMode.current === 'back' ? 'shoulder' : 'back';
        setCameraHudMode(cameraMode.current);
        return;
      }
      if (!isMounted) return;
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': keys.current.forward = true; e.preventDefault(); break;
        case 'KeyS': case 'ArrowDown': keys.current.backward = true; e.preventDefault(); break;
        case 'KeyA': case 'ArrowLeft': keys.current.left = true; e.preventDefault(); break;
        case 'KeyD': case 'ArrowRight': keys.current.right = true; e.preventDefault(); break;
        case 'ShiftLeft': case 'ShiftRight': keys.current.boost = true; break;
        case 'Space': handbrake.current = true; e.preventDefault(); break;
      }
    };

    const onUp = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': keys.current.forward = false; break;
        case 'KeyS': case 'ArrowDown': keys.current.backward = false; break;
        case 'KeyA': case 'ArrowLeft': keys.current.left = false; break;
        case 'KeyD': case 'ArrowRight': keys.current.right = false; break;
        case 'ShiftLeft': case 'ShiftRight': keys.current.boost = false; break;
        case 'Space': handbrake.current = false; break;
      }
    };

    const onBlur = () => {
      keys.current = { forward: false, backward: false, left: false, right: false, boost: false };
      handbrake.current = false;
    };

    window.addEventListener('keydown', onDown, { capture: true });
    window.addEventListener('keyup', onUp, { capture: true });
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown, true);
      window.removeEventListener('keyup', onUp, true);
      window.removeEventListener('blur', onBlur);
      audioRef.current?.stop();
    };
  }, [isMounted, dismountBike, mountBike]);

  // Touch controls via custom events
  useEffect(() => {
    const onCtrl = (e: Event) => {
      const { action, value, force } = (e as CustomEvent).detail || {};
      if (action === 'mount') {
        mountBike(Boolean(force));
        return;
      }
      if (action === 'dismount') {
        dismountBike();
        return;
      }
      if (action === 'toggle_mount') {
        if (isMounted) dismountBike();
        else mountBike(Boolean(force));
        return;
      }

      if (action === 'volume' && typeof value === 'number') {
        setVolume(value);
        return;
      }
      if (action === 'volume_up') {
        setVolume(volumeRef.current + 0.08);
        return;
      }
      if (action === 'volume_down') {
        setVolume(volumeRef.current - 0.08);
        return;
      }
      if (action === 'start_engine') {
        if (!audioRef.current) audioRef.current = new BikeAudioEngine();
        audioRef.current.start(false);
        audioRef.current.triggerStart();
        audioRef.current.setVolume(volumeRef.current);
        return;
      }

      if (!isMounted) return;
      if (action === 'throttle') keys.current.forward = !!value;
      if (action === 'brake') keys.current.backward = !!value;
      if (action === 'left') keys.current.left = !!value;
      if (action === 'right') keys.current.right = !!value;
      if (action === 'boost') keys.current.boost = !!value;
      if (action === 'handbrake') handbrake.current = !!value;
      if (action === 'stop') {
        keys.current = { forward: false, backward: false, left: false, right: false, boost: false };
        handbrake.current = false;
        bikeVelocity.current.multiplyScalar(0.25);
        speed.current = 0;
      }
    };
    window.addEventListener('vr-bike-control', onCtrl as EventListener);
    return () => window.removeEventListener('vr-bike-control', onCtrl as EventListener);
  }, [camera, dismountBike, isMounted, mountBike, setVolume]);

  useEffect(() => {
    const onCameraAction = (event: Event) => {
      if (!isMounted) return;
      const action = (event as CustomEvent).detail?.action as string | undefined;

      if (action === 'look_up') {
        bikeCameraPitch.current = THREE.MathUtils.clamp(bikeCameraPitch.current - 0.12, -0.4, 0.6);
      }
      if (action === 'look_down') {
        bikeCameraPitch.current = THREE.MathUtils.clamp(bikeCameraPitch.current + 0.12, -0.4, 0.6);
      }
      if (action === 'look_left') {
        bikeCameraYaw.current = THREE.MathUtils.clamp(bikeCameraYaw.current + 0.18, -0.9, 0.9);
      }
      if (action === 'look_right') {
        bikeCameraYaw.current = THREE.MathUtils.clamp(bikeCameraYaw.current - 0.18, -0.9, 0.9);
      }
      if (action === 'look_around') {
        bikeCameraYaw.current = THREE.MathUtils.clamp(bikeCameraYaw.current + Math.PI, -Math.PI, Math.PI);
      }
    };

    const onCameraLook = (event: Event) => {
      if (!isMounted) return;
      const detail = (event as CustomEvent).detail || {};
      if (typeof detail.dx === 'number') {
        bikeCameraYaw.current = THREE.MathUtils.clamp(bikeCameraYaw.current - detail.dx, -0.9, 0.9);
      }
      if (typeof detail.dy === 'number') {
        bikeCameraPitch.current = THREE.MathUtils.clamp(bikeCameraPitch.current + detail.dy, -0.4, 0.6);
      }
    };

    const onRotate = (event: Event) => {
      if (!isMounted) return;
      const detail = (event as CustomEvent).detail || {};
      const radians = (((typeof detail.degrees === 'number' ? detail.degrees : 45)) * Math.PI) / 180;

      if (detail.direction === 'left') bikeCameraYaw.current = THREE.MathUtils.clamp(bikeCameraYaw.current + radians, -Math.PI, Math.PI);
      if (detail.direction === 'right') bikeCameraYaw.current = THREE.MathUtils.clamp(bikeCameraYaw.current - radians, -Math.PI, Math.PI);
      if (detail.direction === 'around') bikeCameraYaw.current = THREE.MathUtils.clamp(bikeCameraYaw.current + Math.PI, -Math.PI, Math.PI);
      if (detail.direction === 'full') bikeCameraYaw.current = THREE.MathUtils.clamp(bikeCameraYaw.current + Math.PI * 2, -Math.PI * 2, Math.PI * 2);
    };

    window.addEventListener('vr-camera', onCameraAction as EventListener);
    window.addEventListener('vr-camera-look', onCameraLook as EventListener);
    window.addEventListener('vr-rotate-360', onRotate as EventListener);

    return () => {
      window.removeEventListener('vr-camera', onCameraAction as EventListener);
      window.removeEventListener('vr-camera-look', onCameraLook as EventListener);
      window.removeEventListener('vr-rotate-360', onRotate as EventListener);
    };
  }, [isMounted]);

  // Mouse drag for bike camera pitch/yaw when mounted
  useEffect(() => {
    if (!isMounted) {
      bikeCameraPitch.current = 0;
      bikeCameraYaw.current = 0;
      return;
    }
    const onDown = (e: PointerEvent) => {
      if (e.button === 0) {
        bikeCamDragging.current = true;
        bikeCamLastPointer.current = { x: e.clientX, y: e.clientY };
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!bikeCamDragging.current) return;
      const dx = e.clientX - bikeCamLastPointer.current.x;
      const dy = e.clientY - bikeCamLastPointer.current.y;
      bikeCamLastPointer.current = { x: e.clientX, y: e.clientY };
      bikeCameraPitch.current = THREE.MathUtils.clamp(bikeCameraPitch.current + dy * 0.003, -0.4, 0.6);
      bikeCameraYaw.current = THREE.MathUtils.clamp(bikeCameraYaw.current - dx * 0.003, -0.8, 0.8);
    };
    const onUp = () => {
      bikeCamDragging.current = false;
      // Slowly reset yaw back to center
      bikeCameraYaw.current *= 0.5;
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isMounted]);

  // Physics
  useFrame((_, delta) => {
    if (!isMounted) return;
    const dt = Math.min(delta, 0.05);
    const k = keys.current;
    const upAxis = new THREE.Vector3(0, 1, 0);
    const baseForward = new THREE.Vector3(0, 0, 1);
    const baseRight = new THREE.Vector3(1, 0, 0);
    const forward = baseForward.clone().applyAxisAngle(upAxis, bikeYaw.current);
    const right = baseRight.clone().applyAxisAngle(upAxis, bikeYaw.current);

    const throttleInput = (k.forward ? 1 : 0) + (k.backward ? -1 : 0);
    const maxForwardSpeed = (k.boost ? BIKE_CONFIG.maxSpeed * 1.12 : BIKE_CONFIG.maxSpeed);
    const targetSteerInput = (k.left ? -1 : 0) + (k.right ? 1 : 0);
    steerAngle.current = THREE.MathUtils.lerp(
      steerAngle.current,
      targetSteerInput * BIKE_CONFIG.steerAngle,
      dt * BIKE_CONFIG.steerSpeed,
    );

    const forwardSpeed = bikeVelocity.current.dot(forward);
    const lateralSpeed = bikeVelocity.current.dot(right);

    if (handbrake.current) {
      bikeVelocity.current.addScaledVector(forward, -forwardSpeed * Math.min(1, dt * 8));
      bikeVelocity.current.addScaledVector(right, -lateralSpeed * Math.min(1, dt * 12));
    } else if (throttleInput > 0) {
      if (forwardSpeed < maxForwardSpeed) {
        bikeVelocity.current.addScaledVector(forward, BIKE_CONFIG.acceleration * dt);
      }
    } else if (throttleInput < 0) {
      if (forwardSpeed > 0.15) {
        const brakeStep = Math.min(forwardSpeed, BIKE_CONFIG.brakeForce * dt);
        bikeVelocity.current.addScaledVector(forward, -brakeStep);
      } else if (forwardSpeed > -BIKE_CONFIG.reverseMaxSpeed) {
        bikeVelocity.current.addScaledVector(forward, -BIKE_CONFIG.acceleration * dt * 0.68);
      }
    }

    bikeVelocity.current.multiplyScalar(1 - Math.min(0.8, BIKE_CONFIG.drag * dt));
    bikeVelocity.current.addScaledVector(right, -lateralSpeed * Math.min(1, BIKE_CONFIG.lateralGrip * dt));

    const forwardAfter = bikeVelocity.current.dot(forward);
    const steerInfluence = THREE.MathUtils.clamp(Math.abs(forwardAfter) / (BIKE_CONFIG.maxSpeed * 0.38), 0.12, 1);
    const directionSign = forwardAfter >= 0 ? 1 : -1;
    bikeYaw.current += steerAngle.current * BIKE_CONFIG.steerSpeed * steerInfluence * directionSign * dt;
    lean.current = THREE.MathUtils.lerp(lean.current, -steerAngle.current * steerInfluence * 0.42, dt * 6.5);

    bikePos.current.addScaledVector(bikeVelocity.current, dt);
    bikePos.current.y = BIKE_GROUND_Y;

    speed.current = Math.abs(forwardAfter);
    wheelSpin.current += (forwardAfter / BIKE_CONFIG.wheelRadius) * dt;
    audioRef.current?.updateSpeed(Math.abs(forwardAfter) / maxForwardSpeed);

    // Update bike group transform via ref (refs don't trigger re-renders, so we must do this imperatively)
    if (bikeGroupRef.current) {
      bikeGroupRef.current.position.set(bikePos.current.x, bikePos.current.y, bikePos.current.z);
      bikeGroupRef.current.rotation.set(0, bikeYaw.current, lean.current);
    }

    // Camera follow with mouse pitch/yaw support
    const [ox, oy, oz] = BIKE_CONFIG.cameraOffsets[cameraMode.current];
    // Apply bike camera pitch from mouse drag
    const pitchedOy = oy + (bikeCameraPitch.current ?? 0) * 2.5;
    const camOff = new THREE.Vector3(ox, pitchedOy, oz).applyAxisAngle(upAxis, bikeYaw.current + (bikeCameraYaw.current ?? 0));
    const lookAtTarget = bikePos.current.clone()
      .add(forward.clone().multiplyScalar(2))
      .add(new THREE.Vector3(0, 1.05 - (bikeCameraPitch.current ?? 0) * 3, 0));
    camera.position.lerp(bikePos.current.clone().add(camOff), dt * 6.5);
    camera.lookAt(lookAtTarget);

    window.dispatchEvent(new CustomEvent('vr-bike-state', {
      detail: {
        position: [bikePos.current.x, bikePos.current.y, bikePos.current.z],
        rotation: bikeYaw.current,
        speed: speed.current,
        mounted: isMounted,
        cameraMode: cameraMode.current,
      },
    }));
  });

  return (
    <group>
      <group
        ref={bikeGroupRef}
        position={[bikePos.current.x, bikePos.current.y, bikePos.current.z]}
        rotation={[0, bikeYaw.current, lean.current]}
        scale={[BIKE_WORLD_SCALE, BIKE_WORLD_SCALE, BIKE_WORLD_SCALE]}
      >
        {USE_UPLOADED_BIKE_MODEL ? (
          <Suspense fallback={<SportBikeModel steerRef={steerAngle} spinRef={wheelSpin} />}>
            <UploadedBikeModel>
              {isNight && (
                <group>
                  <mesh position={[0, 0.78, 1.62]}>
                    <sphereGeometry args={[0.055, 10, 10]} />
                    <meshBasicMaterial color="hsl(48 100% 90%)" transparent opacity={0.95} />
                  </mesh>
                  <mesh position={[0, 0.78, 1.76]} scale={[1.8, 1.8, 0.8]}>
                    <sphereGeometry args={[0.09, 10, 10]} />
                    <meshBasicMaterial color="hsl(48 100% 90%)" transparent opacity={0.22} depthWrite={false} />
                  </mesh>
                  <pointLight position={[0, 0.78, 1.64]} intensity={2.8} distance={20} decay={2} color="hsl(48 100% 90%)" />
                  <mesh position={[0, 0.72, -0.78]}>
                    <sphereGeometry args={[0.04, 8, 8]} />
                    <meshBasicMaterial color="hsl(0 100% 62%)" transparent opacity={0.8} />
                  </mesh>
                  <pointLight position={[0, 0.72, -0.78]} intensity={0.65} distance={6} decay={2} color="hsl(0 100% 62%)" />
                </group>
              )}
            </UploadedBikeModel>
          </Suspense>
        ) : (
          <SportBikeModel steerRef={steerAngle} spinRef={wheelSpin} />
        )}
        {isNight && !USE_UPLOADED_BIKE_MODEL && (
          <>
            <mesh position={[0, 0.78, 1.62]}>
              <sphereGeometry args={[0.055, 10, 10]} />
              <meshBasicMaterial color="hsl(48 100% 90%)" transparent opacity={0.95} />
            </mesh>
            <pointLight position={[0, 0.78, 1.64]} intensity={2.8} distance={20} decay={2} color="hsl(48 100% 90%)" />
            <mesh position={[0, 0.72, -0.78]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshBasicMaterial color="hsl(0 100% 62%)" transparent opacity={0.8} />
            </mesh>
            <pointLight position={[0, 0.72, -0.78]} intensity={0.65} distance={6} decay={2} color="hsl(0 100% 62%)" />
          </>
        )}
        {isMounted && <BikeRider lean={lean.current} avatarVariant={avatarVariant} displayName={displayName} />}
      </group>

      {showPrompt && !isMounted && (
        <Html fullscreen style={{ pointerEvents: 'none' }}>
          <div className="absolute top-24 right-4 rounded-md border border-border/70 bg-background/75 px-2 py-1 text-center whitespace-nowrap backdrop-blur-sm">
            <span className="text-[10px] font-mono text-primary">[E] Mount Bike</span>
          </div>
        </Html>
      )}

      {isMounted && (
        <Html fullscreen style={{ pointerEvents: 'none' }}>
          <div className="absolute bottom-24 right-4 rounded-md border border-border/70 bg-background/75 px-2 py-1 text-center whitespace-nowrap backdrop-blur-sm">
            <span className="text-[10px] font-mono text-foreground">
              {Math.round(Math.abs(speed.current) * 3.6)} KM/H • [V] {cameraHudMode} • [Space] HB
            </span>
          </div>
        </Html>
      )}
    </group>
  );
};

// ─── On-screen touch controls ────────────────────────────────────────────────
export const BikeOnScreenControls: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_BIKE_VOLUME);

  useEffect(() => {
    const onMount = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      setMounted(Boolean(detail.mounted));
      if (typeof detail.volume === 'number') {
        setVolume(THREE.MathUtils.clamp(detail.volume, 0, 1));
      }
    };
    window.addEventListener('vr-bike-mount', onMount as EventListener);
    return () => window.removeEventListener('vr-bike-mount', onMount as EventListener);
  }, []);

  const dispatch = useCallback((action: string, value: boolean | number) => {
    window.dispatchEvent(new CustomEvent('vr-bike-control', { detail: { action, value } }));
  }, []);

  const setAndDispatchVolume = useCallback((next: number) => {
    const clamped = THREE.MathUtils.clamp(next, 0, 1);
    setVolume(clamped);
    dispatch('volume', clamped);
  }, [dispatch]);

  if (!mounted) return null;

  return (
    <div className="fixed top-24 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none" data-exclude-phantom-tap>
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          className="h-10 px-3 rounded-md bg-primary/75 backdrop-blur border border-primary/60 text-primary-foreground text-[11px] font-mono active:bg-primary/90"
          onClick={() => dispatch('start_engine', true)}
        >
          START
        </button>
        <button
          className="h-10 px-3 rounded-md bg-destructive/75 backdrop-blur border border-destructive/60 text-destructive-foreground text-[11px] font-mono active:bg-destructive/90"
          onClick={() => dispatch('dismount', true)}
        >
          EXIT
        </button>
      </div>

      <div className="flex gap-2 pointer-events-auto">
        <button className="w-12 h-12 rounded-full bg-background/80 backdrop-blur border border-border/60 text-foreground text-xl flex items-center justify-center active:bg-muted/80"
          onTouchStart={() => dispatch('left', true)} onTouchEnd={() => dispatch('left', false)}
          onMouseDown={() => dispatch('left', true)} onMouseUp={() => dispatch('left', false)}>◄</button>
        <button className="w-12 h-12 rounded-full bg-primary/75 backdrop-blur border border-primary/60 text-primary-foreground text-lg flex items-center justify-center active:bg-primary/90"
          onTouchStart={() => dispatch('throttle', true)} onTouchEnd={() => dispatch('throttle', false)}
          onMouseDown={() => dispatch('throttle', true)} onMouseUp={() => dispatch('throttle', false)}>▲</button>
        <button className="w-12 h-12 rounded-full bg-destructive/70 backdrop-blur border border-destructive/55 text-destructive-foreground text-lg flex items-center justify-center active:bg-destructive/85"
          onTouchStart={() => dispatch('brake', true)} onTouchEnd={() => dispatch('brake', false)}
          onMouseDown={() => dispatch('brake', true)} onMouseUp={() => dispatch('brake', false)}>■</button>
        <button className="w-12 h-12 rounded-full bg-background/80 backdrop-blur border border-border/60 text-foreground text-xl flex items-center justify-center active:bg-muted/80"
          onTouchStart={() => dispatch('right', true)} onTouchEnd={() => dispatch('right', false)}
          onMouseDown={() => dispatch('right', true)} onMouseUp={() => dispatch('right', false)}>►</button>
      </div>

      <div className="pointer-events-auto bg-background/80 backdrop-blur-md border border-border/70 rounded-lg px-2 py-1 flex items-center gap-2 w-44">
        <button
          className="w-6 h-6 rounded bg-muted text-muted-foreground text-xs"
          onClick={() => setAndDispatchVolume(volume - 0.08)}
          aria-label="Lower bike volume"
        >
          -
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setAndDispatchVolume(Number(e.target.value))}
          className="w-full"
        />
        <button
          className="w-6 h-6 rounded bg-muted text-muted-foreground text-xs"
          onClick={() => setAndDispatchVolume(volume + 0.08)}
          aria-label="Increase bike volume"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default MotorcycleController;

// Only preload when using the uploaded model to avoid 57MB unnecessary download
if (USE_UPLOADED_BIKE_MODEL) {
  useGLTF.preload(uploadedBikeModelUrl);
}
