/**
 * VR LOOK JOYSTICK - Right-side 360° camera look control
 * Dispatches vr-camera-look events for smooth rotation
 * Also includes dedicated turn-left/turn-right buttons
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface VRLookJoystickProps {
  onLook: (dx: number, dy: number) => void;
}

export const VRLookJoystick: React.FC<VRLookJoystickProps> = ({ onLook }) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [knobPosition, setKnobPosition] = useState({ x: 0, y: 0 });
  const centerRef = useRef({ x: 0, y: 0 });

  const handleStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const rect = joystickRef.current?.getBoundingClientRect();
    if (rect) {
      centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
  }, []);

  const handleMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const dx = clientX - centerRef.current.x;
    const dy = clientY - centerRef.current.y;
    const maxDist = 40;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
    const angle = Math.atan2(dy, dx);
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;
    setKnobPosition({ x, y });
    onLook(x / maxDist, y / maxDist);
  }, [isDragging, onLook]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    setKnobPosition({ x: 0, y: 0 });
    onLook(0, 0);
  }, [onLook]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('touchend', handleEnd);
      window.addEventListener('mouseup', handleEnd);
    }
    return () => {
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('mouseup', handleEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  return (
    <div
      ref={joystickRef}
      className="absolute bottom-24 right-6 w-24 h-24 rounded-full bg-black/40 backdrop-blur-sm border-2 border-cyan-500/30 touch-none z-50"
      onTouchStart={handleStart}
      onMouseDown={handleStart}
    >
      <div
        className="absolute w-12 h-12 rounded-full bg-cyan-400/30 border-2 border-cyan-400/50"
        style={{
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${knobPosition.x}px), calc(-50% + ${knobPosition.y}px))`,
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-cyan-400/50 text-[8px] pointer-events-none font-mono">
        LOOK
      </div>
      {/* Cardinal direction indicators */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[7px] text-white/30 pointer-events-none">▲</div>
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] text-white/30 pointer-events-none">▼</div>
      <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[7px] text-white/30 pointer-events-none">◄</div>
      <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[7px] text-white/30 pointer-events-none">►</div>
    </div>
  );
};

// Collapsible touch control bar
export const VRTouchControlBar: React.FC<{
  is5xZoom: boolean;
  onToggleZoom: () => void;
  onSpawnCar: () => void;
}> = ({ is5xZoom, onToggleZoom, onSpawnCar }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="absolute bottom-[180px] right-2 z-50 flex flex-col items-end gap-1 sm:right-4" data-exclude-phantom-tap>
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white text-sm flex items-center justify-center"
      >
        {expanded ? '✕' : '⚙'}
      </button>

      {expanded && (
        <div className="flex flex-col gap-1.5 animate-in slide-in-from-right-2 duration-200">
          <button
            onClick={onToggleZoom}
            className={cn(
              "rounded-full backdrop-blur-md border text-white text-[10px] px-2.5 py-1.5 min-w-[44px] min-h-[32px] sm:px-3 sm:py-2 sm:min-h-[36px]",
              is5xZoom ? "bg-cyan-600/70 border-cyan-400/50" : "bg-black/60 border-white/20"
            )}
          >
            {is5xZoom ? '1X' : '5X'} 🔭
          </button>
          <button
            onClick={onSpawnCar}
            className="rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[10px] px-2.5 py-1.5 min-w-[44px] min-h-[32px]"
          >
            + Car
          </button>
        </div>
      )}
    </div>
  );
};

export default VRLookJoystick;
