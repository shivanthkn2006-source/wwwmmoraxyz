// ═══════════════════════════════════════════════════════════════════════════════
// ZOE HANDS-FREE SELF-TEST
// One-click 30-second diagnostic. Requests mic, starts HF, records every
// SpeechRecognition + HF state transition, then reports pass/fail with details.
// ═══════════════════════════════════════════════════════════════════════════════

import {
  subscribeZoeDebug,
  subscribeZoeDebugState,
  zoeDebugLog,
  zoeDebugSetState,
  type ZoeDebugEntry,
  type ZoeHandsFreeDebugState,
} from './debugBus';

export type SelfTestPhase = 'idle' | 'running' | 'done';

export interface SelfTestReport {
  pass: boolean;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  micPermission: ZoeHandsFreeDebugState['micPermission'];
  recognizerStarts: number;
  recognizerStops: number;
  fatalErrors: string[];
  transientErrors: string[]; // no-speech / aborted
  hfStatesSeen: string[];
  events: ZoeDebugEntry[];
  checks: { label: string; ok: boolean; detail?: string }[];
  summary: string;
}

export interface SelfTestProgress {
  phase: SelfTestPhase;
  elapsedMs: number;
  totalMs: number;
  currentHfState: string;
  micPermission: string;
  recognizerStarts: number;
  errors: number;
  report?: SelfTestReport;
}

const TEST_DURATION_MS = 30_000;
const TRANSIENT = new Set(['no-speech', 'aborted']);

let running = false;

export async function runHandsFreeSelfTest(
  onProgress?: (p: SelfTestProgress) => void,
): Promise<SelfTestReport> {
  if (running) throw new Error('Self-test already running');
  running = true;

  const startedAt = Date.now();
  const events: ZoeDebugEntry[] = [];
  const hfStatesSeen = new Set<string>();
  let latestState: ZoeHandsFreeDebugState | null = null;
  let recognizerStarts = 0;
  let recognizerStops = 0;
  const fatalErrors: string[] = [];
  const transientErrors: string[] = [];

  const seenEventIds = new Set<number>();

  const emit = (phase: SelfTestPhase, report?: SelfTestReport) => {
    if (!onProgress) return;
    onProgress({
      phase,
      elapsedMs: Date.now() - startedAt,
      totalMs: TEST_DURATION_MS,
      currentHfState: latestState?.hfState ?? 'off',
      micPermission: latestState?.micPermission ?? 'unknown',
      recognizerStarts,
      errors: fatalErrors.length + transientErrors.length,
      report,
    });
  };

  const unsubEvents = subscribeZoeDebug((all) => {
    for (const e of all) {
      if (seenEventIds.has(e.id)) continue;
      if (e.ts < startedAt) { seenEventIds.add(e.id); continue; }
      seenEventIds.add(e.id);
      events.push(e);
      if (e.message.includes('SpeechRecognition start')) recognizerStarts++;
      else if (e.message.includes('SpeechRecognition stop')) recognizerStops++;
      else if (e.level === 'error') fatalErrors.push(e.message);
      const m = e.message.match(/error · [^·]+ · ([a-z-]+)/);
      if (m && TRANSIENT.has(m[1])) transientErrors.push(m[1]);
    }
  });

  const unsubState = subscribeZoeDebugState((s) => {
    latestState = s;
    hfStatesSeen.add(s.hfState);
  });

  zoeDebugLog('info', '▶ self-test started (30s)');

  // 1) Request mic (user-gesture chain from button click)
  let micGranted = false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    micGranted = true;
    zoeDebugSetState({ micPermission: 'granted' });
    try { window.dispatchEvent(new CustomEvent('zoe-mic-permission-changed', { detail: { state: 'granted' } })); } catch { /* noop */ }
    zoeDebugLog('info', 'self-test: mic granted');
  } catch (err) {
    zoeDebugSetState({ micPermission: 'denied' });
    zoeDebugLog('error', `self-test: mic denied · ${(err as Error).message ?? err}`);
  }

  // 2) Kick HF on
  try { window.dispatchEvent(new CustomEvent('zoe-start-handsfree-listening')); } catch { /* noop */ }

  // 3) Tick every 500ms until 30s elapsed
  await new Promise<void>((resolve) => {
    emit('running');
    const timer = setInterval(() => {
      emit('running');
      if (Date.now() - startedAt >= TEST_DURATION_MS) {
        clearInterval(timer);
        resolve();
      }
    }, 500);
  });

  unsubEvents();
  unsubState();
  running = false;

  const endedAt = Date.now();

  const checks: SelfTestReport['checks'] = [
    { label: 'Microphone permission granted', ok: micGranted, detail: latestState?.micPermission },
    { label: 'SpeechRecognition started at least once', ok: recognizerStarts > 0, detail: `${recognizerStarts} start(s)` },
    { label: 'HF state advanced past "off"', ok: hfStatesSeen.size > 1 || (hfStatesSeen.size === 1 && !hfStatesSeen.has('off')), detail: Array.from(hfStatesSeen).join(', ') },
    { label: 'No fatal SpeechRecognition errors', ok: fatalErrors.length === 0, detail: fatalErrors[0] },
    { label: 'Recognizer did not abort-loop', ok: transientErrors.filter((e) => e === 'aborted').length < 5, detail: `${transientErrors.filter((e) => e === 'aborted').length} aborts` },
  ];

  const pass = checks.every((c) => c.ok);

  const summary = pass
    ? `PASS · ${recognizerStarts} start(s), ${transientErrors.length} transient, 0 fatal`
    : `FAIL · ${checks.filter((c) => !c.ok).map((c) => c.label).join('; ')}`;

  const report: SelfTestReport = {
    pass,
    startedAt,
    endedAt,
    durationMs: endedAt - startedAt,
    micPermission: latestState?.micPermission ?? 'unknown',
    recognizerStarts,
    recognizerStops,
    fatalErrors,
    transientErrors,
    hfStatesSeen: Array.from(hfStatesSeen),
    events,
    checks,
    summary,
  };

  zoeDebugLog(pass ? 'info' : 'error', `■ self-test ${summary}`);
  emit('done', report);
  return report;
}

export function isSelfTestRunning(): boolean {
  return running;
}
