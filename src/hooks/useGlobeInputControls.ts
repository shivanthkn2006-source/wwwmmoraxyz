/**
 * USE GLOBE INPUT CONTROLS
 * 
 * Provides 360° globe rotation support via:
 * - Mouse drag
 * - Touch gestures (mobile/tablet)
 * - Trackpad
 * - Keyboard arrows & WASD
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface GlobeInputControlsOptions {
  enabled?: boolean;
  rotationSpeed?: number;
  keyboardSpeed?: number;
  dampingFactor?: number;
  minDistance?: number;
  maxDistance?: number;
}

interface InputState {
  isDragging: boolean;
  lastX: number;
  lastY: number;
  deltaRotation: { x: number; y: number };
  touchDistance: number;
  momentum: { x: number; y: number };
}

export const useGlobeInputControls = (options: GlobeInputControlsOptions = {}) => {
  const {
    enabled = true,
    rotationSpeed = 0.005,
    keyboardSpeed = 0.05,
    dampingFactor = 0.95,
    minDistance = 1.5,
    maxDistance = 10,
  } = options;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const inputStateRef = useRef<InputState>({
    isDragging: false,
    lastX: 0,
    lastY: 0,
    deltaRotation: { x: 0, y: 0 },
    touchDistance: 0,
    momentum: { x: 0, y: 0 },
  });
  const keysPressed = useRef<Set<string>>(new Set());

  // Dispatch rotation event
  const dispatchRotation = useCallback((deltaX: number, deltaY: number, deltaZoom?: number) => {
    window.dispatchEvent(new CustomEvent('selfie-city-globe-rotate', {
      detail: { deltaX, deltaY, deltaZoom, source: 'input-controls' }
    }));
  }, []);

  // Dispatch camera zoom event
  const dispatchZoom = useCallback((delta: number) => {
    window.dispatchEvent(new CustomEvent('selfie-city-camera-control', {
      detail: { type: delta > 0 ? 'zoom_out' : 'zoom_in' }
    }));
  }, []);

  // Mouse handlers
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!enabled) return;
    e.preventDefault();
    inputStateRef.current.isDragging = true;
    inputStateRef.current.lastX = e.clientX;
    inputStateRef.current.lastY = e.clientY;
    inputStateRef.current.momentum = { x: 0, y: 0 };
    setIsUserInteracting(true);
  }, [enabled]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!enabled || !inputStateRef.current.isDragging) return;
    
    const deltaX = (e.clientX - inputStateRef.current.lastX) * rotationSpeed;
    const deltaY = (e.clientY - inputStateRef.current.lastY) * rotationSpeed;
    
    inputStateRef.current.momentum = { x: deltaX, y: deltaY };
    inputStateRef.current.lastX = e.clientX;
    inputStateRef.current.lastY = e.clientY;
    
    dispatchRotation(deltaX, deltaY);
  }, [enabled, rotationSpeed, dispatchRotation]);

  const handleMouseUp = useCallback(() => {
    inputStateRef.current.isDragging = false;
    setIsUserInteracting(false);
  }, []);

  // Touch handlers for mobile/tablet
  const getTouchDistance = (touches: TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    e.preventDefault();
    
    if (e.touches.length === 1) {
      inputStateRef.current.isDragging = true;
      inputStateRef.current.lastX = e.touches[0].clientX;
      inputStateRef.current.lastY = e.touches[0].clientY;
      inputStateRef.current.momentum = { x: 0, y: 0 };
    } else if (e.touches.length === 2) {
      inputStateRef.current.touchDistance = getTouchDistance(e.touches);
    }
    setIsUserInteracting(true);
  }, [enabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    e.preventDefault();
    
    if (e.touches.length === 1 && inputStateRef.current.isDragging) {
      const deltaX = (e.touches[0].clientX - inputStateRef.current.lastX) * rotationSpeed;
      const deltaY = (e.touches[0].clientY - inputStateRef.current.lastY) * rotationSpeed;
      
      inputStateRef.current.momentum = { x: deltaX, y: deltaY };
      inputStateRef.current.lastX = e.touches[0].clientX;
      inputStateRef.current.lastY = e.touches[0].clientY;
      
      dispatchRotation(deltaX, deltaY);
    } else if (e.touches.length === 2) {
      // Pinch zoom
      const newDistance = getTouchDistance(e.touches);
      const delta = inputStateRef.current.touchDistance - newDistance;
      inputStateRef.current.touchDistance = newDistance;
      
      if (Math.abs(delta) > 5) {
        dispatchZoom(delta);
      }
    }
  }, [enabled, rotationSpeed, dispatchRotation, dispatchZoom]);

  const handleTouchEnd = useCallback(() => {
    inputStateRef.current.isDragging = false;
    setIsUserInteracting(false);
  }, []);

  // Wheel/trackpad handler
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!enabled) return;
    e.preventDefault();
    
    // Check for trackpad gestures (usually smaller deltas with ctrlKey for pinch)
    if (e.ctrlKey) {
      // Pinch zoom on trackpad
      dispatchZoom(e.deltaY * 0.01);
    } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      // Horizontal swipe - rotate horizontally
      dispatchRotation(e.deltaX * rotationSpeed * 0.5, 0);
    } else {
      // Vertical scroll - zoom
      dispatchZoom(e.deltaY * 0.001);
    }
  }, [enabled, rotationSpeed, dispatchRotation, dispatchZoom]);

  // Keyboard handlers - listen globally for better capture
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    // Ignore keyboard events when typing in inputs
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }
    
    const key = e.key.toLowerCase();
    const relevantKeys = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', '+', '-', '=', 'z'];
    
    if (relevantKeys.includes(key)) {
      e.preventDefault();
      keysPressed.current.add(key);
      setIsUserInteracting(true);
    }
  }, [enabled]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysPressed.current.delete(e.key.toLowerCase());
    if (keysPressed.current.size === 0) {
      setIsUserInteracting(false);
    }
  }, []);

  // Animation frame for keyboard input
  useEffect(() => {
    if (!enabled) return;
    
    let animationFrameId: number;
    
    const processKeyboardInput = () => {
      let deltaX = 0;
      let deltaY = 0;
      
      keysPressed.current.forEach(key => {
        switch (key) {
          case 'arrowleft':
          case 'a':
            deltaX -= keyboardSpeed;
            break;
          case 'arrowright':
          case 'd':
            deltaX += keyboardSpeed;
            break;
          case 'arrowup':
          case 'w':
            deltaY -= keyboardSpeed;
            break;
          case 'arrowdown':
          case 's':
          case 'z': // Added 'z' as alternative for down/south
            deltaY += keyboardSpeed;
            break;
          case '+':
          case '=':
            dispatchZoom(-0.05); // Zoom in
            break;
          case '-':
            dispatchZoom(0.05);  // Zoom out
            break;
        }
      });
      
      if (deltaX !== 0 || deltaY !== 0) {
        dispatchRotation(deltaX, deltaY);
      }
      
      // Apply momentum when not dragging
      if (!inputStateRef.current.isDragging) {
        const { momentum } = inputStateRef.current;
        if (Math.abs(momentum.x) > 0.0001 || Math.abs(momentum.y) > 0.0001) {
          momentum.x *= dampingFactor;
          momentum.y *= dampingFactor;
        }
      }
      
      animationFrameId = requestAnimationFrame(processKeyboardInput);
    };
    
    animationFrameId = requestAnimationFrame(processKeyboardInput);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [enabled, keyboardSpeed, dampingFactor, dispatchRotation, dispatchZoom]);

  // Setup event listeners
  const setupListeners = useCallback((container: HTMLDivElement | null) => {
    if (!container) return () => {};
    
    containerRef.current = container;
    
    // Focus container on click to enable keyboard controls
    const handleFocus = () => {
      container.focus();
    };
    
    // Mouse events
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('click', handleFocus);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    // Touch events
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    
    // Wheel/trackpad
    container.addEventListener('wheel', handleWheel, { passive: false });
    
    // Keyboard - attach to window for global capture
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    console.log('[GlobeInputControls] Event listeners attached');
    
    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('click', handleFocus);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleTouchStart, handleTouchMove, handleTouchEnd, handleWheel, handleKeyDown, handleKeyUp]);

  return {
    setupListeners,
    isUserInteracting,
    containerRef,
  };
};

export default useGlobeInputControls;
