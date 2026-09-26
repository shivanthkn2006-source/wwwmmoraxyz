/**
 * Zoe's humor drop — a plain feed post in the Calls-page liquid-glass style.
 * Presentation only; the skit comes pre-written from `humor_drops`. Audio is
 * played only when the member taps Play, one Deepgram voice at a time with a
 * short gap between speakers so lines never overlap.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Laugh, Pause, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { HumorDrop } from '@/hooks/useHumorDrops';

const VOICE = { A: 'aura-2-janus-en', B: 'aura-2-orion-en' } as const;
const GAP_MS = 450;
const TINT: Record<HumorDrop['metal'], string> = {
  iron: 'from-destructive/25',
  silver: 'from-primary/25',
  lead: 'from-accent/25',
  quicksilver: 'from-secondary/30',
};
const LABEL: Record<HumorDrop['metal'], string> = {
  iron: 'Mars mood', silver: 'Moon mood', lead: 'Saturn mood', quicksilver: 'Mercury mood',
};

async function speak(text: string, model: string, signal: AbortSignal): Promise<Blob> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('signed out');
  const res = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/deepgram-tts`, {
    method: 'POST',
    signal,
    headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model }),
  });
  if (!res.ok) throw new Error(`tts ${res.status}`);
  return res.blob();
}

export const HumorDropCard: React.FC<{ drop: HumorDrop }> = ({ drop }) => {
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(-1);
  const [failed, setFailed] = useState(false);
  const stopRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = () => {
    stopRef.current?.abort();
    audioRef.current?.pause();
    setPlaying(false);
    setActive(-1);
  };
  useEffect(() => stop, []);

  const play = async () => {
    if (playing) return stop();
    const ctrl = new AbortController();
    stopRef.current = ctrl;
    setPlaying(true);
    setFailed(false);
    try {
      // Fetch clips in parallel, play strictly in order.
      const clips = drop.lines.map((l) => speak(l.text, VOICE[l.speaker], ctrl.signal));
      for (let i = 0; i < clips.length; i++) {
        const blob = await clips[i];
        if (ctrl.signal.aborted) return;
        setActive(i);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        await new Promise<void>((resolve) => {
          audio.onended = audio.onerror = () => resolve();
          ctrl.signal.addEventListener('abort', () => resolve(), { once: true });
          void audio.play().catch(() => resolve());
        });
        URL.revokeObjectURL(url);
        if (ctrl.signal.aborted) return;
        await new Promise((r) => setTimeout(r, GAP_MS));
      }
    } catch {
      if (!ctrl.signal.aborted) setFailed(true);
    } finally {
      if (stopRef.current === ctrl) { setPlaying(false); setActive(-1); }
    }
  };

  return (
    <article
      data-humor-drop={drop.id}
      className={`w-full rounded-3xl border border-white/15 bg-gradient-to-br ${TINT[drop.metal]} to-transparent bg-white/5 p-5 text-white backdrop-blur-xl`}
    >
      <header className="mb-3 flex items-center gap-2 text-xs text-white/70">
        <Laugh className="h-4 w-4" aria-hidden />
        <span>Zoe's LOL · {LABEL[drop.metal]}</span>
      </header>
      <h3
        className="mb-4 text-2xl font-extrabold leading-tight tracking-tight text-white"
        style={{ WebkitTextStroke: '0.6px rgba(0,0,0,0.55)', textShadow: '0 1px 6px rgba(0,0,0,0.45)' }}
      >
        {drop.headline}
      </h3>
      <ul className="space-y-2">
        {drop.lines.map((line, i) => (
          <li
            key={i}
            className={`text-[15px] leading-snug transition-opacity ${active === -1 || active === i ? 'opacity-100' : 'opacity-50'} ${line.speaker === 'B' ? 'pl-6 font-semibold' : 'font-medium'}`}
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
          >
            {line.text}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void play()}
          aria-label={playing ? 'Stop the skit' : 'Play the skit'}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        {failed && <span className="text-xs text-white/70">Voice unavailable right now — the words are all here.</span>}
      </div>
    </article>
  );
};

export default HumorDropCard;
