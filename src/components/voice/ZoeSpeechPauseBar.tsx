/**
 * Floating pause/resume/stop control for anything Zoe is speaking
 * (notification announcements and card narration alike).
 *
 * Bottom-LEFT on purpose: the bottom-right dock/call controls must stay
 * completely unobstructed.
 */
import React, { useEffect, useState } from 'react';
import { Pause, Play, Square } from 'lucide-react';
import { pauseZoeSpeech, resumeZoeSpeech, stopZoeSpeech, getZoeSpeechState } from '@/utils/zoeVoice';

export const ZoeSpeechPauseBar: React.FC = () => {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const onStart = () => { setSpeaking(true); setPaused(false); };
    const onEnd = () => { setSpeaking(false); setPaused(false); };
    const onPause = () => setPaused(true);
    const onResume = () => setPaused(false);
    window.addEventListener('zoe-speak-start', onStart);
    window.addEventListener('zoe-speak-end', onEnd);
    window.addEventListener('zoe-speak-pause', onPause);
    window.addEventListener('zoe-speak-resume', onResume);
    // Safety net: some paths only flip internal state.
    const poll = window.setInterval(() => {
      const state = getZoeSpeechState();
      setSpeaking((prev) => (prev !== state.isSpeakingActive && !state.isPaused ? state.isSpeakingActive : prev));
    }, 1500);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener('zoe-speak-start', onStart);
      window.removeEventListener('zoe-speak-end', onEnd);
      window.removeEventListener('zoe-speak-pause', onPause);
      window.removeEventListener('zoe-speak-resume', onResume);
    };
  }, []);

  if (!speaking && !paused) return null;

  return (
    <div
      data-zoe-speech-bar
      className="pointer-events-none fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-3 z-[10000] flex items-center gap-1 rounded-full border border-border bg-card/95 p-1 shadow-lg backdrop-blur-xl"
    >
      <button
        type="button"
        aria-label={paused ? 'Resume Zoe speech' : 'Pause Zoe speech'}
        onClick={() => (paused ? resumeZoeSpeech() : pauseZoeSpeech())}
        className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
      >
        {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
      </button>
      <button
        type="button"
        aria-label="Stop Zoe speech"
        onClick={() => { stopZoeSpeech(); setSpeaking(false); setPaused(false); }}
        className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
      >
        <Square className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default ZoeSpeechPauseBar;
