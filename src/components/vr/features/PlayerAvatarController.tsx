// ═══════════════════════════════════════════════════════════════════════════════
// PLAYER AVATAR CONTROLLER
// Bridges existing WASD/touch input → avatar position/rotation/animation state
// Replaces the old "Me" green blob with the humanoid character
// Exposes avatar state for ThirdPersonCamera and HumanoidAvatar
// Separate wiring - reads vr-move events and keyboard state independently
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RealisticHumanoidAvatar as HumanoidAvatar, type AvatarAnimState } from './RealisticHumanoidAvatar';
import { ThirdPersonCamera, type CameraMode } from './ThirdPersonCamera';
import { Html } from '@react-three/drei';
import { useVRAvatarProfile } from '@/hooks/useVRAvatarProfile';

interface PlayerAvatarControllerProps {
  displayName?: string;
  spawnPosition?: [number, number, number];
}

export const PlayerAvatarController: React.FC<PlayerAvatarControllerProps> = ({
  displayName = '@player',
  spawnPosition = [60, 0, 185],
}) => {
  const avatarPos = useRef(new THREE.Vector3(...spawnPosition));
  const avatarRotation = useRef(Math.PI / 2); // Face East
  const spinRemaining = useRef(0);
  const velocity = useRef(new THREE.Vector3());
  const verticalVel = useRef(0);
  const moveReleaseTimer = useRef<number | null>(null);
  const telemetryEmitAt = useRef(0);
  const [animState, setAnimState] = useState<AvatarAnimState>('idle');
  const [cameraMode, setCameraMode] = useState<CameraMode>('back');
  const [isSitting, setIsSitting] = useState(false);
  const [isBikeMounted, setIsBikeMounted] = useState(false);
  const isBikeMountedRef = useRef(false);
  const { avatarVariant } = useVRAvatarProfile();

  isBikeMountedRef.current = isBikeMounted;

  // Input state (independent from legacy PlayerController)
  const keys = useRef({
    forward: false, backward: false, left: false, right: false,
    run: false, jump: false,
  });
  const mouseYaw = useRef(0);

  useThree();

  // Only lock external camera when bike is mounted (don't block VR panel controls)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('vr-external-camera-lock', {
      detail: { locked: isBikeMounted, source: 'standalone-avatar' },
    }));

    return () => {
      window.dispatchEvent(new CustomEvent('vr-external-camera-lock', {
        detail: { locked: false, source: 'standalone-avatar-cleanup' },
      }));
    };
  }, [isBikeMounted]);

  // Keyboard input - capture phase to intercept before any other handler
  useEffect(() => {
    const setKey = (code: string, pressed: boolean) => {
      switch (code) {
        case 'KeyW': case 'ArrowUp': keys.current.forward = pressed; break;
        case 'KeyS': case 'ArrowDown': keys.current.backward = pressed; break;
        case 'KeyA': case 'ArrowLeft': keys.current.left = pressed; break;
        case 'KeyD': case 'ArrowRight': keys.current.right = pressed; break;
        case 'ShiftLeft': case 'ShiftRight': keys.current.run = pressed; break;
        case 'Space': keys.current.jump = pressed; break;
      }
    };

    const isTyping = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
    };

    const onDown = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      if (['KeyW', 'ArrowUp', 'KeyS', 'ArrowDown', 'KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight', 'Space'].includes(e.code)) {
        setIsSitting(false);
      }
      setKey(e.code, true);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      setKey(e.code, false);
    };

    const onBlur = () => {
      keys.current = { forward: false, backward: false, left: false, right: false, run: false, jump: false };
    };

    // VR move events (from touch bar / voice commands)
    const onVRMove = (e: Event) => {
      const { direction, hold = false } = (e as CustomEvent).detail || {};
      if (direction === 'forward') keys.current.forward = true;
      else if (direction === 'backward') keys.current.backward = true;
      else if (direction === 'left') keys.current.left = true;
      else if (direction === 'right') keys.current.right = true;
      else if (direction === 'stop') {
        keys.current = { forward: false, backward: false, left: false, right: false, run: false, jump: false };
      }

      if (!hold && direction !== 'stop') {
        if (moveReleaseTimer.current) window.clearTimeout(moveReleaseTimer.current);
        moveReleaseTimer.current = window.setTimeout(() => {
          if (direction === 'forward') keys.current.forward = false;
          if (direction === 'backward') keys.current.backward = false;
          if (direction === 'left') keys.current.left = false;
          if (direction === 'right') keys.current.right = false;
        }, 220);
      }
    };

    const onCameraLook = (e: Event) => {
      if (cameraMode === 'orbit') return;
      const { dx = 0 } = (e as CustomEvent).detail || {};
      if (typeof dx === 'number') {
        mouseYaw.current -= dx;
      }
    };

    const onCameraAction = (e: Event) => {
      const { action } = (e as CustomEvent).detail || {};
      if (!action || cameraMode === 'orbit') return;

      if (action === 'look_left') avatarRotation.current += 0.35;
      if (action === 'look_right') avatarRotation.current -= 0.35;
      if (action === 'look_around') avatarRotation.current += Math.PI;
    };

    const onRotate = (e: Event) => {
      const { direction, degrees = 45 } = (e as CustomEvent).detail || {};
      const radians = (degrees * Math.PI) / 180;
      if (direction === 'left') avatarRotation.current += radians;
      if (direction === 'right') avatarRotation.current -= radians;
      if (direction === 'around') avatarRotation.current += Math.PI;
      if (direction === 'full') spinRemaining.current += Math.PI * 2;
    };

    const onTeleport = (e: Event) => {
      const { position, lookAt } = (e as CustomEvent).detail || {};
      if (Array.isArray(position) && position.length === 3) {
        avatarPos.current.set(position[0], Math.max(0, position[1] ?? 0), position[2]);
      }
      if (Array.isArray(lookAt) && lookAt.length === 3) {
        const dx = lookAt[0] - avatarPos.current.x;
        const dz = lookAt[2] - avatarPos.current.z;
        if (Math.abs(dx) + Math.abs(dz) > 0.001) {
          avatarRotation.current = Math.atan2(dx, dz);
        }
      }
    };

    const onViewTransition = (e: Event) => {
      const mode = (e as CustomEvent).detail?.mode as string | undefined;
      if (mode === 'first_person') setCameraMode('firstperson');
      else if (mode === 'ground') setCameraMode('back');
      else if (mode === 'aerial' || mode === 'satellite') setCameraMode('orbit');
    };

    const onBikeMount = (e: Event) => {
      const mounted = Boolean((e as CustomEvent).detail?.mounted);
      setIsBikeMounted(mounted);
      setIsSitting(false);

      if (mounted) {
        setAnimState('idle');
      }
    };

    const onBikeState = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const p = detail.position;
      if (!Array.isArray(p) || p.length !== 3) return;
      if (!isBikeMountedRef.current && !detail.mounted) return;

      avatarPos.current.set(p[0], Math.max(0, p[1] ?? 0), p[2]);
      if (typeof detail.rotation === 'number') {
        avatarRotation.current = detail.rotation;
      }
    };

    // Sit command
    const onSit = () => {
      if (isBikeMountedRef.current) return;
      setIsSitting(prev => !prev);
    };

    window.addEventListener('keydown', onDown, { capture: true });
    window.addEventListener('keyup', onUp, { capture: true });
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onBlur);
    window.addEventListener('vr-move', onVRMove as EventListener);
    window.addEventListener('vr-camera', onCameraAction as EventListener);
    window.addEventListener('vr-camera-look', onCameraLook as EventListener);
    window.addEventListener('vr-rotate-360', onRotate as EventListener);
    window.addEventListener('vr-teleport', onTeleport as EventListener);
    window.addEventListener('vr-view-transition', onViewTransition as EventListener);
    window.addEventListener('vr-bike-mount', onBikeMount as EventListener);
    window.addEventListener('vr-bike-state', onBikeState as EventListener);
    window.addEventListener('vr-avatar-sit', onSit);

    return () => {
      window.removeEventListener('keydown', onDown, true);
      window.removeEventListener('keyup', onUp, true);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onBlur);
      window.removeEventListener('vr-move', onVRMove as EventListener);
      window.removeEventListener('vr-camera', onCameraAction as EventListener);
      window.removeEventListener('vr-camera-look', onCameraLook as EventListener);
      window.removeEventListener('vr-rotate-360', onRotate as EventListener);
      window.removeEventListener('vr-teleport', onTeleport as EventListener);
      window.removeEventListener('vr-view-transition', onViewTransition as EventListener);
      window.removeEventListener('vr-bike-mount', onBikeMount as EventListener);
      window.removeEventListener('vr-bike-state', onBikeState as EventListener);
      window.removeEventListener('vr-avatar-sit', onSit);
      if (moveReleaseTimer.current) {
        window.clearTimeout(moveReleaseTimer.current);
        moveReleaseTimer.current = null;
      }
    };
  }, [cameraMode]);

  // Physics + movement loop
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const k = keys.current;

    if (spinRemaining.current > 0) {
      const step = Math.min(spinRemaining.current, dt * 6.4);
      avatarRotation.current += step;
      spinRemaining.current -= step;
    }

    if (isBikeMounted) {
      velocity.current.set(0, 0, 0);
      if (animState !== 'idle') setAnimState('idle');

      const now = performance.now();
      if (now - telemetryEmitAt.current > 80) {
        telemetryEmitAt.current = now;
        window.dispatchEvent(new CustomEvent('vr-player-position', {
          detail: {
            position: [avatarPos.current.x, avatarPos.current.y, avatarPos.current.z],
            rotation: avatarRotation.current,
            animState: 'idle',
          },
        }));
      }
      return;
    }

    if (isSitting) {
      setAnimState('sitting');
      velocity.current.set(0, 0, 0);
      return;
    }

    avatarRotation.current += mouseYaw.current;
    mouseYaw.current = 0;

    const turnSpeed = k.run ? 3.2 : 2.4;
    if (k.left) avatarRotation.current += dt * turnSpeed;
    if (k.right) avatarRotation.current -= dt * turnSpeed;

    const dir = new THREE.Vector3();
    if (k.forward) dir.z -= 1;
    if (k.backward) dir.z += 1;

    const isMoving = dir.lengthSq() > 0;
    if (isMoving) {
      dir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), avatarRotation.current);
    }

    const speed = k.run ? 9 : 5;

    // Smooth velocity
    if (isMoving) {
      velocity.current.lerp(dir.multiplyScalar(speed), dt * 7);
    } else {
      velocity.current.lerp(new THREE.Vector3(0, 0, 0), dt * 10);
    }

    avatarPos.current.add(velocity.current.clone().multiplyScalar(dt));

    // Gravity + jump
    if (k.jump && avatarPos.current.y <= 0.05) {
      verticalVel.current = 5.8;
    }
    verticalVel.current -= 12 * dt;
    avatarPos.current.y += verticalVel.current * dt;
    if (avatarPos.current.y < 0) {
      avatarPos.current.y = 0;
      verticalVel.current = 0;
    }

    // Determine animation state
    const hSpeed = new THREE.Vector2(velocity.current.x, velocity.current.z).length();
    const nextAnimState: AvatarAnimState = avatarPos.current.y > 0.3
      ? 'jumping'
      : hSpeed > 6
        ? 'running'
        : hSpeed > 0.5
          ? 'walking'
          : 'idle';

    if (nextAnimState !== animState) {
      setAnimState(nextAnimState);
    }

    const now = performance.now();
    if (now - telemetryEmitAt.current > 80) {
      telemetryEmitAt.current = now;
      window.dispatchEvent(new CustomEvent('vr-player-position', {
        detail: {
          position: [avatarPos.current.x, avatarPos.current.y, avatarPos.current.z],
          x: avatarPos.current.x,
          y: avatarPos.current.y,
          z: avatarPos.current.z,
          rotation: avatarRotation.current,
          animState: nextAnimState,
        },
      }));
    }
  });

  const handleCameraMode = useCallback((m: CameraMode) => setCameraMode(m), []);

  return (
    <>
      {!isBikeMounted && cameraMode !== 'firstperson' && (
        <HumanoidAvatar
          position={avatarPos.current}
          rotation={avatarRotation.current}
          animState={animState}
          displayName={displayName}
          isLocalPlayer
          avatarVariant={avatarVariant}
        />
      )}
      {!isBikeMounted && (
        <ThirdPersonCamera
          avatarPosition={avatarPos.current}
          avatarRotation={avatarRotation.current}
          mode={cameraMode}
          onModeChange={handleCameraMode}
        />
      )}

      {/* Camera mode indicator HUD (fixed, non-blocking) */}
      {!isBikeMounted && (
        <Html fullscreen style={{ pointerEvents: 'none' }}>
          <div className="absolute top-24 right-4 rounded-md border border-border/70 bg-background/70 px-2 py-1 text-[10px] font-mono text-foreground/80 backdrop-blur-sm whitespace-nowrap">
            [V] Camera: {cameraMode} {isSitting ? '• Sitting' : ''}
          </div>
        </Html>
      )}
    </>
  );
};

export default PlayerAvatarController;
