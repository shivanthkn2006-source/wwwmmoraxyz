// ═══════════════════════════════════════════════════════════════════════════════
// GOD MODE VISION - Draggable PIP Camera preview + AI analysis
// Responsive across 4.1" phones to 16K displays
// FIXED: Uses CSS-based positioning (top-right) so it never overlaps input bar
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { getMediaState, requestCamera } from '@/utils/zoeMediaAccess';
import { X, Eye, Maximize2, Minimize2, RefreshCw, GripVertical, Minus } from 'lucide-react';

type InlineSafeVideoElement = HTMLVideoElement & {
  disablePictureInPicture?: boolean;
  disableRemotePlayback?: boolean;
  webkitDisplayingFullscreen?: boolean;
  webkitExitFullscreen?: () => void;
};

const BLANK_POSTER = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

interface DetectedObject {
  class: string;
  score: number;
  bbox: [number, number, number, number];
}

interface FaceEmotionResult {
  emotion: string;
  intensity: number;
  patterns: string[];
  context: string;
}

interface GodModeVisionProps {
  isActive: boolean;
  onClose: () => void;
  onZoeVisionResponse?: (response: string) => void;
  preferredStream?: MediaStream | null;
  initialContext?: string | null;
  onCameraReadyChange?: (ready: boolean) => void;
  /** Psychologist mode: full-screen camera with face emotion analysis */
  psychologistMode?: boolean;
  onFaceEmotionDetected?: (result: FaceEmotionResult) => void;
}

let cocoModel: any = null;
let tfLoaded = false;

const loadCocoModel = async (): Promise<any> => {
  if (cocoModel) return cocoModel;
  try {
    if (!tfLoaded) {
      const tf = await import('@tensorflow/tfjs');
      await tf.setBackend('webgl');
      await tf.ready();
      tfLoaded = true;
    }
    const cocoSsd = await import('@tensorflow-models/coco-ssd');
    cocoModel = await cocoSsd.load();
    return cocoModel;
  } catch (e) {
    console.warn('[GodMode] COCO-SSD load failed (non-critical):', e);
    return null;
  }
};

function captureFrame(video: HTMLVideoElement, quality = 0.7): string | null {
  try {
    if (!video.videoWidth || !video.videoHeight) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return null;
  }
}

/** Capture current frame and send for re-analysis (called from parent via event) */
export function captureAndAnalyze(videoRef: React.RefObject<HTMLVideoElement>): string | null {
  if (!videoRef.current) return null;
  return captureFrame(videoRef.current);
}

const forceInlineVideoPlayback = (video: InlineSafeVideoElement) => {
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.controls = false;
  video.preload = 'none';
  video.poster = BLANK_POSTER;
  video.setAttribute('muted', 'true');
  video.setAttribute('autoplay', 'true');
  video.setAttribute('playsinline', 'true');
  video.setAttribute('playsInline', 'true');
  video.setAttribute('webkit-playsinline', 'true');
  video.setAttribute('x-webkit-airplay', 'deny');
  video.setAttribute('disablePictureInPicture', 'true');
  video.setAttribute('disableRemotePlayback', 'true');
  video.setAttribute('controlsList', 'nofullscreen nodownload noremoteplayback');
  video.disablePictureInPicture = true;
  if ('disableRemotePlayback' in video) video.disableRemotePlayback = true;
};

const attachFullscreenGuards = (video: InlineSafeVideoElement) => {
  const handleFullscreenAttempt = () => {
    try {
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
      }
    } catch {
      // ignore
    }

    try {
      if (video.webkitDisplayingFullscreen && typeof video.webkitExitFullscreen === 'function') {
        video.webkitExitFullscreen();
      }
    } catch {
      // ignore
    }
  };

  video.addEventListener('webkitbeginfullscreen', handleFullscreenAttempt as EventListener);
  document.addEventListener('fullscreenchange', handleFullscreenAttempt);

  return () => {
    video.removeEventListener('webkitbeginfullscreen', handleFullscreenAttempt as EventListener);
    document.removeEventListener('fullscreenchange', handleFullscreenAttempt);
  };
};

export const GodModeVision: React.FC<GodModeVisionProps> = ({
  isActive,
  onClose,
  onZoeVisionResponse,
  preferredStream,
  initialContext,
  onCameraReadyChange,
  psychologistMode = false,
  onFaceEmotionDetected,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const streamSourceRef = useRef<'preferred' | 'zoe' | 'local' | null>(null);
  const animationRef = useRef<number | null>(null);
  const visionSentRef = useRef(false);
  const mountedRef = useRef(true);
  const initialContextRef = useRef<string | null>(initialContext ?? null);

  const [isLoading, setIsLoading] = useState(true);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [visionStatus, setVisionStatus] = useState<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  const [visionSummary, setVisionSummary] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceEmotion, setFaceEmotion] = useState<FaceEmotionResult | null>(null);
  const faceAnalysisTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Dragging via touch/mouse
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [pipPos, setPipPos] = useState<{ right: number; top: number }>({ right: 8, top: 60 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initialContextRef.current = initialContext ?? null;
  }, [initialContext]);

  // Responsive PIP sizing
  const getPipSize = useCallback(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
    if (isMinimized) {
      return { w: vw < 400 ? 56 : 60, h: vw < 400 ? 56 : 60 };
    }
    if (isExpanded) {
      const w = Math.min(vw - 24, 340);
      return { w, h: Math.round(w * 0.75) };
    }
    if (vw < 400) return { w: 130, h: 98 };
    if (vw < 768) return { w: 150, h: 112 };
    return { w: 200, h: 150 };
  }, [isExpanded, isMinimized]);

  useEffect(() => {
    if (!isActive) return;

    const clampPosition = () => {
      const { w, h } = getPipSize();
      setPipPos(prev => {
        const maxRight = Math.max(8, window.innerWidth - w - 8);
        const maxTop = Math.max(8, window.innerHeight - h - 8);
        const next = {
          right: Math.max(8, Math.min(prev.right, maxRight)),
          top: Math.max(8, Math.min(prev.top, maxTop)),
        };

        return next.right === prev.right && next.top === prev.top ? prev : next;
      });
    };

    clampPosition();
    window.addEventListener('resize', clampPosition);
    window.addEventListener('orientationchange', clampPosition);

    return () => {
      window.removeEventListener('resize', clampPosition);
      window.removeEventListener('orientationchange', clampPosition);
    };
  }, [getPipSize, isActive]);

  // Drag handlers (pointer events for cross-device)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const { w, h } = getPipSize();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const padding = 8;
    const newLeft = e.clientX - dragOffset.x;
    const newTop = e.clientY - dragOffset.y;
    // Convert to right-based positioning, clamped
    const right = Math.max(padding, Math.min(vw - w - padding, vw - newLeft - w));
    const top = Math.max(padding, Math.min(vh - h - padding, newTop));
    setPipPos({ right, top });
  }, [isDragging, dragOffset, getPipSize]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const requestVisionAnalysis = useCallback(async (frame: string, context?: string): Promise<string> => {
    const ctx = context || 'The user activated vision mode and wants Zoe to see them. Describe what you see warmly and personally.';
    try {
      const { data, error } = await supabase.functions.invoke('zoe-omega-vision', {
        body: { image: frame, context: ctx },
      });
      if (error) throw error;
      const analysis = typeof data?.analysis === 'string' ? data.analysis.trim() : '';
      if (analysis) return analysis;
      throw new Error('Empty');
    } catch {
      const { data, error } = await supabase.functions.invoke('zoe-perception', {
        body: { media_type: 'image', media_data: frame, context: ctx, cross_reference: false },
      });
      if (error) throw error;
      return [data?.zoe_response, data?.analysis?.summary, data?.analysis?.context]
        .find((v): v is string => typeof v === 'string' && v.trim().length > 0) || 'Vision unavailable';
    }
  }, []);

  const sendFrameToZoe = useCallback(async (context?: string) => {
    if (!videoRef.current || visionStatus === 'analyzing') return;
    const frame = captureFrame(videoRef.current);
    if (!frame) {
      setTimeout(() => { if (mountedRef.current) sendFrameToZoe(context); }, 500);
      return;
    }
    visionSentRef.current = true;
    setVisionStatus('analyzing');
    try {
      const analysis = await requestVisionAnalysis(frame, context);
      if (!mountedRef.current) return;
      setVisionSummary(analysis);
      setVisionStatus('done');
      onZoeVisionResponse?.(analysis);
      window.dispatchEvent(new CustomEvent('zoe-chat-vision-first-analysis', { detail: { analysis } }));
    } catch {
      if (!mountedRef.current) return;
      visionSentRef.current = false;
      setVisionStatus('error');
      setVisionSummary('My vision flickered... Try the retry button.');
    }
  }, [onZoeVisionResponse, requestVisionAnalysis, visionStatus]);

  const sendFrameRef = useRef(sendFrameToZoe);
  sendFrameRef.current = sendFrameToZoe;

  // Listen for re-analyze requests from chat (e.g. "what's in my hand")
  useEffect(() => {
    if (!isActive) return;
    const handleReAnalyze = (e: CustomEvent) => {
      const ctx = e.detail?.context || undefined;
      visionSentRef.current = false;
      setVisionStatus('idle');
      setVisionSummary(null);
      sendFrameRef.current(ctx);
    };
    window.addEventListener('zoe-vision-reanalyze', handleReAnalyze as EventListener);
    return () => window.removeEventListener('zoe-vision-reanalyze', handleReAnalyze as EventListener);
  }, [isActive]);

  // Psychologist mode: periodic face emotion analysis
  useEffect(() => {
    if (!isActive || !psychologistMode || !cameraReady) return;
    
    const analyzeFace = async () => {
      if (!videoRef.current) return;
      const frame = captureFrame(videoRef.current);
      if (!frame) return;
      try {
        const { data, error } = await supabase.functions.invoke('analyze-face-emotion', {
          body: { image: frame, analysisType: 'face' },
        });
        if (error || !data?.success) return;
        const result = data.analysis as FaceEmotionResult;
        setFaceEmotion(result);
        onFaceEmotionDetected?.(result);
        console.log('[GodMode:Psychologist] 🧠 Face emotion:', result.emotion, result.intensity);
      } catch (e) {
        console.warn('[GodMode:Psychologist] Face analysis failed:', e);
      }
    };

    // Initial analysis after 1.5s, then every 8s
    const initialTimer = setTimeout(analyzeFace, 1500);
    faceAnalysisTimerRef.current = setInterval(analyzeFace, 8000);

    return () => {
      clearTimeout(initialTimer);
      if (faceAnalysisTimerRef.current) clearInterval(faceAnalysisTimerRef.current);
    };
  }, [isActive, psychologistMode, cameraReady, onFaceEmotionDetected]);

  const handleRetry = useCallback(() => {
    visionSentRef.current = false;
    setVisionStatus('idle');
    setVisionSummary(null);
    sendFrameRef.current();
  }, []);

  // Start camera
  useEffect(() => {
    if (!isActive) return;
    mountedRef.current = true;
    visionSentRef.current = false;
    setVisionStatus('idle');
    setVisionSummary(null);
    setCameraError(null);
    setIsMinimized(false);
    setCameraReady(false);
    onCameraReadyChange?.(false);
    setIsLoading(true);
    setPipPos({ right: 8, top: 60 });

    let detachVideoGuards: (() => void) | null = null;

    const start = async () => {
      try {
        let stream: MediaStream | null = null;

        if (preferredStream?.active) {
          stream = preferredStream;
          streamSourceRef.current = 'preferred';
        }

        if (!stream) {
          const cachedStream = getMediaState().cameraStream;
          if (cachedStream?.active) {
            stream = cachedStream;
            streamSourceRef.current = 'zoe';
          }
        }

        if (!stream) {
          const cameraResult = await requestCamera(false, 'user');
          if (cameraResult.granted && cameraResult.stream) {
            stream = cameraResult.stream;
            streamSourceRef.current = 'zoe';
          }
        }

        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          });
          streamSourceRef.current = 'local';
        }

        if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) throw new Error('Video element not available');

        video.srcObject = stream;
        forceInlineVideoPlayback(video as InlineSafeVideoElement);
        detachVideoGuards = attachFullscreenGuards(video as InlineSafeVideoElement);

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Camera timeout')), 5000);
          const check = () => { if (video.readyState >= 2 && video.videoWidth > 0) { clearTimeout(timeout); resolve(); } };
          video.addEventListener('loadeddata', check, { once: true });
          video.addEventListener('canplay', check, { once: true });
          video.play().then(check).catch(() => {});
        });

        if (!mountedRef.current) return;
        setIsLoading(false);
        setCameraReady(true);
        onCameraReadyChange?.(true);
        window.dispatchEvent(new CustomEvent('zoe-god-eye-activated', { detail: { psychologistMode } }));

        if (!psychologistMode) {
          setTimeout(() => {
            if (mountedRef.current && !visionSentRef.current) {
              sendFrameRef.current(initialContextRef.current || undefined);
            }
          }, 800);
        }

        loadCocoModel().then((model) => {
          if (!mountedRef.current || !model) return;
          const detectLoop = async () => {
            if (!mountedRef.current || !videoRef.current || !model) return;
            try {
              const predictions = await model.detect(videoRef.current);
              if (mountedRef.current) setDetectedObjects(predictions.map((p: any) => ({
                class: p.class, score: Math.round(p.score * 100), bbox: p.bbox,
              })));
            } catch {}
            if (mountedRef.current) animationRef.current = requestAnimationFrame(() => setTimeout(detectLoop, 300));
          };
          detectLoop();
        });
      } catch (e: any) {
        if (!mountedRef.current) return;
        setIsLoading(false);
        setCameraReady(false);
        onCameraReadyChange?.(false);
        setCameraError(
          e.name === 'NotAllowedError' ? 'Camera permission denied.' :
          e.name === 'NotFoundError' ? 'No camera found.' :
          `Camera error: ${e.message || 'unknown'}`
        );
      }
    };
    start();

    return () => {
      mountedRef.current = false;
      onCameraReadyChange?.(false);
      window.dispatchEvent(new CustomEvent('zoe-god-eye-deactivated'));
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      detachVideoGuards?.();
      if (streamRef.current && streamSourceRef.current === 'local') {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      streamRef.current = null;
      streamSourceRef.current = null;
      setDetectedObjects([]);
    };
  }, [isActive, onCameraReadyChange, preferredStream]);

  // Draw bounding boxes
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current || detectedObjects.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = videoRef.current.videoWidth || 640;
    const h = videoRef.current.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    detectedObjects.forEach(obj => {
      const [x, y, width, height] = obj.bbox;
      const mx = w - x - width;
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(mx, y, width, height);
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(0, 255, 255, 0.9)';
      ctx.fillText(`${obj.class} ${obj.score}%`, mx + 2, y - 4);
    });
  }, [detectedObjects]);

  if (!isActive) return null;

  const statusDotColor =
    visionStatus === 'analyzing' ? 'bg-amber-400' :
    visionStatus === 'done' ? 'bg-green-400' :
    visionStatus === 'error' ? 'bg-red-400' : 'bg-cyan-400';
  const statusText =
    visionStatus === 'analyzing' ? 'Looking...' :
    visionStatus === 'done' ? 'Zoe sees you ✓' :
    visionStatus === 'error' ? 'Error' :
    cameraReady ? 'Camera Ready' : 'Starting...';

  const { w: pipW, h: pipH } = getPipSize();

  // Psychologist mode: completely hidden camera — NO visible UI
  // Zoe reads the user's face silently via a hidden video element.
  // User stays in normal chat mode with zero memory overhead from rendering.
  if (psychologistMode) {
    return (
      <>
        <video
          ref={videoRef}
          autoPlay playsInline muted preload="none"
          controlsList="nofullscreen nodownload noremoteplayback"
          poster={BLANK_POSTER}
          disablePictureInPicture
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none', overflow: 'hidden' }}
          aria-hidden="true"
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} aria-hidden="true" />
      </>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        key="god-mode-pip"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed z-[90] touch-none select-none"
        style={{
          width: pipW,
          height: pipH,
          right: pipPos.right,
          top: pipPos.top,
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerDown={isMinimized ? handlePointerDown : undefined}
      >
        <div className={`relative w-full h-full overflow-hidden border border-cyan-400/30 shadow-[0_0_20px_rgba(0,255,255,0.15)] bg-black ${isMinimized ? 'rounded-full' : 'rounded-xl'}`}>
          {isMinimized ? (
            <>
              <button
                type="button"
                onClick={() => setIsMinimized(false)}
                className="absolute inset-0 flex items-center justify-center bg-black/85 text-cyan-300"
                aria-label="Restore Zoe Vision"
              >
                <Eye size={22} />
              </button>
              <div className="absolute bottom-1 right-1 z-20">
                <div className={`w-2 h-2 rounded-full ${statusDotColor}`} />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="absolute top-0 right-0 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-black/80 text-white/70"
                aria-label="Close Zoe Vision"
              >
                <X size={10} />
              </button>
            </>
          ) : (
            <>
          {/* Drag handle */}
          <div
            className="absolute top-0 left-0 right-0 h-7 z-30 cursor-grab active:cursor-grabbing flex items-center justify-center touch-none"
            onPointerDown={handlePointerDown}
          >
            <GripVertical className="w-4 h-4 text-white/50" />
          </div>

          {/* Loading */}
          {isLoading && !cameraError && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-2 z-10">
              <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-cyan-300/60 text-[8px] font-mono">Opening camera...</span>
            </div>
          )}

          {/* Error */}
          {cameraError && (
            <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-2 z-10">
              <p className="text-red-400 text-[10px] font-mono text-center">{cameraError}</p>
            </div>
          )}

          {/* Video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            preload="none"
            controlsList="nofullscreen nodownload noremoteplayback"
            poster={BLANK_POSTER}
            disablePictureInPicture
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)', opacity: cameraError ? 0 : 1 }}
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ opacity: cameraError ? 0 : 1 }}
          />

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-1 bg-gradient-to-b from-black/70 to-transparent z-20 pointer-events-none">
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${statusDotColor}`} />
              <span className="text-[9px] font-mono text-cyan-300/80 tracking-wide">{statusText}</span>
            </div>
            <div className="flex items-center gap-1 pointer-events-auto">
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  setIsMinimized(true);
                }}
                className="p-0.5 text-white/50 hover:text-white/90 transition-colors"
                aria-label="Minimize Zoe Vision"
              >
                <Minus size={10} />
              </button>
              <button onClick={() => setIsExpanded(!isExpanded)} className="p-0.5 text-white/50 hover:text-white/90 transition-colors">
                {isExpanded ? <Minimize2 size={10} /> : <Maximize2 size={10} />}
              </button>
              <button onClick={onClose} className="p-0.5 text-white/50 hover:text-red-400 transition-colors">
                <X size={10} />
              </button>
            </div>
          </div>

          {/* Object count */}
          {detectedObjects.length > 0 && (
            <div className="absolute top-7 right-1 z-20">
              <span className="text-[8px] font-mono text-cyan-400/70 bg-black/50 px-1 rounded">{detectedObjects.length} obj</span>
            </div>
          )}

          {/* Analyze button */}
          {cameraReady && !visionSentRef.current && visionStatus === 'idle' && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => sendFrameToZoe()}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[9px] font-mono px-2 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-1 z-20"
            >
              <Eye size={10} /> Let Zoe see
            </motion.button>
          )}

          {/* Retry */}
          {visionStatus === 'error' && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={handleRetry}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-red-500/20 border border-red-400/40 text-red-300 text-[9px] font-mono px-2 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-1 z-20"
            >
              <RefreshCw size={10} /> Retry
            </motion.button>
          )}

          {/* Vision summary */}
          {visionSummary && isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm p-2 z-20"
            >
              <p className="text-cyan-100 text-[9px] leading-tight line-clamp-2">{visionSummary}</p>
            </motion.div>
          )}

          {/* Scan line */}
          {visionStatus === 'analyzing' && (
            <motion.div
              className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent z-10"
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          )}

          <div className="absolute bottom-1 left-1.5 z-10">
            <span className="text-[7px] font-mono text-cyan-400/40 uppercase tracking-widest">Zoe Vision</span>
          </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
