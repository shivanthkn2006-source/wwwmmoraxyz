import { useCallback, useEffect, useRef } from 'react';
import { useHumorDrops } from '@/hooks/useHumorDrops';
import { isZoeAudioEnabled } from '@/lib/zoeAudioPreference';
import { claimVoice, registerVoiceChannel, releaseVoice } from '@/lib/zoeVoiceArbiter';
import { humorText } from '@/lib/humor';
import { isZoeMuted } from '@/features/zoe-handsfree/muteGate';
import { speakWithDeepgram, stopDeepgramSpeech } from '@/utils/deepgramTTS';
import { offerLatestCardAnnouncement, unlockLatestCardAnnouncement } from '@/lib/latestCardAnnouncement';

const KEY = 'mmora:humor-announced:v2';
const FRESH_MS = 2 * 60 * 60 * 1000;

function announced(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') as string[]; } catch { return []; }
}

function remember(id: string) {
  try { localStorage.setItem(KEY, JSON.stringify([...announced().filter((item) => item !== id).slice(-79), id])); } catch { /* private mode */ }
}

export default function HumorAnnouncementHost() {
  const drops = useHumorDrops(8);
  const unlocked = useRef(false);
  const running = useRef(false);

  const announce = useCallback(async () => {
    if (!unlocked.current || running.current || !isZoeAudioEnabled() || isZoeMuted()) return;
    const seen = new Set(announced());
    const now = Date.now();
    const drop = drops.find((item) => {
      const due = new Date(item.scheduled_for).getTime();
      return due <= now && now - due <= FRESH_MS && !seen.has(item.id);
    });
    if (!drop) return;
    offerLatestCardAnnouncement({
      id: `humor:${drop.id}`,
      generatedAt: new Date(drop.created_at || drop.scheduled_for).getTime(),
      announce: async () => {
        if (announced().includes(drop.id)) return true;
        if (!claimVoice('narration', { ambient: true })) return false;
        running.current = true;
        try {
          const ok = await speakWithDeepgram(`Zoe's LOL. ${drop.headline}. ${humorText(drop.lines)}`);
          if (ok) remember(drop.id);
          return ok;
        } finally {
          running.current = false;
          releaseVoice('narration');
        }
      },
    });
    unlockLatestCardAnnouncement();
  }, [drops]);

  useEffect(() => registerVoiceChannel('narration', () => {
    stopDeepgramSpeech();
    running.current = false;
  }), []);

  useEffect(() => {
    const unlock = () => {
      unlocked.current = true;
      void announce();
    };
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [announce]);

  useEffect(() => { void announce(); }, [announce]);
  return null;
}