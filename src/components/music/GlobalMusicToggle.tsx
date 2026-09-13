import { useCallback, useEffect, useRef, useState } from 'react';
import { Disc3, Pause, Play, SkipBack, SkipForward, Square } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useMusicEngine } from '@/hooks/useMusicEngine';
import { musicEngine } from '@/services/MusicEngine';

interface PlayerPosition {
  x: number;
  y: number;
}

const POSITION_KEY = 'mmora.music.miniPlayerPosition';
const EDGE_GAP = 8;
// Home wordmark begins at 1rem and ends near 6rem; start immediately after its final “a”.
const DEFAULT_POSITION: PlayerPosition = { x: 104, y: 8 };

export default function GlobalMusicToggle() {
  const state = useMusicEngine();
  const navigate = useNavigate();
  const playerRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{
    id: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const positionRef = useRef<PlayerPosition>(DEFAULT_POSITION);
  const suppressClickRef = useRef(false);
  const [position, setPosition] = useState<PlayerPosition>(() => {
    try {
      const saved = localStorage.getItem(POSITION_KEY);
      if (saved) return JSON.parse(saved) as PlayerPosition;
    } catch {
      // Storage may be unavailable in private browsing.
    }
    return DEFAULT_POSITION;
  });

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const clamp = useCallback((next: PlayerPosition): PlayerPosition => {
    const width = playerRef.current?.offsetWidth ?? 208;
    const height = playerRef.current?.offsetHeight ?? 44;
    return {
      x: Math.max(EDGE_GAP, Math.min(next.x, window.innerWidth - width - EDGE_GAP)),
      y: Math.max(EDGE_GAP, Math.min(next.y, window.innerHeight - height - EDGE_GAP)),
    };
  }, []);

  useEffect(() => {
    const keepOnScreen = () => setPosition((current) => clamp(current));
    keepOnScreen();
    window.addEventListener('resize', keepOnScreen);
    window.addEventListener('orientationchange', keepOnScreen);
    return () => {
      window.removeEventListener('resize', keepOnScreen);
      window.removeEventListener('orientationchange', keepOnScreen);
    };
  }, [clamp]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const pointer = pointerRef.current;
      if (!pointer || pointer.id !== event.pointerId) return;
      const dx = event.clientX - pointer.startX;
      const dy = event.clientY - pointer.startY;
      if (Math.hypot(dx, dy) > 6) pointer.moved = true;
      if (!pointer.moved) return;
      event.preventDefault();
      setPosition(clamp({ x: pointer.originX + dx, y: pointer.originY + dy }));
    };
    const finishDrag = (event: PointerEvent) => {
      const pointer = pointerRef.current;
      if (!pointer || pointer.id !== event.pointerId) return;
      pointerRef.current = null;
      suppressClickRef.current = pointer.moved;
      if (!pointer.moved) return;
      const finalPosition = clamp({
        x: pointer.originX + event.clientX - pointer.startX,
        y: pointer.originY + event.clientY - pointer.startY,
      });
      setPosition(finalPosition);
      positionRef.current = finalPosition;
      try { localStorage.setItem(POSITION_KEY, JSON.stringify(finalPosition)); } catch { /* Storage unavailable. */ }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
    };
  }, [clamp]);

  if (!state.track) return null;

  const active = state.status === 'playing' || state.status === 'buffering';
  return (
    <div
      ref={playerRef}
      className="music-global-glass fixed z-[10050] flex max-w-[calc(100vw-1rem)] touch-none select-none items-center gap-0.5"
      style={{ left: position.x, top: position.y }}
      data-testid="global-music-control"
      data-draggable="true"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const current = positionRef.current;
        pointerRef.current = {
          id: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          originX: current.x,
          originY: current.y,
          moved: false,
        };
      }}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClickRef.current = false;
      }}
      aria-label="Draggable music controls"
    >
      <Button className="music-mini-button" variant="ghost" size="icon" onClick={() => navigate('/music')} aria-label={`Open music: ${state.track.title} by ${state.track.artist}`}>
        <Disc3 className={active ? 'animate-spin motion-reduce:animate-none' : ''} />
      </Button>
      <Button className="music-mini-button" variant="ghost" size="icon" onClick={() => void musicEngine.previous()} aria-label="Previous track"><SkipBack /></Button>
      <Button className="music-mini-button" variant="ghost" size="icon" onClick={() => { musicEngine.unlock(); musicEngine.toggle(); }} aria-label={active ? 'Pause music' : 'Play music'}>
        {active ? <Pause /> : <Play />}
      </Button>
      <Button className="music-mini-button" variant="ghost" size="icon" onClick={() => musicEngine.stop()} aria-label="Stop music"><Square /></Button>
      <Button className="music-mini-button" variant="ghost" size="icon" onClick={() => void musicEngine.next()} aria-label="Next track"><SkipForward /></Button>
    </div>
  );
}