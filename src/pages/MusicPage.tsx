import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Disc3, ListMusic, Pause, Play, Repeat, Search, Shuffle, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { musicEngine } from '@/services/MusicEngine';
import { useMusicEngine } from '@/hooks/useMusicEngine';
import { resolveMusicQueue } from '@/features/music/musicProviders';

function clock(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

function IconControl({ label, children, ...props }: React.ComponentProps<typeof Button> & { label: string }) {
  return <Tooltip><TooltipTrigger asChild><Button aria-label={label} {...props}>{children}</Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}

export default function MusicPage() {
  const state = useMusicEngine();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const active = state.status === 'playing' || state.status === 'buffering';

  const search = async () => {
    const value = query.trim();
    if (!value || searching) return;
    setSearching(true);
    setNotice(null);
    const result = await resolveMusicQueue(value, 'track');
    if (!result.tracks.length) setNotice('No playable result was available from the connected free music sources.');
    else {
      const played = await musicEngine.playQueue(result.tracks);
      setNotice(played ? `Playing from ${result.source}.` : musicEngine.getState().error);
    }
    setSearching(false);
  };

  return (
    <TooltipProvider>
    <main className="min-h-screen bg-background px-4 pb-28 pt-20 text-foreground">
      <Helmet>
        <title>Music Player | M'Mora</title>
        <meta name="description" content="Play music and live radio with Zoe across M'Mora." />
      </Helmet>
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-h-[620px] flex-col justify-between border-b border-border pb-10 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-10">
          <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void search(); }}>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tracks, artists, moods or radio" aria-label="Search music" />
             <IconControl type="submit" size="icon" disabled={searching} label={searching ? 'Searching music' : 'Search music'}><Search /></IconControl>
          </form>

          <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
            <div className="flex aspect-square w-full max-w-sm items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
              {state.track?.artwork ? <img src={state.track.artwork} alt="" className="h-full w-full object-cover" /> : <Disc3 className="h-24 w-24 text-muted-foreground" aria-hidden="true" />}
            </div>
            <h1 className="mt-7 text-3xl font-semibold">{state.track?.title ?? 'Music'}</h1>
            <p className="mt-2 text-muted-foreground">{state.track?.artist ?? 'Ask Zoe to play something, or search above.'}</p>
            {state.track && <p className="mt-1 text-xs text-muted-foreground">{state.track.credit}</p>}
            {(state.error || notice) && <p role="status" className="mt-4 max-w-md text-sm text-muted-foreground">{state.error ?? notice}</p>}
          </div>

          <div className="mx-auto w-full max-w-2xl space-y-5">
            <div>
               <Slider value={[state.position]} max={Math.max(state.duration, state.position, 1)} step={1} disabled={!state.duration || Boolean(state.track?.live)} onValueChange={([value]) => musicEngine.seek(value)} aria-label="Playback position" aria-valuetext={clock(state.position)} />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{clock(state.position)}</span><span>{state.track?.live ? 'LIVE' : clock(state.duration)}</span></div>
            </div>
            <div className="flex items-center justify-center gap-3">
               <IconControl variant={state.shuffle ? 'secondary' : 'ghost'} size="icon" onClick={() => musicEngine.toggleShuffle()} label={state.shuffle ? 'Turn shuffle off' : 'Turn shuffle on'}><Shuffle /></IconControl>
               <IconControl variant="ghost" size="icon" onClick={() => void musicEngine.previous()} label="Previous track"><SkipBack /></IconControl>
               <IconControl size="icon" className="h-12 w-12" onClick={() => { musicEngine.unlock(); musicEngine.toggle(); }} label={active ? 'Pause music' : 'Play music'}>{active ? <Pause /> : <Play />}</IconControl>
               <IconControl variant="ghost" size="icon" onClick={() => void musicEngine.next()} label="Next track"><SkipForward /></IconControl>
               <IconControl variant={state.repeat !== 'off' ? 'secondary' : 'ghost'} size="icon" onClick={() => musicEngine.cycleRepeat()} label={`Repeat: ${state.repeat}`}><Repeat /></IconControl>
            </div>
             <div className="flex items-center gap-3"><Volume2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" /><Slider value={[state.volume * 100]} max={100} step={1} onValueChange={([value]) => musicEngine.setVolume(value / 100)} aria-label="Music volume" aria-valuetext={`${Math.round(state.volume * 100)} percent`} /><span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{Math.round(state.volume * 100)}%</span></div>
          </div>
        </section>

        <aside aria-label="Music queue">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold"><ListMusic /> Queue</h2>
          {state.queue.length === 0 ? <p className="text-sm text-muted-foreground">Your queue is empty.</p> : (
            <ol className="divide-y divide-border">
              {state.queue.map((track, index) => (
                <li key={track.id}>
                   <Button variant={index === state.index ? 'secondary' : 'ghost'} className="h-auto w-full justify-start whitespace-normal px-2 py-3 text-left" aria-label={`Play ${track.title} by ${track.artist}`} aria-current={index === state.index ? 'true' : undefined} onClick={() => { musicEngine.unlock(); void musicEngine.playIndex(index); }}>
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{track.title}</span><span className="block truncate text-xs text-muted-foreground">{track.artist}</span></span>
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </main>
    </TooltipProvider>
  );
}