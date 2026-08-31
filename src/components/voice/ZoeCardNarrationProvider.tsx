import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { speakAsZoe, stopZoeSpeech, pauseZoeSpeech, resumeZoeSpeech, getZoeSpeechState } from '@/utils/zoeVoice';
import { hasNarratedCard, hasStartedDailyNarration, markDailyNarrationStarted, markNarratedCard } from '@/lib/zoeCardNarrationMemory';

export type NarrationKind = 'growth' | 'dhf' | 'social';
export interface NarrationItem { id: string; text: string; kind: NarrationKind; order: number; }
interface NarrationState { activeId: string | null; paused: boolean; }
interface NarrationApi extends NarrationState {
  register: (item: NarrationItem) => () => void;
  play: (item: NarrationItem, repeat?: boolean) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

const Context = createContext<NarrationApi | null>(null);

export const ZoeCardNarrationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const items = useRef(new Map<string, NarrationItem>());
  const queueToken = useRef(0);
  const [state, setState] = useState<NarrationState>({ activeId: null, paused: false });

  const register = useCallback((item: NarrationItem) => {
    items.current.set(item.id, item);
    return () => { items.current.delete(item.id); };
  }, []);

  const speak = useCallback(async (item: NarrationItem) => {
    const token = ++queueToken.current;
    setState({ activeId: item.id, paused: false });
    await new Promise<void>((resolve) => {
      void speakAsZoe(item.text, { messageId: `card:${item.id}` }, undefined, resolve, resolve);
    });
    if (queueToken.current === token) setState({ activeId: null, paused: false });
  }, []);

  const play = useCallback((item: NarrationItem, repeat = false) => {
    if (!repeat && user?.id && hasNarratedCard(user.id, item.id)) return;
    if (user?.id) markNarratedCard(user.id, item.id);
    void speak(item);
  }, [speak, user?.id]);

  const stop = useCallback(() => {
    queueToken.current += 1;
    stopZoeSpeech();
    setState({ activeId: null, paused: false });
  }, []);
  const pause = useCallback(() => { pauseZoeSpeech(); setState((s) => ({ ...s, paused: true })); }, []);
  const resume = useCallback(() => { resumeZoeSpeech(); setState((s) => ({ ...s, paused: false })); }, []);

  useEffect(() => {
    if (!user?.id || hasStartedDailyNarration(user.id)) return;
    const start = () => {
      if (hasStartedDailyNarration(user.id)) return;
      markDailyNarrationStarted(user.id);
      const token = ++queueToken.current;
      const run = async () => {
        const welcome: NarrationItem = { id: `welcome:${user.id}`, kind: 'growth', order: -1, text: 'Welcome back. Zoe is ready with your daily focus and DHF compass.' };
        const daily = Array.from(items.current.values())
          .filter((item) => item.kind === 'growth' || item.kind === 'dhf')
          .sort((a, b) => (a.kind === b.kind ? a.order - b.order : a.kind === 'growth' ? -1 : 1));
        for (const item of [welcome, ...daily]) {
          if (queueToken.current !== token) return;
          if (hasNarratedCard(user.id, item.id)) continue;
          markNarratedCard(user.id, item.id);
          setState({ activeId: item.id, paused: false });
          await new Promise<void>((resolve) => { void speakAsZoe(item.text, { messageId: `card:${item.id}` }, undefined, resolve, resolve); });
        }
        if (queueToken.current === token) setState({ activeId: null, paused: false });
      };
      window.setTimeout(() => void run(), 250);
    };
    window.addEventListener('pointerdown', start, { once: true, passive: true });
    window.addEventListener('keydown', start, { once: true });
    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
    };
  }, [user?.id]);

  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'hidden' && getZoeSpeechState().isSpeakingActive) pause(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [pause]);

  const value = useMemo(() => ({ ...state, register, play, pause, resume, stop }), [state, register, play, pause, resume, stop]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export function useZoeCardNarration(item: NarrationItem) {
  const api = useContext(Context);
  useEffect(() => api?.register(item), [api?.register, item.id, item.text, item.kind, item.order]);
  return {
    active: api?.activeId === item.id,
    paused: api?.activeId === item.id && api.paused,
    play: () => api?.play(item, true),
    pause: api?.pause ?? (() => undefined),
    resume: api?.resume ?? (() => undefined),
    stop: api?.stop ?? (() => undefined),
  };
}