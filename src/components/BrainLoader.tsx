// ═══════════════════════════════════════════════════════════════════════════════
// BRAIN LOADER - Hybrid Caching UX Component
// Downloads the 500MB+ AI model AFTER app install (prevents phone freeze)
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { Progress } from "@/components/ui/progress";
import { Brain, Wifi, WifiOff, Check, Download, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Model URLs - matches runtimeCaching rules in vite.config.ts (MediaPipe URL deprecated)
const BRAIN_MODELS = {
  gemma: 'https://storage.googleapis.com/jmstore/kaggleweb/grader/g2b-it-gpu-int4.bin',
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
      // Use the Gemma model URL (MediaPipe deprecated)
      const modelUrl = BRAIN_MODELS.gemma;
      
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

  // Compact icon button mode - matches PDF download button style
  if (status === 'downloading') {
    // Show progress overlay only while actively downloading
    return (
      <>
        <button
          className={cn(
            "w-7 h-7 rounded-md flex items-center justify-center bg-white/5 border border-white/10 text-white/40",
            className
          )}
          title={`Downloading brain: ${progress}%`}
          disabled
        >
          <Download className="w-3.5 h-3.5 text-primary animate-bounce" />
        </button>
        <div className="fixed top-14 left-3 z-50 bg-background/95 backdrop-blur-xl border border-border/50 rounded-lg p-3 shadow-lg w-56">
          <div className="flex items-center gap-2 mb-2">
            <Download className="w-4 h-4 text-primary animate-bounce flex-shrink-0" />
            <p className="text-xs font-medium truncate">{statusText}</p>
          </div>
          {totalMB > 0 && (
            <p className="text-[10px] text-muted-foreground mb-1">
              {downloadedMB} MB / {totalMB} MB
            </p>
          )}
          <Progress value={progress} className="h-1.5" />
        </div>
      </>
    );
  }

  // Tiny icon button - same size as the PDF download button
  return (
    <button
      onClick={status === 'checking' && navigator.onLine ? downloadBrain : undefined}
      title={
        status === 'checking' ? 'Download Offline Brain (~500MB)' :
        status === 'error' ? 'Download failed - tap to retry' :
        status === 'not-supported' ? 'Offline brain not supported on this device' :
        'Brain status'
      }
      className={cn(
        "w-7 h-7 rounded-md flex items-center justify-center transition-all",
        "bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30",
        status === 'checking' && navigator.onLine && "cursor-pointer text-white/40 hover:text-white/80",
        status === 'error' && "border-destructive/30 hover:bg-destructive/20 cursor-pointer text-destructive",
        status === 'not-supported' && "opacity-50 cursor-not-allowed text-white/20",
        className
      )}
    >
      {status === 'error' ? (
        <AlertCircle className="w-3.5 h-3.5" />
      ) : (
        <Brain className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useBrainStatus - Check brain cache status programmatically
// ═══════════════════════════════════════════════════════════════════════════════

export function useBrainStatus(): { status: BrainStatus; isReady: boolean } {
  const [status, setStatus] = useState<BrainStatus>('checking');
  const [isReady, setIsReady] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!('caches' in window)) {
      setStatus('not-supported');
      setIsReady(false);
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
      setIsReady(false);
    } catch {
      setStatus('error');
      setIsReady(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();

    const handleBrainUpdated = () => {
      void checkStatus();
    };

    const handleVisibility = () => {
      if (!document.hidden) void checkStatus();
    };

    window.addEventListener('zoe-brain-cache-updated', handleBrainUpdated);
    window.addEventListener('online', handleBrainUpdated);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('zoe-brain-cache-updated', handleBrainUpdated);
      window.removeEventListener('online', handleBrainUpdated);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkStatus]);

  return { status, isReady };
}

export default BrainLoader;
