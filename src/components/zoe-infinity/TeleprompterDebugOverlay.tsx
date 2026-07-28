/**
 * TeleprompterDebugOverlay — live wiring inspector for Zoe's spoken transcript
 * ============================================================================
 * Shows the active messageId, sentence index, word index, pause state and the
 * live TTS <audio> position, so the teleprompter sync can be verified in the
 * running app.
 *
 * Toggle with Ctrl+Shift+T, or `window.zoeTeleprompterDebug.toggle()`.
 * Hidden by default; never rendered unless explicitly enabled.
 */

import React, { useEffect, useRef, useState } from 'react';
import { subscribeSpokenSession, getSpokenSpeechRate } from '@/utils/zoeSpokenWordBus';
import type { SpokenSession } from '@/utils/zoeSpokenWordBus';
import { subscribeTTSAudio } from '@/utils/zoeTTSAudioBus';
import type { TTSAudioMetadata } from '@/utils/zoeTTSAudioBus';
import { useSpokenWordSync } from '@/hooks/useSpokenWordSync';

const STORAGE_KEY = 'zoe-teleprompter-debug';

declare global {
  interface Window {
    zoeTeleprompterDebug?: {
      toggle: () => void;
      show: () => void;
      hide: () => void;
    };
  }
}

export const TeleprompterDebugOverlay: React.FC = () => {
  const [visible, setVisible] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });
  const [session, setSession] = useState<SpokenSession | null>(null);
  const [audioInfo, setAudioInfo] = useState<{ time: number; duration: number } | null>(null);
  const audioRef = useRef<HTMLMediaElement | null>(null);
  const metaRef = useRef<TTSAudioMetadata | null>(null);

  const { isActive, isPaused, activeWordIndex, activeSentenceIndex, sentenceRange, tokens } =
    useSpokenWordSync(session?.messageId, session?.text ?? '');

  useEffect(() => {
    const api = {
      toggle: () => setVisible((v) => !v),
      show: () => setVisible(true),
      hide: () => setVisible(false),
    };
    window.zoeTeleprompterDebug = api;
    return () => { delete window.zoeTeleprompterDebug; };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, visible ? '1' : '0'); } catch { /* noop */ }
  }, [visible]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'T' || e.key === 't')) {
        e.preventDefault();
        setVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => subscribeSpokenSession(setSession), []);

  useEffect(() => {
    if (!visible) return;
    return subscribeTTSAudio((audio, metadata) => {
      audioRef.current = audio;
      metaRef.current = metadata;
    });
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => {
      const a = audioRef.current;
      setAudioInfo(a ? { time: a.currentTime || 0, duration: Number.isFinite(a.duration) ? a.duration : 0 } : null);
    }, 100);
    return () => window.clearInterval(id);
  }, [visible]);

  if (!visible) return null;

  const meta = metaRef.current;
  const currentWord = activeWordIndex >= 0 ? tokens[activeWordIndex]?.text ?? '—' : '—';

  return (
    <div
      data-testid="teleprompter-debug-overlay"
      className="fixed top-16 left-3 z-[10000] max-w-[280px] rounded-md border border-border/60 bg-background/90 px-3 py-2 font-mono text-[10px] leading-relaxed text-foreground shadow-lg backdrop-blur pointer-events-auto"
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-bold text-primary">TELEPROMPTER DEBUG</span>
        <button onClick={() => setVisible(false)} className="text-muted-foreground hover:text-foreground">✕</button>
      </div>
      <Row label="messageId" value={session?.messageId ?? '—'} />
      <Row label="active" value={String(isActive)} />
      <Row label="paused" value={String(isPaused)} testid="tp-paused" />
      <Row label="sentence #" value={String(activeSentenceIndex)} testid="tp-sentence" />
      <Row label="word #" value={String(activeWordIndex)} testid="tp-word" />
      <Row label="word" value={currentWord} />
      <Row
        label="sentence span"
        value={sentenceRange ? `${sentenceRange.start}–${sentenceRange.end}` : '—'}
      />
      <Row label="words total" value={String(tokens.length)} />
      <Row
        label="audio"
        value={audioInfo ? `${audioInfo.time.toFixed(2)}s / ${audioInfo.duration.toFixed(2)}s` : 'none'}
        testid="tp-audio"
      />
      <Row label="chunk chars" value={meta ? `${meta.charStart}–${meta.charEnd}` : '—'} />
      <Row
        label="chunk"
        value={meta && meta.totalChunks ? `${(meta.chunkIndex ?? 0) + 1}/${meta.totalChunks}` : '—'}
      />
      <Row label="rate" value={getSpokenSpeechRate().toFixed(2)} />
      <div className="mt-1 text-[9px] text-muted-foreground">Ctrl+Shift+T to toggle</div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; testid?: string }> = ({ label, value, testid }) => (
  <div className="flex justify-between gap-3">
    <span className="text-muted-foreground">{label}</span>
    <span data-testid={testid} className="truncate">{value}</span>
  </div>
);

export default TeleprompterDebugOverlay;
