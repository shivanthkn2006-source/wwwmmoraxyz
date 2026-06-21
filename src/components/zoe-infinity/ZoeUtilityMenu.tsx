/**
 * ZOE UTILITY MENU - Single translucent line dropdown for all utility controls
 * Keeps the screen clean by consolidating: PDF, Brain, NPU, Voice Signal, TZ Debug
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Brain, Cpu, Volume2, Clock, Check, AlertCircle, Loader2, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoiceProvider, PROVIDER_INFO } from '@/hooks/useVoiceOrchestrator';
import type { InferenceDiagnosticsData } from '@/components/zoe-infinity/InferenceDiagnosticsBadge';

// Brain download URLs (primary + fallback) — MediaPipe URL deprecated (404)
const BRAIN_MODEL_URLS = [
  'https://storage.googleapis.com/jmstore/kaggleweb/grader/g2b-it-gpu-int4.bin',
];
const BRAIN_CACHE_NAME = 'zoe-brain-v1';

interface ZoeUtilityMenuProps {
  onDownloadPDF: () => void;
  onDownload24hPDF?: () => void;
  isBrainCached: boolean;
  inferenceDiagnostics: InferenceDiagnosticsData | null;
  isProcessing: boolean;
  voiceEnabled: boolean;
  activeEngine: VoiceProvider;
  isSpeaking: boolean;
  isVoiceLoading: boolean;
  latencyMs: number;
  showTZDebug?: boolean;
  onToggleTZDebug?: () => void;
  onTestVoice?: () => void;
  onTestEmotions?: () => void;
}

type BrainDLStatus = 'idle' | 'downloading' | 'done' | 'error' | 'not-supported';
type VRAvatarVariant = 'male' | 'female' | 'party-male';
const VR_AVATAR_SELECTION_KEY = 'zoe_vr_avatar_variant_v1';

export function ZoeUtilityMenu({
  onDownloadPDF,
  onDownload24hPDF,
  isBrainCached,
  inferenceDiagnostics,
  isProcessing,
  voiceEnabled,
  activeEngine,
  isSpeaking,
  isVoiceLoading,
  latencyMs,
  showTZDebug,
  onToggleTZDebug,
  onTestVoice,
  onTestEmotions,
}: ZoeUtilityMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Brain download state (self-contained)
  const [brainStatus, setBrainStatus] = useState<BrainDLStatus>('idle');
  const [brainProgress, setBrainProgress] = useState(0);
  const [vrAvatar, setVRAvatar] = useState<VRAvatarVariant>(() => {
    const stored = localStorage.getItem(VR_AVATAR_SELECTION_KEY) as VRAvatarVariant | null;
    return stored === 'female' || stored === 'party-male' || stored === 'male' ? stored : 'male';
  });


  useEffect(() => {
    if (isBrainCached) {
      setBrainStatus('done');
      setBrainProgress(100);
    }
  }, [isBrainCached]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const switchVRAvatar = useCallback((variant: VRAvatarVariant) => {
    localStorage.setItem(VR_AVATAR_SELECTION_KEY, variant);
    setVRAvatar(variant);
    window.dispatchEvent(new CustomEvent('zoe-vr-avatar-variant-changed', { detail: { variant } }));
  }, []);

  // Brain download handler
  const handleBrainDownload = useCallback(async () => {
    if (brainStatus === 'downloading') return;

    setBrainStatus('downloading');
    setBrainProgress(0);

    try {
      let selectedUrl: string | null = null;
      let response: Response | null = null;

      for (const modelUrl of BRAIN_MODEL_URLS) {
        const attempt = await fetch(modelUrl, { method: 'GET', mode: 'cors' });
        if (attempt.ok) {
          selectedUrl = modelUrl;
          response = attempt;
          break;
        }
      }

      if (!selectedUrl || !response) {
        throw new Error('Download failed: all model URLs returned non-200');
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let blob: Blob;

      if (!response.body) {
        blob = await response.blob();
      } else {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          if (total > 0) setBrainProgress(Math.round((received / total) * 100));
        }

        blob = new Blob(chunks as BlobPart[]);
      }

      const cache = await caches.open(BRAIN_CACHE_NAME);
      await Promise.all(
        BRAIN_MODEL_URLS.map((url) => cache.put(url, new Response(blob.slice(0))))
      );

      setBrainStatus('done');
      setBrainProgress(100);
      window.dispatchEvent(new CustomEvent('zoe-brain-cache-updated'));
      console.log('[ZoeMenu] ✅ Brain cached');
    } catch (err) {
      console.error('[ZoeMenu] Brain download failed:', err);
      setBrainStatus('error');
    }
  }, [brainStatus]);

  const voiceInfo = PROVIDER_INFO[activeEngine];
  const voiceColorMap: Record<string, string> = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
  };

  const npuLabel = inferenceDiagnostics
    ? inferenceDiagnostics.route === 'local' ? 'NPU (Free)'
    : inferenceDiagnostics.route === 'hybrid' ? 'Hybrid'
    : 'Cloud'
    : 'Idle';

  const npuColor = inferenceDiagnostics
    ? inferenceDiagnostics.route === 'local' ? 'text-green-400'
    : inferenceDiagnostics.route === 'hybrid' ? 'text-yellow-400'
    : 'text-cyan-400'
    : 'text-white/40';

  const rowClass = "w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors";
  const iconClass = "w-3 h-3 flex-shrink-0";

  return (
    <div ref={menuRef} className="absolute top-3 left-3 z-50">
      {/* Single line trigger */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-5 h-4 flex items-center justify-center transition-all group"
        title="Tools & Diagnostics"
      >
        <span className={cn(
          "block w-4 h-[1.5px] rounded-full transition-all",
          "bg-white/25 group-hover:bg-white/60",
          isOpen && "bg-white/60"
        )} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onMouseDown={(e) => e.stopPropagation()}
            className={cn(
              "absolute top-6 left-0 min-w-[160px]",
              "bg-black/70 backdrop-blur-2xl rounded-md",
              "shadow-2xl pointer-events-auto"
            )}
          >
            {/* 1. PDF Download */}
            <button
              onClick={() => { onDownloadPDF(); setIsOpen(false); }}
              className={rowClass}
            >
              <Download className={iconClass} />
              <span>Download Chat PDF</span>
            </button>

            {onDownload24hPDF && (
              <button
                onClick={() => { onDownload24hPDF(); setIsOpen(false); }}
                className={rowClass}
              >
                <Clock className={iconClass} />
                <span>Download 24h PDF</span>
              </button>
            )}

            {/* 2. Brain Download */}
            {!isBrainCached && brainStatus !== 'done' && brainStatus !== 'not-supported' && (
              <button
                onClick={handleBrainDownload}
                disabled={brainStatus === 'downloading'}
                className={cn(rowClass, brainStatus === 'downloading' && "cursor-wait")}
              >
                {brainStatus === 'downloading' ? (
                  <Loader2 className={cn(iconClass, "animate-spin text-primary")} />
                ) : brainStatus === 'error' ? (
                  <AlertCircle className={cn(iconClass, "text-red-400")} />
                ) : (
                  <Brain className={iconClass} />
                )}
                <span className="flex-1 text-left">
                  {brainStatus === 'downloading' ? `Brain ${brainProgress}%` :
                   brainStatus === 'error' ? 'Retry Brain' : 'Offline Brain'}
                </span>
                {brainStatus === 'downloading' && (
                  <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${brainProgress}%` }}
                    />
                  </div>
                )}
              </button>
            )}
            {brainStatus === 'done' && (
              <div className={cn(rowClass, "text-green-400")}>
                <Check className={iconClass} />
                <span>Brain Ready ✓</span>
              </div>
            )}

            <div className="border-t border-white/5 my-0.5" />
            <div className="px-2.5 py-1.5">
              <div className="mb-1 flex items-center gap-2 text-[10px] text-white/45">
                <UserRound className={iconClass} />
                <span>VR Avatar</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {([
                  ['male', 'Leon'],
                  ['female', 'Helena'],
                  ['party-male', 'Party'],
                ] as const).map(([variant, label]) => (
                  <button
                    key={variant}
                    onClick={() => switchVRAvatar(variant)}
                    className={cn(
                      "rounded px-1.5 py-1 text-[9px] transition-colors",
                      vrAvatar === variant ? "bg-primary/30 text-primary" : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/5 my-0.5" />

            {/* 3. NPU / Inference Status */}
            <div className={cn("flex items-center gap-2 px-2.5 py-1.5 text-[10px]")}>
              <Cpu className={cn(iconClass, npuColor)} />
              <span className={cn("font-mono", npuColor)}>{npuLabel}</span>
              {inferenceDiagnostics && (
                <span className="text-white/30 ml-auto font-mono">
                  {inferenceDiagnostics.latencyMs}ms
                </span>
              )}
              {isProcessing && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse ml-1" />
              )}
            </div>

            {/* 4. Voice Engine Status */}
            {voiceEnabled && (
              <>
                <div className="flex items-center gap-2 px-2.5 py-1.5 text-[10px]">
                  <Volume2 className={cn(iconClass, voiceColorMap[voiceInfo.color])} />
                  <span className={cn("font-mono", voiceColorMap[voiceInfo.color])}>
                    {voiceInfo.name}
                  </span>
                  {latencyMs > 0 && (
                    <span className="text-white/30 ml-auto font-mono">{latencyMs}ms</span>
                  )}
                  {(isSpeaking || isVoiceLoading) && (
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full ml-1",
                      isSpeaking ? "bg-green-400 animate-pulse" : "bg-yellow-400 animate-pulse"
                    )} />
                  )}
                </div>
                {onTestVoice && (
                  <div className="px-2.5 pb-1.5 flex items-center gap-1">
                    <span className="text-[9px] text-white/35 uppercase tracking-wide">Auto switch</span>
                    <button
                      onClick={onTestVoice}
                      className="px-1.5 py-0.5 text-[9px] rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 ml-auto"
                    >
                      Test
                    </button>
                  </div>
                )}
              </>
            )}

            {/* 5. Emotion Tester */}
            {onTestEmotions && (
              <>
                <div className="border-t border-white/5 my-0.5" />
                <button
                  onClick={() => { onTestEmotions(); setIsOpen(false); }}
                  className={rowClass}
                >
                  <span className="text-[10px] flex-shrink-0">🎭</span>
                  <span>Test Emotions</span>
                </button>
              </>
            )}

            {/* 6. TZ Debug (dev only) */}
            {import.meta.env.DEV && onToggleTZDebug && (
              <>
                <div className="border-t border-white/5 my-0.5" />
                <button
                  onClick={() => { onToggleTZDebug(); setIsOpen(false); }}
                  className={cn(rowClass, "text-white/30")}
                >
                  <Clock className={iconClass} />
                  <span>TZ Debug</span>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ZoeUtilityMenu;
