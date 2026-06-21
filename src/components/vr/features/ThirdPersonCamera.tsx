// ═══════════════════════════════════════════════════════════════════════════════
// THIRD-PERSON CAMERA SYSTEM
// Follows the humanoid avatar with multiple camera angles:
// 1. Back view (default) - behind & above
// 2. Over-shoulder - close behind, offset right
// 3. First-person - from avatar's eyes
// 4. Free orbit - user can rotate around avatar
// Mouse drag Y = vertical pitch in all modes. Separate wiring.
// ═══════════════════════════════════════════════════════════════════════════════

import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type CameraMode = 'back' | 'shoulder' | 'firstperson' | 'orbit';

const CAMERA_PRESETS: Record<CameraMode, { offset: THREE.Vector3; lookOffset: THREE.Vector3; fov: number }> = {
  back: {
    offset: new THREE.Vector3(0, 1.2, 3.2),
    lookOffset: new THREE.Vector3(0, 0.45, 0),
    fov: 65,
  },
  shoulder: {
    offset: new THREE.Vector3(0.4, 0.9, 1.8),
    lookOffset: new THREE.Vector3(0, 0.5, -2),
    fov: 60,
  },
  firstperson: {
    offset: new THREE.Vector3(0, 0.55, 0),
    lookOffset: new THREE.Vector3(0, 0.5, -5),
    fov: 75,
  },
  orbit: {
    offset: new THREE.Vector3(0, 1.8, 4),
    lookOffset: new THREE.Vector3(0, 0.4, 0),
    fov: 65,
  },
};

interface ThirdPersonCameraProps {
  avatarPosition: THREE.Vector3;
  avatarRotation: number;
  mode: CameraMode;
  onModeChange: (mode: CameraMode) => void;
}

export const ThirdPersonCamera: React.FC<ThirdPersonCameraProps> = ({
  avatarPosition,
  avatarRotation,
  mode,
  onModeChange,
}) => {
  const { camera } = useThree();
  const currentOffset = useRef(new THREE.Vector3());
  const currentLookAt = useRef(new THREE.Vector3());
  const orbitAngle = useRef(0);
  const orbitPitch = useRef(0.3);
  // Vertical pitch for back/shoulder/firstperson modes (mouse Y drag)
  const cameraPitch = useRef(0);
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  // Cycle camera mode with V key
  useEffect(() => {
    const modes: CameraMode[] = ['back', 'shoulder', 'firstperson', 'orbit'];
    const handleKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.code === 'KeyV' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const idx = modes.indexOf(mode);
        onModeChange(modes[(idx + 1) % modes.length]);
      }
    };
    window.addEventListener('keydown', handleKey, { capture: true });
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [mode, onModeChange]);

  // Mouse/touch drag for vertical pitch AND horizontal yaw in ALL modes
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (mode === 'orbit') {
        if (e.button === 2 || e.button === 1) {
          isDragging.current = true;
          lastPointer.current = { x: e.clientX, y: e.clientY };
        }
      } else {
        // Left click drag for pitch + yaw
        if (e.button === 0) {
          isDragging.current = true;
          lastPointer.current = { x: e.clientX, y: e.clientY };
        }
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };

      if (mode === 'orbit') {
        orbitAngle.current -= dx * 0.005;
        orbitPitch.current = THREE.MathUtils.clamp(orbitPitch.current + dy * 0.005, -0.3, 1.2);
      } else {
        // Vertical pitch: clamp between looking down (-0.6) and looking up (0.8)
        cameraPitch.current = THREE.MathUtils.clamp(cameraPitch.current + dy * 0.003, -0.6, 0.8);
        // Horizontal yaw: dispatch to avatar controller for rotation
        if (Math.abs(dx) > 0.5) {
          window.dispatchEvent(new CustomEvent('vr-camera-look', { detail: { dx: dx * 0.003 } }));
        }
      }
    };
    const onUp = () => { isDragging.current = false; };

    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [mode]);

  // Orbit mode support for 360/Look buttons
  useEffect(() => {
    const onCameraAction = (event: Event) => {
      const action = (event as CustomEvent).detail?.action as string | undefined;
      if (action === 'look_up') {
        if (mode === 'orbit') {
          orbitPitch.current = THREE.MathUtils.clamp(orbitPitch.current - 0.12, -0.3, 1.2);
        } else {
          cameraPitch.current = THREE.MathUtils.clamp(cameraPitch.current - 0.12, -0.6, 0.8);
        }
        return;
      }
      if (action === 'look_down') {
        if (mode === 'orbit') {
          orbitPitch.current = THREE.MathUtils.clamp(orbitPitch.current + 0.12, -0.3, 1.2);
        } else {
          cameraPitch.current = THREE.MathUtils.clamp(cameraPitch.current + 0.12, -0.6, 0.8);
        }
        return;
      }
      if (mode !== 'orbit') return;
      if (action === 'look_left') orbitAngle.current += 0.35;
      if (action === 'look_right') orbitAngle.current -= 0.35;
      if (action === 'look_around') orbitAngle.current += Math.PI;
    };

    const onRotate = (event: Event) => {
      if (mode !== 'orbit') return;
      const detail = (event as CustomEvent).detail || {};
      const degrees = typeof detail.degrees === 'number' ? detail.degrees : 45;
      const radians = (degrees * Math.PI) / 180;

      if (detail.direction === 'left') orbitAngle.current += radians;
      if (detail.direction === 'right') orbitAngle.current -= radians;
      if (detail.direction === 'around') orbitAngle.current += Math.PI;
      if (detail.direction === 'full') orbitAngle.current += Math.PI * 2;
    };

    window.addEventListener('vr-camera', onCameraAction as EventListener);
    window.addEventListener('vr-rotate-360', onRotate as EventListener);
    return () => {
      window.removeEventListener('vr-camera', onCameraAction as EventListener);
      window.removeEventListener('vr-rotate-360', onRotate as EventListener);
    };
  }, [mode]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const preset = CAMERA_PRESETS[mode];
    const lerpFactor = mode === 'firstperson' ? 12 : 5;

    let targetOffset: THREE.Vector3;
    let targetLookAt: THREE.Vector3;

    if (mode === 'orbit') {
      const dist = 7;
      const h = 2 + Math.sin(orbitPitch.current) * 4;
      const angle = orbitAngle.current;
      targetOffset = new THREE.Vector3(
        Math.sin(angle) * dist,
        h,
        Math.cos(angle) * dist
      );
      targetLookAt = new THREE.Vector3(0, 1.2, 0);
    } else {
      // Apply vertical pitch to camera offset
      const pitchedOffset = preset.offset.clone();
      // Raise/lower camera based on pitch
      pitchedOffset.y += cameraPitch.current * 2.5;

      // Rotate offset by avatar's Y rotation
      targetOffset = pitchedOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), avatarRotation);

      // Adjust look-at target based on pitch (look up/down)
      const pitchedLook = preset.lookOffset.clone();
      pitchedLook.y -= cameraPitch.current * 3;
      targetLookAt = pitchedLook.applyAxisAngle(new THREE.Vector3(0, 1, 0), avatarRotation);
    }

    // World-space targets
    const worldTarget = avatarPosition.clone().add(targetOffset);
    const worldLookAt = avatarPosition.clone().add(targetLookAt);

    if (mode !== 'firstperson') {
      const targetVector = worldTarget.clone().sub(avatarPosition);
      const minDistance = mode === 'orbit' ? 4.8 : 3.6;
      if (targetVector.length() < minDistance) {
        targetVector.setLength(minDistance);
        worldTarget.copy(avatarPosition).add(targetVector);
      }
    }

    // Smooth interpolation
    currentOffset.current.lerp(worldTarget, dt * lerpFactor);
    currentLookAt.current.lerp(worldLookAt, dt * lerpFactor);

    camera.position.copy(currentOffset.current);
    camera.lookAt(currentLookAt.current);
  });

  return null;
};

export default ThirdPersonCamera;
