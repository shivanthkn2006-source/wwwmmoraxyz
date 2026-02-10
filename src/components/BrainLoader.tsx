// ═══════════════════════════════════════════════════════════════════════════════
// BRAIN LOADER - Hybrid Caching UX Component
// Downloads the 500MB+ AI model AFTER app install (prevents phone freeze)
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { Progress } from "@/components/ui/progress";
import { Brain, Wifi, WifiOff, Check, Download, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Model URLs - matches runtimeCaching rules in vite.config.ts
const BRAIN_MODELS = {
  gemma: 'https://storage.googleapis.com/jmstore/kaggleweb/grader/g2b-it-gpu-int4.bin',
  mediapipe: 'https://storage.googleapis.com/mediapipe-models/llm_inference/gemma_2b_it_gpu_int4/float32/latest/gemma_2b_it_gpu_int4.bin',
};

const BRAIN_CACHE_NAME = 'zoe-brain-v1';

export type BrainStatus = 'checking' | 'downloading' | 'ready' | 'offline-ready' | 'error' | 'not-supported';

interface BrainLoaderProps {
  onReady?: () => void;
  onError?: (error: string) => void;
  autoDownload?: boolean;
  showUI?: boolean;
  className?: string;
}

export function BrainLoader({ 
  onReady, 
  onError, 
  autoDownload = false, 
  showUI = true,
  className 
}: BrainLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<BrainStatus>('checking');
  const [statusText, setStatusText] = useState("Checking neural pathways...");
  const [downloadedMB, setDownloadedMB] = useState(0);
  const [totalMB, setTotalMB] = useState(0);

  // Check if brain is already cached
  const checkBrainCache = useCallback(async (): Promise<boolean> => {
    try {
      if (!('caches' in window)) {
        console.log('[BrainLoader] Cache API not supported');
        return false;
      }

      const cache = await caches.open(BRAIN_CACHE_NAME);
      
      // Check for any cached model
      for (const modelUrl of Object.values(BRAIN_MODELS)) {
        const existing = await cache.match(modelUrl);
        if (existing) {
          console.log('[BrainLoader] ✅ Brain found in cache:', modelUrl);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.warn('[BrainLoader] Cache check failed:', error);
      return false;
    }
  }, []);

  // Download brain model with progress tracking
  const downloadBrain = useCallback(async () => {
    setStatus('downloading');
    setStatusText("Downloading Neural Pathways (This happens once)...");
    
    try {
      // Use the MediaPipe model URL
      const modelUrl = BRAIN_MODELS.mediapipe;
      
      const response = await fetch(modelUrl, {
        method: 'GET',
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      setTotalMB(Math.round(total / (1024 * 1024)));

      if (!response.body) {
        // Fallback for browsers without streaming
        const blob = await response.blob();
        const cache = await caches.open(BRAIN_CACHE_NAME);
        await cache.put(modelUrl, new Response(blob));
        setProgress(100);
        setStatus('ready');
        setStatusText("Brain Installed ✓");
        onReady?.();
        return;
      }

      // Stream download with progress
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        const progressPercent = total > 0 ? Math.round((receivedLength / total) * 100) : 0;
        setProgress(progressPercent);
        setDownloadedMB(Math.round(receivedLength / (1024 * 1024)));
      }

      // Combine chunks and cache
      const blob = new Blob(chunks as BlobPart[]);
      const cache = await caches.open(BRAIN_CACHE_NAME);
      await cache.put(modelUrl, new Response(blob));

      setProgress(100);
      setStatus('ready');
      setStatusText("Brain Installed ✓");
      console.log('[BrainLoader] ✅ Brain model cached successfully');
      onReady?.();

    } catch (error) {
      console.error('[BrainLoader] Download failed:', error);
      setStatus('error');
      setStatusText("Download failed. Check WiFi connection.");
      onError?.(error instanceof Error ? error.message : 'Download failed');
    }
  }, [onReady, onError]);

  // Initial check
  useEffect(() => {
    const init = async () => {
      // ═══════════════════════════════════════════════════════════════════════
      // DEVICE TIER GATING - Don't attempt brain download on budget devices
      // This prevents 500MB download on devices that can't run WebGPU anyway
      // ═══════════════════════════════════════════════════════════════════════
      
      // Check iOS first (no WebGPU support at all)
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      if (isIOS) {
        setStatus('not-supported');
        setStatusText("Offline Brain uses scripted mode on iOS");
        setProgress(100);
        return;
      }

      // Check device memory (if available)
      const deviceMemory = (navigator as any).deviceMemory;
      if (deviceMemory && deviceMemory < 4) {
        setStatus('not-supported');
        setStatusText("Device memory too low for offline brain");
        setProgress(100);
        return;
      }
      
      // Check WebGPU support
      if (!('gpu' in navigator)) {
        setStatus('not-supported');
        setStatusText("Offline Brain not supported on this device");
        setProgress(100);
        return;
      }

      // Try to get WebGPU adapter
      try {
        const adapter = await (navigator as any).gpu?.requestAdapter();
        if (!adapter) {
          setStatus('not-supported');
          setStatusText("WebGPU adapter not available");
          setProgress(100);
          return;
        }
        
        // Check storage buffer size (minimum 500MB for Gemma)
        const limits = adapter.limits;
        const requiredStorage = 524550144; // ~500MB
        if (limits?.maxStorageBufferBindingSize < requiredStorage) {
          setStatus('not-supported');
          setStatusText("GPU memory insufficient for offline brain");
          setProgress(100);
          return;
        }
      } catch {
        setStatus('not-supported');
        setStatusText("WebGPU not available");
        setProgress(100);
        return;
      }

      const isCached = await checkBrainCache();
      
      if (isCached) {
        setStatus('offline-ready');
        setStatusText("Brain Ready (Offline Mode)");
        setProgress(100);
        onReady?.();
        return;
      }

      // Not cached - check if online
      if (!navigator.onLine) {
        setStatus('error');
        setStatusText("Connect to WiFi to download brain");
        return;
      }

      // Auto-download if enabled
      if (autoDownload) {
        await downloadBrain();
      } else {
        setStatus('checking');
        setStatusText("Brain not installed. Tap to download.");
        setProgress(0);
      }
    };

    init();
  }, [checkBrainCache, downloadBrain, autoDownload, onReady]);

  // Don't render if UI is hidden or brain is ready
  if (!showUI || status === 'offline-ready' || status === 'ready') {
    return null;
  }

  // Only possible states after early return: checking, downloading, error, not-supported
  const StatusIcon = {
    checking: Brain,
    downloading: Download,
    error: AlertCircle,
    'not-supported': AlertCircle,
  }[status] || Brain;

  return (
    <div className={cn(
      "fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80",
      "bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl p-4",
      "shadow-lg z-50",
      className
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          "p-2 rounded-lg",
          status === 'downloading' && "bg-primary/20 animate-pulse",
          status === 'error' && "bg-destructive/20",
          status === 'not-supported' && "bg-muted",
          status === 'checking' && "bg-primary/10"
        )}>
          <StatusIcon className={cn(
            "w-5 h-5",
            status === 'downloading' && "text-primary animate-bounce",
            status === 'error' && "text-destructive",
            status === 'checking' && "text-muted-foreground"
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{statusText}</p>
          {status === 'downloading' && totalMB > 0 && (
            <p className="text-xs text-muted-foreground">
              {downloadedMB} MB / {totalMB} MB
            </p>
          )}
        </div>
        {navigator.onLine ? (
          <Wifi className="w-4 h-4 text-primary flex-shrink-0" />
        ) : (
          <WifiOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </div>

      {status === 'downloading' && (
        <Progress value={progress} className="h-2" />
      )}

      {status === 'checking' && !autoDownload && navigator.onLine && (
        <button
          onClick={downloadBrain}
          className="w-full mt-2 py-2 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Download Offline Brain (~500MB)
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useBrainStatus - Check brain cache status programmatically
// ═══════════════════════════════════════════════════════════════════════════════

export function useBrainStatus(): { status: BrainStatus; isReady: boolean } {
  const [status, setStatus] = useState<BrainStatus>('checking');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (!('caches' in window)) {
        setStatus('not-supported');
        return;
      }

      try {
        const cache = await caches.open(BRAIN_CACHE_NAME);
        for (const modelUrl of Object.values(BRAIN_MODELS)) {
          const existing = await cache.match(modelUrl);
          if (existing) {
            setStatus('offline-ready');
            setIsReady(true);
            return;
          }
        }
        setStatus('checking');
      } catch {
        setStatus('error');
      }
    };

    checkStatus();
  }, []);

  return { status, isReady };
}

export default BrainLoader;
