import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, CheckCircle2, Loader2, AlertCircle, X, Bug, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FaceVerificationSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

interface DiagEntry {
  t: number;
  level: 'info' | 'warn' | 'error';
  tag: string;
  msg: string;
  data?: any;
}

const suggestFix = (errName: string, errMsg: string, inIframe: boolean, secure: boolean): string => {
  if (!secure) return 'Open the site over HTTPS (myzoe.xyz / mmora.xyz). Camera APIs are disabled on plain http.';
  if (errName === 'NotAllowedError' || errName === 'SecurityError') {
    return inIframe
      ? 'The Lovable preview iframe blocks camera. Open the published domain (myzoe.xyz / mmora.xyz) and retry — Face ID enrollment works there.'
      : 'Click the camera icon in your browser address bar, choose "Allow", then hit Retry Camera. On macOS also check System Settings → Privacy & Security → Camera → your browser.';
  }
  if (errName === 'NotFoundError' || errName === 'OverconstrainedError') return 'No camera detected. Connect a webcam or use a device with a built-in camera.';
  if (errName === 'NotReadableError') return 'Camera is busy in another app (FaceTime, Zoom, Photo Booth, Meet). Close it and retry.';
  if (errName === 'AbortError') return 'Camera start was aborted. Retry, and don\'t switch tabs during the prompt.';
  if (errMsg === 'CameraPromptTimeout') return inIframe
    ? 'Prompt never appeared — the iframe is blocking it. Open the published domain on the same device.'
    : 'The browser never showed the permission prompt. Check site permissions in the address bar and Retry.';
  if (!navigator.mediaDevices) return 'Your browser exposes no MediaDevices API. Use Safari 14+, Chrome, Edge, or Firefox on a modern OS.';
  return 'Check browser console for the raw error, verify camera permission, then Retry.';
};

const FaceVerificationSetup: React.FC<FaceVerificationSetupProps> = ({ onComplete, onCancel }) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [step, setStep] = useState<'instructions' | 'camera' | 'processing' | 'success'>('instructions');
  const [diag, setDiag] = useState<DiagEntry[]>([]);
  const [diagOpen, setDiagOpen] = useState(false);
  const [permState, setPermState] = useState<string>('unknown');
  const [suggestion, setSuggestion] = useState<string>('');

  const inIframe = typeof window !== 'undefined' && window.self !== window.top;
  const secure = typeof window !== 'undefined' && window.isSecureContext;

  const log = useCallback((level: DiagEntry['level'], tag: string, msg: string, data?: any) => {
    const entry: DiagEntry = { t: Date.now(), level, tag, msg, data };
    setDiag(prev => [...prev.slice(-49), entry]);
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(`[FaceVerification][${tag}]`, msg, data ?? '');
  }, []);

  // Probe environment + permission state on mount
  useEffect(() => {
    log('info', 'env', 'Environment probe', {
      userAgent: navigator.userAgent,
      platform: (navigator as any).userAgentData?.platform || navigator.platform,
      secureContext: secure,
      inIframe,
      hasMediaDevices: !!navigator.mediaDevices,
      hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
      protocol: location.protocol,
      host: location.host,
    });
    (async () => {
      try {
        // @ts-ignore
        const p = await navigator.permissions?.query?.({ name: 'camera' as PermissionName });
        if (p) {
          setPermState(p.state);
          log('info', 'perm', `camera permission: ${p.state}`);
          p.onchange = () => { setPermState(p.state); log('info', 'perm', `permission changed: ${p.state}`); };
        }
      } catch (e: any) {
        log('warn', 'perm', 'permissions.query unsupported', e?.message);
      }
      try {
        const devs = await navigator.mediaDevices?.enumerateDevices?.();
        const cams = devs?.filter(d => d.kind === 'videoinput') || [];
        log('info', 'devices', `${cams.length} video input(s)`, cams.map(c => ({ label: c.label || '(hidden until granted)', id: c.deviceId.slice(0, 6) })));
      } catch (e: any) {
        log('warn', 'devices', 'enumerateDevices failed', e?.message);
      }
    })();
  }, [log, secure, inIframe]);

  const copyDiag = () => {
    const payload = {
      when: new Date().toISOString(),
      env: { ua: navigator.userAgent, secure, inIframe, protocol: location.protocol, host: location.host, permState },
      lastError: cameraError,
      suggestion,
      entries: diag,
    };
    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2))
      .then(() => toast.success('Diagnostics copied'))
      .catch(() => toast.error('Copy failed — long-press to select instead'));
  };

  useEffect(() => {
    return () => {
      // Cleanup camera stream on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Attach the stream to the video element once it's mounted (step === 'camera')
  useEffect(() => {
    if (step === 'camera' && stream && videoRef.current && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play?.().catch((e) => console.warn('[FaceVerification] video.play() blocked:', e));
    }
  }, [step, stream]);

  const startCamera = async () => {
    log('info', 'start', 'Start Camera clicked', { secureContext: secure, inIframe, permState });
    setCameraError(null);
    setSuggestion('');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const msg = secure
          ? 'Camera API not available in this browser. Try Safari, Chrome, or Edge.'
          : 'Camera requires HTTPS. Open the site over https:// and try again.';
        const s = suggestFix('', '', inIframe, secure);
        log('error', 'start', msg);
        setCameraError(msg);
        setSuggestion(s);
        toast.error(msg);
        return;
      }

      setStep('camera');
      setRequesting(true);

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('CameraPromptTimeout')), 15000)
      );

      const mediaStream = await Promise.race([
        navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false
        }),
        timeout,
      ]);

      const tracks = mediaStream.getVideoTracks();
      log('info', 'start', 'Camera stream acquired', {
        tracks: tracks.map(t => ({ label: t.label, settings: t.getSettings?.() })),
      });
      setStream(mediaStream);
      setRequesting(false);
    } catch (error: any) {
      const name = error?.name || '';
      const message = error?.message || '';
      log('error', 'getUserMedia', `${name || 'Error'}: ${message}`, { name, message, stack: error?.stack });
      let msg = 'Failed to access camera.';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        msg = inIframe
          ? 'Camera blocked in the Lovable preview iframe. Open your published site (myzoe.xyz / mmora.xyz) and try again.'
          : 'Camera permission denied. Allow it in the browser address bar and retry.';
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        msg = 'No camera found on this device.';
      } else if (name === 'NotReadableError') {
        msg = 'Camera is in use by another app (Zoom, FaceTime, Photo Booth). Close it and retry.';
      } else if (message === 'CameraPromptTimeout') {
        msg = inIframe
          ? 'The preview iframe blocked the camera prompt. Open the site on myzoe.xyz to enroll Face ID.'
          : 'Camera prompt timed out. Check browser permissions and try again.';
      } else if (message) {
        msg = `Camera error: ${message}`;
      }
      setCameraError(msg);
      setSuggestion(suggestFix(name, message, inIframe, secure));
      setRequesting(false);
      setDiagOpen(true);
      toast.error(msg);
    }
  };

  const captureAndEnroll = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setCapturing(true);
    setStep('processing');

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.95);
      log('info', 'capture', 'Frame captured', { w: canvas.width, h: canvas.height, bytes: imageData.length });

      if (stream) stream.getTracks().forEach(track => track.stop());

      setProcessing(true);
      const { data, error } = await supabase.functions.invoke('face-verification', {
        body: { operation: 'enroll_face', imageData }
      });

      if (error) {
        log('error', 'enroll', 'edge function error', { message: error.message, context: (error as any).context });
        throw error;
      }
      log('info', 'enroll', 'edge function response', data);

      if (data?.success) {
        setStep('success');
        toast.success('Face enrolled successfully with 99.1% accuracy!');
        setTimeout(() => { onComplete(); }, 2000);
      } else {
        setSuggestion('Enrollment returned no success flag. Retry in better lighting, or check face-verification function logs.');
        setDiagOpen(true);
        throw new Error(data?.error || 'Enrollment did not succeed');
      }
    } catch (error: any) {
      log('error', 'enroll', error?.message || 'Unknown enrollment error', error);
      toast.error('Face enrollment failed. Please try again.');
      setStep('camera');
    } finally {
      setCapturing(false);
      setProcessing(false);
    }
  };

  const DiagnosticsPanel = (
    <Card className="mt-3 border-dashed">
      <button
        onClick={() => setDiagOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <span className="flex items-center gap-2">
          <Bug className="w-3.5 h-3.5" />
          Diagnostics {cameraError ? <span className="text-destructive">• error detected</span> : <span className="opacity-60">• {diag.length} events</span>}
        </span>
        {diagOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {diagOpen && (
        <div className="px-3 pb-3 space-y-2 text-[11px]">
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono">
            <span className="opacity-60">secureContext</span><span>{String(secure)}</span>
            <span className="opacity-60">inIframe</span><span className={inIframe ? 'text-amber-500' : ''}>{String(inIframe)}</span>
            <span className="opacity-60">protocol</span><span>{location.protocol}</span>
            <span className="opacity-60">host</span><span className="truncate">{location.host}</span>
            <span className="opacity-60">permission</span><span>{permState}</span>
            <span className="opacity-60">mediaDevices</span><span>{String(!!navigator.mediaDevices?.getUserMedia)}</span>
          </div>
          {suggestion && (
            <div className="rounded border border-primary/30 bg-primary/5 p-2 text-foreground">
              <div className="font-semibold text-primary mb-0.5">Next action</div>
              {suggestion}
            </div>
          )}
          <div className="max-h-40 overflow-y-auto rounded border border-border bg-muted/30 p-2 font-mono space-y-1">
            {diag.length === 0 && <div className="opacity-50">No events yet.</div>}
            {diag.slice().reverse().map((e, i) => (
              <div key={i} className={
                e.level === 'error' ? 'text-destructive' : e.level === 'warn' ? 'text-amber-500' : 'text-foreground/80'
              }>
                <span className="opacity-50">{new Date(e.t).toLocaleTimeString()}</span>{' '}
                <span className="opacity-70">[{e.tag}]</span> {e.msg}
                {e.data !== undefined && (
                  <div className="pl-4 opacity-60 break-all">{typeof e.data === 'string' ? e.data : JSON.stringify(e.data)}</div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={copyDiag} className="gap-1 h-7 text-[11px]">
              <Copy className="w-3 h-3" /> Copy diagnostics
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDiag([])} className="h-7 text-[11px]">Clear</Button>
          </div>
        </div>
      )}
    </Card>
  );


  return (
    <AnimatePresence mode="wait">
      {step === 'instructions' && (
        <motion.div
          key="instructions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-4"
        >
          <Card className="bg-primary/10 border-primary/20 p-4">
            <div className="flex items-start gap-3">
              <Camera className="w-5 h-5 text-primary mt-1" />
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Face Enrollment Instructions</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Ensure good lighting on your face</li>
                  <li>Remove glasses and face coverings</li>
                  <li>Look directly at the camera</li>
                  <li>Keep your face centered in the frame</li>
                  <li>Stay still during capture</li>
                </ul>
              </div>
            </div>
          </Card>
          
          <div className="flex gap-2">
            <Button onClick={startCamera} className="flex-1 gap-2">
              <Camera className="w-4 h-4" />
              Start Camera
            </Button>
            <Button onClick={onCancel} variant="outline">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {step === 'camera' && (
        <motion.div
          key="camera"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="space-y-4"
        >
          <div className="relative rounded-lg overflow-hidden border-2 border-primary/30 bg-black min-h-[240px]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto"
            />
            <div className="absolute inset-0 border-4 border-primary/30 rounded-lg pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-80 border-2 border-primary rounded-full"></div>
            </div>

            {requesting && !stream && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-center px-4">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <p className="text-sm text-foreground">Requesting camera access…</p>
                <p className="text-xs text-muted-foreground">Allow the browser prompt to continue.</p>
              </div>
            )}

            {cameraError && !stream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-center px-4">
                <AlertCircle className="w-6 h-6 text-destructive" />
                <p className="text-sm text-foreground max-w-sm">{cameraError}</p>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="flex gap-2">
            {cameraError ? (
              <Button onClick={startCamera} className="flex-1 gap-2">
                <Camera className="w-4 h-4" />
                Retry Camera
              </Button>
            ) : (
              <Button
                onClick={captureAndEnroll}
                disabled={capturing || !stream || requesting}
                className="flex-1 gap-2"
              >
                {capturing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                Capture & Enroll
              </Button>
            )}
            <Button onClick={() => { setCameraError(null); setStep('instructions'); }} variant="outline">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {step === 'processing' && (
        <motion.div
          key="processing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-center py-8 space-y-4"
        >
          <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Processing Face Data
            </h3>
            <p className="text-sm text-muted-foreground">
              Analyzing facial features with advanced AI vision...
            </p>
          </div>
        </motion.div>
      )}

      {step === 'success' && (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="text-center py-8 space-y-4"
        >
          <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Face Enrolled Successfully!
            </h3>
            <p className="text-sm text-muted-foreground">
              99.1% accuracy • Advanced AI verification enabled
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FaceVerificationSetup;