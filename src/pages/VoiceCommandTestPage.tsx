import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Play, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ZOE_HOME_TRANSCRIPT_EVENTS, type ZoeHomeDetectedCommand } from '@/lib/zoeHomeCommands';

type TestStatus = 'idle' | 'running' | 'pass' | 'fail';

interface VoiceSample {
  id: string;
  label: string;
  eventName: string;
  detail: Record<string, unknown>;
  expected: {
    loopsHidden?: boolean;
    autoScroll?: boolean;
    command: ZoeHomeDetectedCommand;
  };
}

const readIframeState = (win: Window | null) => {
  const doc = win?.document;
  return {
    loopsHidden: win?.localStorage.getItem('mmora.home.loopsHidden') === 'true',
    autoScroll: win?.localStorage.getItem('mmora.home.autoScroll') !== 'false',
    debugCommand: doc?.querySelector('[data-testid="zoe-debug-command"]')?.textContent?.trim() || '',
    debugHandler: doc?.querySelector('[data-testid="zoe-debug-handler"]')?.textContent?.trim() || '',
    loopsLabel: doc?.querySelector('[data-testid="zoe-debug-loops-hidden"]')?.textContent?.trim() || '',
  };
};

const VoiceCommandTestPage: React.FC = () => {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [status, setStatus] = useState<Record<string, TestStatus>>({});
  const [log, setLog] = useState<string[]>([]);

  const samples = useMemo<VoiceSample[]>(() => [
    {
      id: 'hide-loops-transcript',
      label: 'Zoe hide loops',
      eventName: 'zoe-voice-command',
      detail: { transcript: 'Zoe hide loops', source: 'voice-test-page' },
      expected: { loopsHidden: true, command: 'hide-loops' },
    },
    {
      id: 'unhide-loops-home-bus',
      label: 'Unhide loops via home bus',
      eventName: 'mmora:home-command',
      detail: { command: 'unhide loops', source: 'voice-test-page' },
      expected: { loopsHidden: false, command: 'unhide-loops' },
    },
    {
      id: 'stop-timeline',
      label: 'Zoe stop timeline scrolling',
      eventName: 'zoe:transcript',
      detail: { text: 'Zoe stop timeline scrolling', source: 'voice-test-page' },
      expected: { autoScroll: false, command: 'stop-scrolling' },
    },
    {
      id: 'resume-feed',
      label: 'Zoe resume feed scrolling',
      eventName: 'vr-voice-input',
      detail: { transcript: 'Zoe resume feed scrolling', source: 'voice-test-page' },
      expected: { autoScroll: true, command: 'start-scrolling' },
    },
  ], []);

  const waitForHome = async () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) throw new Error('Home iframe is not ready');
    for (let i = 0; i < 40; i += 1) {
      if ((win as any).mmoraHomeCommand || win.document.querySelector('[data-testid="zoe-home-debug-overlay"]')) return win;
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }
    throw new Error('Home command handler did not mount inside the test frame');
  };

  const replay = async (sample: VoiceSample) => {
    setStatus((prev) => ({ ...prev, [sample.id]: 'running' }));
    try {
      const win = await waitForHome();
      win.dispatchEvent(new CustomEvent(sample.eventName, { detail: sample.detail }));
      setLog((prev) => [`route → ${sample.eventName} ${JSON.stringify(sample.detail)}`, ...prev].slice(0, 12));

      let state = readIframeState(win);
      for (let i = 0; i < 24; i += 1) {
        state = readIframeState(win);
        const loopsOk = sample.expected.loopsHidden === undefined || state.loopsHidden === sample.expected.loopsHidden;
        const scrollOk = sample.expected.autoScroll === undefined || state.autoScroll === sample.expected.autoScroll;
        const commandOk = state.debugCommand === sample.expected.command || state.debugHandler === sample.expected.command;
        if (loopsOk && scrollOk && commandOk) {
          setStatus((prev) => ({ ...prev, [sample.id]: 'pass' }));
          setLog((prev) => [`pass → ${sample.label} (${JSON.stringify(state)})`, ...prev].slice(0, 12));
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
      throw new Error(`Expected ${JSON.stringify(sample.expected)}, got ${JSON.stringify(state)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus((prev) => ({ ...prev, [sample.id]: 'fail' }));
      setLog((prev) => [`fail → ${sample.label}: ${message}`, ...prev].slice(0, 12));
    }
  };

  const runAll = async () => {
    for (const sample of samples) await replay(sample);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold">Zoe home voice test</h1>
            <p className="text-xs text-muted-foreground">Replays Zoe events into the real Home page handler.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => iframeRef.current?.contentWindow?.location.reload()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reload home
          </Button>
          <Button size="sm" onClick={runAll} className="gap-2">
            <Play className="h-4 w-4" />
            Run all
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-4 p-4 lg:grid-cols-[360px_1fr]">
        <section className="space-y-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Replay samples</div>
            <div className="space-y-2">
              {samples.map((sample) => {
                const state = status[sample.id] || 'idle';
                return (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => replay(sample)}
                    className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {state === 'pass' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : state === 'fail' ? <XCircle className="h-4 w-4 text-destructive" /> : <Play className="h-4 w-4 text-muted-foreground" />}
                    <span className="min-w-0 flex-1 truncate">{sample.label}</span>
                    <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{state}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Watched event names</div>
            <div className="max-h-28 overflow-auto font-mono text-[10px] text-muted-foreground">
              {['mmora:home-command', ...ZOE_HOME_TRANSCRIPT_EVENTS].join(' • ')}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Results log</div>
            <div className="max-h-56 space-y-1 overflow-auto font-mono text-[10px] text-muted-foreground">
              {log.length ? log.map((line, index) => <div key={`${line}-${index}`}>{line}</div>) : <div>No tests run yet.</div>}
            </div>
          </div>
        </section>

        <section className="min-h-[720px] overflow-hidden rounded-lg border border-border bg-card">
          <iframe
            ref={iframeRef}
            title="Home page command test frame"
            src="/home?zoeVoiceTest=1"
            className="h-[720px] w-full bg-background"
          />
        </section>
      </div>
    </main>
  );
};

export default VoiceCommandTestPage;
