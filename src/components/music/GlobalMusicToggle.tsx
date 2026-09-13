import { Disc3, Pause, Play } from 'lucide-react';
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
    <TooltipProvider><div className="fixed left-[max(1rem,env(safe-area-inset-left))] top-[max(18px,env(safe-area-inset-top))] z-[54] flex items-center gap-1 rounded-md border border-border bg-background/90 p-1 shadow-sm backdrop-blur" data-testid="global-music-control">
      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => navigate('/music')} aria-label="Open music">
        <Disc3 className={active ? 'animate-spin motion-reduce:animate-none' : ''} />
      </Button></TooltipTrigger><TooltipContent>Open music</TooltipContent></Tooltip>
      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => { musicEngine.unlock(); musicEngine.toggle(); }} aria-label={active ? 'Pause music' : 'Play music'}>
        {active ? <Pause /> : <Play />}
      </Button></TooltipTrigger><TooltipContent>{active ? 'Pause music' : 'Play music'}</TooltipContent></Tooltip>
    </div></TooltipProvider>
  );
}