import { Disc3, Pause, Play, SkipBack, SkipForward, Square } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useMusicEngine } from '@/hooks/useMusicEngine';
import { musicEngine } from '@/services/MusicEngine';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function GlobalMusicToggle() {
  const state = useMusicEngine();
  const navigate = useNavigate();
  if (!state.track) return null;

  const active = state.status === 'playing' || state.status === 'buffering';
  return (
    <TooltipProvider><div className="music-global-glass fixed left-[max(.5rem,env(safe-area-inset-left))] top-[max(.5rem,env(safe-area-inset-top))] z-[54] flex max-w-[calc(100vw-1rem)] items-center gap-0.5 rounded-full border border-border/70 p-1" data-testid="global-music-control">
      <Tooltip><TooltipTrigger asChild><Button className="music-mini-button rounded-full" variant="ghost" size="icon" onClick={() => navigate('/music')} aria-label={`Open music: ${state.track.title} by ${state.track.artist}`}>
        <Disc3 className={active ? 'animate-spin motion-reduce:animate-none' : ''} />
      </Button></TooltipTrigger><TooltipContent>Open music</TooltipContent></Tooltip>
      <Tooltip><TooltipTrigger asChild><Button className="music-mini-button rounded-full" variant="ghost" size="icon" onClick={() => void musicEngine.previous()} aria-label="Previous track"><SkipBack /></Button></TooltipTrigger><TooltipContent>Previous</TooltipContent></Tooltip>
      <Tooltip><TooltipTrigger asChild><Button className="music-mini-button rounded-full" variant="ghost" size="icon" onClick={() => { musicEngine.unlock(); musicEngine.toggle(); }} aria-label={active ? 'Pause music' : 'Play music'}>
        {active ? <Pause /> : <Play />}
      </Button></TooltipTrigger><TooltipContent>{active ? 'Pause music' : 'Play music'}</TooltipContent></Tooltip>
      <Tooltip><TooltipTrigger asChild><Button className="music-mini-button rounded-full" variant="ghost" size="icon" onClick={() => musicEngine.stop()} aria-label="Stop music"><Square /></Button></TooltipTrigger><TooltipContent>Stop</TooltipContent></Tooltip>
      <Tooltip><TooltipTrigger asChild><Button className="music-mini-button rounded-full" variant="ghost" size="icon" onClick={() => void musicEngine.next()} aria-label="Next track"><SkipForward /></Button></TooltipTrigger><TooltipContent>Next</TooltipContent></Tooltip>
    </div></TooltipProvider>
  );
}