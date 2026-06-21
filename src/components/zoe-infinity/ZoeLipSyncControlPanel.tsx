/**
 * ZOE LIP-SYNC CONTROL PANEL
 * ===========================
 * Floating, in-app controls for the 3D GLB lip-sync engine.
 * Non-destructive: lives alongside ZoeAvatarViewer; reads/writes only
 * the isolated zoeLipSyncSettings store. Default OFF.
 *
 * Features:
 *  • Toggle 3D lip-sync (replaces console flag)
 *  • Sensitivity / smoothing / threshold sliders (persisted)
 *  • Audio source switch (Deepgram TTS ↔ uploaded audio file)
 *  • Live debug HUD: amplitude, jaw, centroid, active viseme, source
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, X, Upload, Play, Pause, Activity, CheckCircle2, XCircle, Loader2, Zap } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  getLipSyncSettings,
  setLipSyncSettings,
  subscribeLipSyncDebug,
  setLipSyncFileAudio,
  LIPSYNC_DEFAULTS,
  type ZoeLipSyncSettings,
  type LipSyncDebugFrame,
} from '@/stores/zoeLipSyncSettings';
import { runLipSyncSelfTest, type LipSyncSelfTestResult } from './lipSyncSelfTest';
import { QuotaAdminPanel } from './quota/QuotaAdminPanel';
import {
  getActivePreset,
  getActiveAvatarId,
  setActiveAvatarId,
  updateActivePreset,
  resetActivePreset,
  listAvatarIds,
  BUILTIN_PRESETS,
  type LipSyncPreset,
} from '@/stores/zoeLipSyncPresets';

export default function ZoeLipSyncControlPanel() {
  const [open, setOpen] = useState(false);
  const [settings, setSettingsLocal] = useState<ZoeLipSyncSettings>(getLipSyncSettings());
  const [debug, setDebug] = useState<LipSyncDebugFrame>({ amp: 0, jaw: 0, centroid: 0, viseme: 'sil', source: 'idle' });
  const [filePlaying, setFilePlaying] = useState(false);
  const audioRef = useRef<HTMLMediaElement | null>(null);
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<LipSyncSelfTestResult | null>(null);
  const [activeAvatarId, setActiveAvatarIdLocal] = useState<string>(getActiveAvatarId());
  const [preset, setPresetLocal] = useState<LipSyncPreset>(getActivePreset());
  const [presetExpanded, setPresetExpanded] = useState(false);

  const switchAvatar = (id: string) => {
    const next = setActiveAvatarId(id);
    setActiveAvatarIdLocal(id);
    setPresetLocal(next);
  };
  const patchSilence = (patch: Partial<LipSyncPreset['silence']>) => {
    const next = updateActivePreset({ silence: patch });
    setPresetLocal(next);
  };
  const patchMapping = (patch: Partial<LipSyncPreset['mapping']>) => {
    const next = updateActivePreset({ mapping: patch });
    setPresetLocal(next);
  };
  const handleResetPreset = () => {
    const next = resetActivePreset();
    setPresetLocal(next);
  };

  const avatarIds = listAvatarIds();

  const handleSelfTest = async () => {
    setTestRunning(true);
    setTestResult(null);
    try {
      const result = await runLipSyncSelfTest();
      setTestResult(result);
    } catch (err) {
      setTestResult({
        passed: false,
        reason: (err as Error)?.message ?? 'Self-test crashed',
        samples: 0, peakJaw: 0, jawDelta: 0, framesAboveThreshold: 0, durationMs: 0,
      });
    } finally {
      setTestRunning(false);
    }
  };

  // Peak-hold meters (decay over time so user sees transient peaks)
  const [peakAmp, setPeakAmp] = useState(0);
  const [peakJaw, setPeakJaw] = useState(0);
  const peakAmpRef = useRef(0);
  const peakJawRef = useRef(0);
  const lastFrameRef = useRef<LipSyncDebugFrame>({ amp: 0, jaw: 0, centroid: 0, viseme: 'sil', source: 'idle' });

  useEffect(() => {
    const unsub = subscribeLipSyncDebug((f) => {
      lastFrameRef.current = f;
      setDebug(f);
      if (f.amp > peakAmpRef.current) peakAmpRef.current = f.amp;
      if (f.jaw > peakJawRef.current) peakJawRef.current = f.jaw;
    });
    // Smooth peak decay loop @ ~30fps so meters feel alive
    let raf = 0;
    const decay = () => {
      peakAmpRef.current = Math.max(lastFrameRef.current.amp, peakAmpRef.current * 0.94);
      peakJawRef.current = Math.max(lastFrameRef.current.jaw, peakJawRef.current * 0.94);
      setPeakAmp(peakAmpRef.current);
      setPeakJaw(peakJawRef.current);
      raf = requestAnimationFrame(decay);
    };
    raf = requestAnimationFrame(decay);
    return () => { unsub(); cancelAnimationFrame(raf); };
  }, []);

  const update = (patch: Partial<ZoeLipSyncSettings>) => {
    const next = setLipSyncSettings(patch);
    setSettingsLocal(next);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (audioRef.current) {
      audioRef.current.pause();
      try { URL.revokeObjectURL(audioRef.current.src); } catch { /* noop */ }
    }
    const url = URL.createObjectURL(file);
    const audio: HTMLMediaElement = file.type.startsWith('video/') ? document.createElement('video') : new Audio();
    audio.src = url;
    try { audio.crossOrigin = 'anonymous'; } catch { /* noop */ }
    audio.loop = false;
    audio.onended = () => { setFilePlaying(false); };
    audio.onpause = () => { setFilePlaying(false); };
    audio.onplaying = () => {
      setFilePlaying(true);
      setLipSyncFileAudio(audio);
    };
    audioRef.current = audio;
    update({ source: 'file' });
    audio.play().catch((err) => console.warn('[LipSync] file play failed', err));
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  return (
    <>
      {/* Floating gear button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed top-4 right-4 z-[60] w-9 h-9 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/60 border border-white/20 text-white/80 backdrop-blur-sm transition-colors"
        aria-label="Lip-sync controls"
        title="Lip-sync controls"
      >
        <Settings2 className="w-4 h-4" />
      </button>

      {/* Live debug HUD overlay (independent of panel) */}
      {settings.debugOverlay && settings.enabled && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[55] pointer-events-none rounded-md border border-white/30 bg-black/60 backdrop-blur px-3 py-1.5 text-[10px] font-mono text-white/90 shadow-[0_0_18px_rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-3">
            <Activity className="w-3 h-3 text-white/80" />
            <span>src:{debug.source}</span>
            <span>amp:{debug.amp.toFixed(2)}</span>
            <span>jaw:{debug.jaw.toFixed(2)}</span>
            <span>cen:{debug.centroid.toFixed(2)}</span>
            <span className="text-white">viseme:{debug.viseme}</span>
          </div>
          <div className="mt-1 h-1 w-full bg-white/10 rounded overflow-hidden">
            <div className="h-full bg-white transition-[width] duration-75" style={{ width: `${Math.min(100, debug.jaw * 100)}%` }} />
          </div>
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 right-4 z-[60] w-[300px] max-w-[92vw] max-h-[calc(100vh-5rem)] flex flex-col rounded-2xl border border-white/15 bg-black/70 backdrop-blur-xl text-white shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10 shrink-0">
              <h3 className="text-sm font-semibold tracking-wide">Lip-Sync Studio</h3>
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 [scrollbar-width:thin]">

            {/* Master toggle */}
            <div className="flex items-center justify-between py-2 border-b border-white/10">
              <div>
                <div className="text-xs font-medium">3D Lip-Sync</div>
                <div className="text-[10px] text-white/50">Real GLB head with visemes</div>
              </div>
              <Switch checked={settings.enabled} onCheckedChange={(v) => update({ enabled: v })} />
            </div>

            {/* Source */}
            <div className="py-3 border-b border-white/10">
              <div className="text-xs font-medium mb-2">Audio Source</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`text-[11px] py-1.5 rounded-md border transition-colors ${settings.source === 'tts' ? 'bg-white/15 border-white/50 text-white' : 'border-white/15 text-white/60 hover:bg-white/5'}`}
                  onClick={() => update({ source: 'tts' })}
                >Zoe TTS</button>
                <button
                  className={`text-[11px] py-1.5 rounded-md border transition-colors ${settings.source === 'file' ? 'bg-white/15 border-white/50 text-white' : 'border-white/15 text-white/60 hover:bg-white/5'}`}
                  onClick={() => update({ source: 'file' })}
                >Audio File</button>
              </div>

              {settings.source === 'file' && (
                <div className="mt-2 flex items-center gap-2">
                  <label className="flex-1 cursor-pointer text-[11px] flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-white/15 hover:bg-white/5">
                    <Upload className="w-3 h-3" />
                    <span>{audioRef.current ? 'Change file' : 'Upload audio'}</span>
                    <input type="file" accept="audio/*,video/mp4,video/quicktime,video/*" className="hidden" onChange={handleFile} />
                  </label>
                  {audioRef.current && (
                    <button onClick={togglePlay} className="w-8 h-8 rounded-md border border-white/15 flex items-center justify-center hover:bg-white/5">
                      {filePlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Real-time level meters */}
            <div className="py-3 border-b border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium">Live Levels</div>
                <span className={`text-[10px] font-mono ${debug.source === 'idle' ? 'text-white/40' : 'text-white'}`}>
                  {debug.source === 'idle' ? '— silent —' : debug.source.toUpperCase()}
                </span>
              </div>
              <LevelMeter label="AMP" value={debug.amp} peak={peakAmp} />
              <LevelMeter label="JAW" value={debug.jaw} peak={peakJaw} />
              <div className="flex justify-between text-[10px] font-mono text-white/50 mt-1">
                <span>viseme: <span className="text-white">{debug.viseme}</span></span>
                <span>cen: {debug.centroid.toFixed(2)}</span>
              </div>
            </div>

            {/* Sliders */}
            <SliderRow label="Sensitivity" value={settings.sensitivity} min={0.5} max={3} step={0.05}
              onChange={(v) => update({ sensitivity: v })} />
            <SliderRow label="Smoothing (attack)" value={settings.smoothing} min={0.05} max={0.6} step={0.01}
              onChange={(v) => update({ smoothing: v })} />
            <SliderRow label="Silence threshold" value={settings.threshold} min={0} max={0.3} step={0.01}
              onChange={(v) => update({ threshold: v })} />

            {/* Debug overlay */}
            <div className="flex items-center justify-between py-2 border-t border-white/10 mt-2">
              <div>
                <div className="text-xs font-medium">Debug overlay</div>
                <div className="text-[10px] text-white/50">Live amp / jaw / viseme HUD</div>
              </div>
              <Switch checked={settings.debugOverlay} onCheckedChange={(v) => update({ debugOverlay: v })} />
            </div>

            {/* Per-avatar preset */}
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium">Avatar preset</div>
                <button
                  onClick={() => setPresetExpanded((v) => !v)}
                  className="text-[10px] text-white/60 hover:text-white"
                >
                  {presetExpanded ? 'Hide tuners' : 'Tune…'}
                </button>
              </div>
              <select
                value={activeAvatarId}
                onChange={(e) => switchAvatar(e.target.value)}
                className="w-full text-[11px] py-1.5 px-2 rounded-md bg-white/5 border border-white/15 text-white"
              >
                {avatarIds.map((id) => {
                  const label = BUILTIN_PRESETS[id]?.label ?? id;
                  return <option key={id} value={id} className="bg-black">{label}</option>;
                })}
              </select>
              <div className="text-[10px] text-white/50 mt-1">{preset.description}</div>

              {presetExpanded && (
                <div className="mt-2 space-y-1">
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mt-2">Silence pose</div>
                  <SliderRow label="Silence jaw open" value={preset.silence.jawOpen} min={0} max={0.1} step={0.002}
                    onChange={(v) => patchSilence({ jawOpen: v })} />
                  <SliderRow label="Silence mouth open" value={preset.silence.mouthOpen} min={0} max={0.1} step={0.002}
                    onChange={(v) => patchSilence({ mouthOpen: v })} />
                  <SliderRow label="Breath gain" value={preset.silence.breathGain} min={0} max={0.05} step={0.001}
                    onChange={(v) => patchSilence({ breathGain: v })} />
                  <SliderRow label="viseme_sil weight" value={preset.silence.visemeSilWeight} min={0} max={0.5} step={0.01}
                    onChange={(v) => patchSilence({ visemeSilWeight: v })} />
                  <SliderRow label="mouthClose cap" value={preset.silence.mouthCloseCap} min={0} max={1} step={0.01}
                    onChange={(v) => patchSilence({ mouthCloseCap: v })} />

                  <div className="text-[10px] uppercase tracking-wider text-white/40 mt-2">Morph mapping</div>
                  <SliderRow label="jawOpen gain" value={preset.mapping.jawOpenGain} min={0.4} max={1.5} step={0.01}
                    onChange={(v) => patchMapping({ jawOpenGain: v })} />
                  <SliderRow label="mouthOpen gain" value={preset.mapping.mouthOpenGain} min={0.4} max={1.5} step={0.01}
                    onChange={(v) => patchMapping({ mouthOpenGain: v })} />
                  <SliderRow label="lowerDown gain" value={preset.mapping.mouthLowerDownGain} min={0} max={1} step={0.01}
                    onChange={(v) => patchMapping({ mouthLowerDownGain: v })} />
                  <SliderRow label="upperUp gain" value={preset.mapping.mouthUpperUpGain} min={0} max={1} step={0.01}
                    onChange={(v) => patchMapping({ mouthUpperUpGain: v })} />
                  <SliderRow label="stretch gain (E/I)" value={preset.mapping.mouthStretchGain} min={0} max={1} step={0.01}
                    onChange={(v) => patchMapping({ mouthStretchGain: v })} />
                  <SliderRow label="pucker gain (O)" value={preset.mapping.mouthPuckerGain} min={0} max={1} step={0.01}
                    onChange={(v) => patchMapping({ mouthPuckerGain: v })} />
                  <SliderRow label="funnel gain (O)" value={preset.mapping.mouthFunnelGain} min={0} max={1} step={0.01}
                    onChange={(v) => patchMapping({ mouthFunnelGain: v })} />
                  <SliderRow label="reset lerp (release)" value={preset.mapping.resetLerp} min={0.3} max={0.95} step={0.01}
                    onChange={(v) => patchMapping({ resetLerp: v })} />

                  <button
                    onClick={handleResetPreset}
                    className="mt-2 w-full text-[10px] py-1.5 rounded-md border border-white/15 text-white/60 hover:bg-white/5"
                  >
                    Reset “{BUILTIN_PRESETS[activeAvatarId]?.label ?? activeAvatarId}” preset
                  </button>
                </div>
              )}
            </div>

            {/* Self-test */}
            <div className="mt-3 pt-3 border-t border-white/10">
              <button
                onClick={handleSelfTest}
                disabled={testRunning}
                className="w-full text-[11px] py-2 rounded-md border border-white/20 bg-white/5 hover:bg-white/10 disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {testRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                <span>{testRunning ? 'Running self-test…' : 'Run lip-sync self-test'}</span>
              </button>
              {testResult && (
                <div className={`mt-2 rounded-md border p-2 text-[10px] font-mono ${testResult.passed ? 'border-emerald-400/40 bg-emerald-400/5 text-emerald-200' : 'border-red-400/40 bg-red-400/5 text-red-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {testResult.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span className="font-semibold">{testResult.passed ? 'PASS' : 'FAIL'}</span>
                    <span className="text-white/60">· {testResult.durationMs.toFixed(0)}ms</span>
                  </div>
                  <div className="text-white/80">{testResult.reason}</div>
                  <div className="mt-1 grid grid-cols-2 gap-x-2 text-white/60">
                    <span>peak jaw: <span className="text-white">{testResult.peakJaw.toFixed(3)}</span></span>
                    <span>Δ jaw: <span className="text-white">{testResult.jawDelta.toFixed(3)}</span></span>
                    <span>frames: <span className="text-white">{testResult.samples}</span></span>
                    <span>active: <span className="text-white">{testResult.framesAboveThreshold}</span></span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => { const next = setLipSyncSettings({ ...LIPSYNC_DEFAULTS, enabled: settings.enabled }); setSettingsLocal(next); }}
              className="mt-2 w-full text-[11px] py-1.5 rounded-md border border-white/15 text-white/60 hover:bg-white/5"
            >
              Reset to defaults
            </button>

            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2 px-0.5">
                Supabase Quota (Admin)
              </div>
              <QuotaAdminPanel />
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SliderRow({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; }) {
  return (
    <div className="py-2">
      <div className="flex justify-between text-[11px] text-white/70 mb-1">
        <span>{label}</span>
        <span className="font-mono text-white">{value.toFixed(2)}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
        className="[&_[data-orientation=horizontal]>span:first-child]:bg-white/20 [&_[role=slider]]:bg-white [&_[role=slider]]:border-white [&_.bg-primary]:bg-white"
      />
    </div>
  );
}

function LevelMeter({ label, value, peak }: { label: string; value: number; peak: number }) {
  const pct = Math.min(100, Math.max(0, value * 100));
  const peakPct = Math.min(100, Math.max(0, peak * 100));
  // Clipping warning when sustained near max
  const hot = pct > 85;
  return (
    <div className="mb-1.5">
      <div className="flex justify-between text-[10px] font-mono text-white/60 mb-0.5">
        <span>{label}</span>
        <span className={hot ? 'text-white' : 'text-white/70'}>{pct.toFixed(0).padStart(3, '0')}%</span>
      </div>
      <div className="relative h-2 w-full bg-white/10 rounded-sm overflow-hidden">
        {/* Live bar */}
        <div
          className={`absolute inset-y-0 left-0 transition-[width] duration-75 ${hot ? 'bg-white' : 'bg-white/80'}`}
          style={{ width: `${pct}%` }}
        />
        {/* Peak hold marker */}
        <div
          className="absolute inset-y-0 w-px bg-white shadow-[0_0_4px_rgba(255,255,255,0.9)]"
          style={{ left: `${peakPct}%` }}
        />
        {/* Tick marks at 25/50/75 */}
        <div className="absolute inset-0 flex justify-between pointer-events-none px-[25%]">
          <div className="w-px h-full bg-black/30" />
          <div className="w-px h-full bg-black/30" />
        </div>
      </div>
    </div>
  );
}
