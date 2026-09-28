/**
 * ZOE DEVICE SCAN — renders nothing.
 * Watches the member's own device while they use M'Mora (runtime errors,
 * failed promises, network drops, microphone/speech failures, hands-free
 * errors) and, when a real problem appears, Zoe tells the member in her
 * Deepgram voice (or a quiet notice when voice is off/muted).
 *
 * Runs fully on-device: no AI provider is called, so it cannot break when an
 * external API is down. Only real readings are reported — never simulated.
 */
import { useEffect } from 'react';
import { toast } from 'sonner';
import { getRuntimeIssues } from '@/features/zoe-godmode/runtimeIssueCollector';
import { zoeBackgroundListener } from '@/services/ZoeBackgroundListener';
import { claimVoice, releaseVoice } from '@/lib/zoeVoiceArbiter';
import { isZoeAudioEnabled } from '@/lib/zoeAudioPreference';
import { isZoeMuted } from '@/features/zoe-handsfree/muteGate';
import { speakWithDeepgram } from '@/utils/deepgramTTS';

const SCAN_MS = 5_000;
const COOLDOWN_MS = 2 * 60_000;
// Noise that is not a member-facing problem.
const IGNORE = /ResizeObserver|Warning:|AbortError|aborted|no-speech|Loading chunk .* failed.*retry|HMR|vite/i;

function classify(message: string): string | null {
  if (IGNORE.test(message)) return null;
  if (/Failed to fetch|NetworkError|Load failed|ERR_NETWORK/i.test(message)) return 'a connection problem reaching M’Mora';
  if (/ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed/i.test(message)) return 'a part of the app that did not load — a refresh should fix it';
  if (/NotAllowedError|Permission denied|not-allowed/i.test(message)) return 'a blocked permission, like the microphone or camera';
  if (/NotReadableError|audio-capture|Could not start audio/i.test(message)) return 'the microphone being busy or unavailable';
  if (/QuotaExceeded/i.test(message)) return 'the device storage being full';
  return 'an error on this screen';
}

export default function ZoeDeviceScanHost() {
  useEffect(() => {
    let lastSeenTs = Date.now();
    let lastSpoken = 0;
    const spokenKinds = new Set<string>();

    const inform = async (problem: string) => {
      const now = Date.now();
      if (now - lastSpoken < COOLDOWN_MS || spokenKinds.has(problem)) return;
      lastSpoken = now;
      spokenKinds.add(problem);
      const line = `Heads up, I noticed ${problem}.`;
      window.dispatchEvent(new CustomEvent('zoe-device-scan-issue', { detail: { problem, at: now } }));
      if (isZoeAudioEnabled() && !isZoeMuted() && claimVoice('narration', { ambient: true })) {
        try { await speakWithDeepgram(line); } finally { releaseVoice('narration'); }
      } else {
        toast.warning('Zoe noticed a problem', { description: problem, duration: 5000 });
      }
    };

    const scan = () => {
      const fresh = getRuntimeIssues().filter((i) => i.ts > lastSeenTs);
      if (fresh.length) lastSeenTs = fresh[fresh.length - 1].ts;
      for (const issue of fresh) {
        const problem = classify(issue.message);
        if (problem) { void inform(problem); break; }
      }
    };

    const offline = () => toast.warning('Zoe: you are offline', { description: 'I’ll reconnect when your network is back.' });
    const unsubscribe = zoeBackgroundListener.onStateChange((state) => {
      if (state !== 'error') return;
      const reason = zoeBackgroundListener.getLastError();
      void inform(reason ? `hands-free listening stopped: ${reason}` : 'hands-free listening could not start on this browser');
    });

    const timer = window.setInterval(scan, SCAN_MS);
    window.addEventListener('offline', offline);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('offline', offline);
      unsubscribe();
    };
  }, []);

  return null;
}
