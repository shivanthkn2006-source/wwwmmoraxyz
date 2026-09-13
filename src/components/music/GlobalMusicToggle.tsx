import { Disc3, Pause, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useMusicEngine } from '@/hooks/useMusicEngine';
import { musicEngine } from '@/services/MusicEngine';

export default function GlobalMusicToggle() {
  const state = useMusicEngine();
  const navigate = useNavigate();
  if (!state.track) return null;

  const active = state.status === 'playing' || state.status === 'buffering';
  return (
    <div className="fixed left-4 top-[18px] z-[54] flex items-center gap-1 rounded-md border border-border bg-background/90 p-1 shadow-sm backdrop-blur" data-testid="global-music-control">
      <Button variant="ghost" size="icon" onClick={() => navigate('/music')} aria-label="Open music">
        <Disc3 className={active ? 'animate-spin motion-reduce:animate-none' : ''} />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => musicEngine.toggle()} aria-label={active ? 'Pause music' : 'Play music'}>
        {active ? <Pause /> : <Play />}
      </Button>
    </div>
  );
}