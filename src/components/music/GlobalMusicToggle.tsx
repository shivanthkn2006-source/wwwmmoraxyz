import { useCallback, useEffect, useRef, useState } from 'react';
import { Disc3, Pause, Play, SkipBack, SkipForward, Square } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useMusicEngine } from '@/hooks/useMusicEngine';
import { musicEngine } from '@/services/MusicEngine';

interface PlayerPosition {
  x: number;
  y: number;
}

const POSITION_KEY = 'mmora.music.miniPlayerPosition';
const EDGE_GAP = 8;
/** The floating home search icon the collapsed disc parks next to by default. */
const SEARCH_CONTROL_SELECTOR = '[data-home-control="mmora.home.search-position.v3"]';
const SEARCH_GAP = 6;
// Fallback if the search control is not mounted (non-home routes): just below it.
const DEFAULT_POSITION: PlayerPosition = { x: 52, y: 80 };

export default function GlobalMusicToggle() {
  const state = useMusicEngine();
  const navigate = useNavigate();
  const location = useLocation();
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
  // Collapsed by default: only the disc symbol shows, so it never crowds the
  // headphones shortcut. Tapping the disc reveals the transport controls.
  const [expanded, setExpanded] = useState(false);
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
    if (location.pathname !== '/music') return;
    const animationFrame = window.requestAnimationFrame(() => {
      const wordmark = document.querySelector<HTMLElement>('[data-music-wordmark]');
      if (!wordmark) return;
      const bounds = wordmark.getBoundingClientRect();
      const height = playerRef.current?.offsetHeight ?? 36;
      const anchored = clamp({
        x: bounds.right + 6,
        y: bounds.top + (bounds.height - height) / 2,
      });
      positionRef.current = anchored;
      setPosition(anchored);
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [clamp, location.pathname, state.track?.id]);

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

  if (!state.track || location.pathname === '/music') return null;

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
      <Button className="music-mini-button !border-0 !bg-transparent !shadow-none !outline-none !ring-0 !ring-offset-0" variant="ghost" size="icon" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? 'Hide music controls' : `Show music controls: ${state.track.title} by ${state.track.artist}`} aria-expanded={expanded}>
        <Disc3 className={active ? 'animate-spin motion-reduce:animate-none' : ''} />
      </Button>
      {expanded && (
        <>
          <Button className="music-mini-button !border-0 !bg-transparent !shadow-none !outline-none !ring-0 !ring-offset-0" variant="ghost" size="icon" onClick={() => void musicEngine.previous()} aria-label="Previous track"><SkipBack /></Button>
          <Button className="music-mini-button !border-0 !bg-transparent !shadow-none !outline-none !ring-0 !ring-offset-0" variant="ghost" size="icon" onClick={() => { musicEngine.unlock(); musicEngine.toggle(); }} aria-label={active ? 'Pause music' : 'Play music'}>
            {active ? <Pause /> : <Play />}
          </Button>
          <Button className="music-mini-button !border-0 !bg-transparent !shadow-none !outline-none !ring-0 !ring-offset-0" variant="ghost" size="icon" onClick={() => musicEngine.stop()} aria-label="Stop music"><Square /></Button>
          <Button className="music-mini-button !border-0 !bg-transparent !shadow-none !outline-none !ring-0 !ring-offset-0" variant="ghost" size="icon" onClick={() => void musicEngine.next()} aria-label="Next track"><SkipForward /></Button>
          <button type="button" className="music-mini-position" onClick={() => navigate('/music')} aria-label={`Open music page, queue position ${state.index + 1} of ${state.queue.length}`}>{state.index + 1}/{state.queue.length}</button>
        </>
      )}

    </div>
  );
}