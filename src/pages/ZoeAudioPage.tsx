import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAudioRouter } from '@/hooks/useAudioRouter';
import { audioRouter } from '@/services/AudioRouterService';

/** Best-supported headsets for the M'Mora / Zoe two-way voice link. */
const SUPPORTED_HEADSETS = [
  {
    rank: 1,
    name: 'Apple AirPods Pro 2 / AirPods 4',
    bt: 'Bluetooth 5.3 · LE Audio ready · H2 chip',
    why: 'Best mic pickup, stem-press maps straight to play/pause so you can start and stop Zoe without the screen.',
  },
  {
    rank: 2,
    name: 'Sony WF-1000XM5 / WH-1000XM5',
    bt: 'Bluetooth 5.3 · LE Audio (LC3) · A2DP + HFP',
    why: 'Wideband voice while listening, strong noise handling, reliable hardware buttons on every OS.',
  },
  {
    rank: 3,
    name: 'Jabra Evolve2 65 / Evolve2 85 (enterprise)',
    bt: 'Bluetooth 5.2 · certified for Teams/Zoom · USB dongle option',
    why: 'The dongle gives a stable, always-listed device name in the picker — the safest choice for desks and demos.',
  },
  {
    rank: 4,
    name: 'Samsung Galaxy Buds3 Pro',
    bt: 'Bluetooth 5.4 · LE Audio (LC3) · Auracast',
    why: 'Keeps voice at 32/48 kHz while the mic is open, so Zoe never goes tinny on Android.',
  },
  {
    rank: 5,
    name: 'Shokz OpenComm2 / OpenRun Pro 2 (bone conduction)',
    bt: 'Bluetooth 5.1–5.3 · boom mic (OpenComm2)',
    why: 'Ears stay open — closest to the Jarvis-in-your-ear feel while walking, cycling or in a workshop.',
  },
];

export const ZoeAudioPage: React.FC = () => {
  const {
    status,
    devices,
    activeInput,
    activeOutput,
    audioLevel,
    diagnostics,
    switchInput,
    switchOutput,
    grantMicOnce,
    refreshDevices,
  } = useAudioRouter();

  const [testPlaying, setTestPlaying] = useState<boolean>(false);
  const audioTestRef = useRef<HTMLAudioElement | null>(null);
  const sinkElementRef = useRef<HTMLAudioElement | null>(null);

  // Bind the master output element + open the audio pipeline for this page.
  useEffect(() => {
    if (!sinkElementRef.current) sinkElementRef.current = new Audio();
    void audioRouter.initialize(sinkElementRef.current);
  }, []);

  const runSoundTest = () => {
    if (!audioTestRef.current) {
      audioTestRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    }
    setTestPlaying(true);
    void audioRouter.applySinkToElement(audioTestRef.current);
    audioRouter.duckAudio(true);
    void audioTestRef.current.play().finally(() => {
      setTimeout(() => {
        setTestPlaying(false);
        audioRouter.duckAudio(false);
      }, 1000);
    });
  };

  const statusTone =
    status === 'connected'
      ? 'border-foreground/40 text-foreground'
      : status === 'fallback' || status === 'connecting'
        ? 'border-border text-muted-foreground'
        : 'border-destructive/50 text-destructive';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 text-foreground">
      <Helmet>
        <title>Zoe Audio & Bluetooth Routing Centre | M'Mora</title>
        <meta
          name="description"
          content="Connect Bluetooth headphones to M'Mora, route Zoe's voice to your earpiece, test the mic and use headset buttons to talk to Zoe hands-free."
        />
      </Helmet>

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span>Zoe Audio &amp; Bluetooth Routing Center</span>
            <span className={`text-xs px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold border ${statusTone}`}>
              {status}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage two-way neural communication, device sink assignment, and media controls.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void grantMicOnce()}
            className="px-4 py-2 border border-border hover:bg-muted text-xs font-semibold rounded-lg transition"
          >
            {diagnostics.micPermission === 'granted' ? 'Microphone allowed' : 'Allow microphone (one time)'}
          </button>
          <button
            onClick={() => void refreshDevices()}
            className="px-4 py-2 bg-muted hover:bg-muted/70 text-xs font-semibold rounded-lg transition"
          >
            Rescan Hardware Devices
          </button>
        </div>
      </header>

      {/* Operational dashboard */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <span className="text-xs text-muted-foreground uppercase font-mono">Sample Rate</span>
          <p className="text-xl font-bold mt-1">{diagnostics.inputSampleRate / 1000} kHz</p>
          <span className="text-xs text-muted-foreground">High-Fidelity Wideband</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <span className="text-xs text-muted-foreground uppercase font-mono">Output Latency</span>
          <p className="text-xl font-bold mt-1">~{diagnostics.outputLatencyMs} ms</p>
          <span className="text-xs text-muted-foreground">Base WebAudio Latency</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <span className="text-xs text-muted-foreground uppercase font-mono">Sink Routing (setSinkId)</span>
          <p className="text-xl font-bold mt-1">{diagnostics.isSinkIdSupported ? 'Supported' : 'OS Fallback'}</p>
          <span className="text-xs text-muted-foreground">
            {diagnostics.isSinkIdSupported ? 'Direct Device Addressing' : 'Safari / OS Default Fallback'}
          </span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <span className="text-xs text-muted-foreground uppercase font-mono">Media Session API</span>
          <p className="text-xl font-bold mt-1">{diagnostics.hasMediaSession ? 'Active' : 'Disabled'}</p>
          <span className="text-xs text-muted-foreground">Earbud Button Hooks</span>
        </div>
      </section>

      {/* Device selection + VU meter */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center justify-between">
            <span>Earphone / Output Sink</span>
            <span className="text-xs text-muted-foreground font-normal">Zoe's Voice Route</span>
          </h2>
          <div>
            <label htmlFor="zoe-output" className="block text-xs text-muted-foreground mb-2">
              Target Audio Output
            </label>
            <select
              id="zoe-output"
              value={activeOutput}
              onChange={(e) => void switchOutput(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {devices.outputs.length === 0 && <option value="default">System default</option>}
              {devices.outputs.map((dev) => (
                <option key={dev.deviceId} value={dev.deviceId}>
                  {dev.label} {dev.isDefault ? '(System Default)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="pt-4 flex items-center justify-between border-t border-border">
            <span className="text-xs text-muted-foreground">Validate earpiece routing:</span>
            <button
              onClick={runSoundTest}
              disabled={testPlaying}
              className="px-4 py-1.5 bg-foreground text-background disabled:opacity-50 text-xs font-semibold rounded-md transition"
            >
              {testPlaying ? 'Playing Tone...' : 'Play Test Tone'}
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center justify-between">
            <span>Microphone / Input Feed</span>
            <span className="text-xs text-muted-foreground font-normal">Voice Ingestion</span>
          </h2>
          <div>
            <label htmlFor="zoe-input" className="block text-xs text-muted-foreground mb-2">
              Target Audio Input
            </label>
            <select
              id="zoe-input"
              value={activeInput}
              onChange={(e) => void switchInput(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {devices.inputs.length === 0 && <option value="default">System default</option>}
              {devices.inputs.map((dev) => (
                <option key={dev.deviceId} value={dev.deviceId}>
                  {dev.label} {dev.isDefault ? '(System Default)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Mic Gain / Input Sensitivity</span>
              <span className="font-mono">{audioLevel}%</span>
            </div>
            <div className="w-full h-3 bg-background rounded-full overflow-hidden border border-border p-0.5">
              <div
                className="h-full rounded-full bg-foreground transition-all duration-75"
                style={{ width: `${audioLevel}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Supported headsets */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Best supported headsets (top 5)</h2>
          <p className="text-sm text-muted-foreground">
            Any Bluetooth headset works. These five give the smoothest one-to-one talk with Zoe.
          </p>
        </div>
        <ol className="space-y-3">
          {SUPPORTED_HEADSETS.map((h) => (
            <li key={h.rank} className="p-4 bg-background border border-border rounded-lg">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-muted-foreground">#{h.rank}</span>
                <strong className="text-sm">{h.name}</strong>
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-mono">{h.bt}</p>
              <p className="text-sm text-muted-foreground mt-1">{h.why}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Command map */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Zoe Voice Commands &amp; Interaction Map</h2>
          <p className="text-sm text-muted-foreground">
            All commands run through the bidirectional neural pipeline. You can speak naturally without waiting for cues.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-background border border-border rounded-lg space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Navigation &amp; Search
            </span>
            <ul className="text-sm space-y-1.5 text-muted-foreground">
              <li><strong className="text-foreground">"Zoe, find..."</strong> — Global semantic search</li>
              <li><strong className="text-foreground">"Open my cards"</strong> — Switches to Growth view</li>
              <li><strong className="text-foreground">"Go home"</strong> — Navigates to central hub</li>
            </ul>
          </div>
          <div className="p-4 bg-background border border-border rounded-lg space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Audio Control &amp; Arbiter
            </span>
            <ul className="text-sm space-y-1.5 text-muted-foreground">
              <li><strong className="text-foreground">"Stop listening"</strong> — Suspends mic buffer</li>
              <li><strong className="text-foreground">"Be quiet" / press stem</strong> — Immediate interrupt</li>
              <li><strong className="text-foreground">"Speak faster"</strong> — Adjusts Deepgram rate</li>
            </ul>
          </div>
          <div className="p-4 bg-background border border-border rounded-lg space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Hardware Controls
            </span>
            <ul className="text-sm space-y-1.5 text-muted-foreground">
              <li><strong className="text-foreground">Single tap / click</strong> — Play / pause Zoe speech</li>
              <li><strong className="text-foreground">Double tap</strong> — Interrupt &amp; open prompt</li>
              <li><strong className="text-foreground">Long press</strong> — Force mute audio session</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Diagnostics &amp; Troubleshooting Lessons</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="p-3 bg-background border border-border rounded-md">
            <strong className="text-foreground block mb-1">Tinny sound / narrowband audio drop</strong>
            Classic Bluetooth headsets switch from stereo A2DP (high quality) to SCO/HFP (8–16 kHz mono) whenever the
            microphone is opened. If Zoe sounds tinny while listening, this is normal for older Bluetooth codecs.
            Bluetooth 5.2+ headsets with LE Audio (LC3) keep 32/48 kHz wideband audio during simultaneous capture.
          </div>
          <div className="p-3 bg-background border border-border rounded-md">
            <strong className="text-foreground block mb-1">Background tab &amp; lock-screen listening</strong>
            Browsers halt raw audio capture when tabs are minimised or the screen is locked. For continuous operation in
            your pocket, install M'Mora to the home screen or use the native wrapper.
          </div>
          <div className="p-3 bg-background border border-border rounded-md">
            <strong className="text-foreground block mb-1">Permissions &amp; routing reset</strong>
            If your Bluetooth device is connected but missing from the dropdown, allow the microphone once above, then
            press <em>Rescan Hardware Devices</em>.
          </div>
        </div>
      </section>
    </div>
  );
};

export default ZoeAudioPage;
