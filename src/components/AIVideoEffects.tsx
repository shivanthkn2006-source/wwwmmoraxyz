import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Wand2, Loader2, Sparkles, Play, Pause, RotateCcw, AlertTriangle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useDeviceTierContext } from '@/contexts/DeviceTierContext';

interface AIVideoEffectsProps {
  videoFile: File;
  onEffectApplied: (videoUrl: string) => void;
}

// Device compatibility detection
interface DeviceCapability {
  supportsMediaRecorder: boolean;
  supportsCanvasCapture: boolean;
  supportsVP9: boolean;
  supportsVP8: boolean;
  supportsH264: boolean;
  isLowMemory: boolean;
  isBatteryConstrained: boolean;
  maxRecommendedDuration: number;
  recommendedFPS: number;
  recommendedBitrate: number;
  isMobile: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  deviceModel: string;
  bestMimeType: string;
}

// Mobile device detection helper
const detectMobileDevice = (): { isMobile: boolean; isAndroid: boolean; isIOS: boolean; deviceModel: string } => {
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isMobile = isAndroid || isIOS || /Mobile|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua);
  
  // Extract device model for specific optimizations
  let deviceModel = 'unknown';
  if (isAndroid) {
    const match = ua.match(/;\s*([^;]+)\s*Build\//);
    if (match) deviceModel = match[1].trim().toLowerCase();
  } else if (isIOS) {
    deviceModel = 'ios';
  }
  
  return { isMobile, isAndroid, isIOS, deviceModel };
};

// Find best supported mime type for the device
const findBestMimeType = (): string => {
  if (typeof MediaRecorder === 'undefined') return '';
  
  // Priority order: H264 for mobile (better hardware support), then VP8, then VP9, then generic
  const mimeTypes = [
    'video/mp4;codecs=h264,aac', // Best for Android hardware
    'video/webm;codecs=h264',   // H264 in WebM container
    'video/webm;codecs=vp8',    // VP8 - better mobile support than VP9
    'video/webm;codecs=vp9',    // VP9 - most efficient but less hardware support
    'video/webm',               // Generic WebM
    'video/mp4',                // Generic MP4
  ];
  
  for (const mimeType of mimeTypes) {
    try {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    } catch {
      // Continue to next
    }
  }
  
  return 'video/webm'; // Fallback
};

const detectDeviceCapabilities = async (): Promise<DeviceCapability> => {
  const supportsMediaRecorder = typeof MediaRecorder !== 'undefined';
  
  // Check canvas capture with fallback
  let supportsCanvasCapture = false;
  try {
    supportsCanvasCapture = typeof HTMLCanvasElement.prototype.captureStream === 'function';
    // Some Android browsers claim support but fail - test it
    if (supportsCanvasCapture) {
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 10;
      testCanvas.height = 10;
      const stream = testCanvas.captureStream(1);
      supportsCanvasCapture = stream && stream.getTracks().length > 0;
      stream?.getTracks().forEach(t => t.stop());
    }
  } catch {
    supportsCanvasCapture = false;
  }
  
  // Codec support detection
  const supportsVP9 = supportsMediaRecorder && MediaRecorder.isTypeSupported('video/webm;codecs=vp9');
  const supportsVP8 = supportsMediaRecorder && MediaRecorder.isTypeSupported('video/webm;codecs=vp8');
  const supportsH264 = supportsMediaRecorder && (
    MediaRecorder.isTypeSupported('video/mp4;codecs=h264,aac') ||
    MediaRecorder.isTypeSupported('video/webm;codecs=h264')
  );
  
  const bestMimeType = findBestMimeType();
  
  // Memory detection with mobile-aware defaults
  const deviceMemory = (navigator as any).deviceMemory || 2; // Default lower for mobile
  const { isMobile, isAndroid, isIOS, deviceModel } = detectMobileDevice();
  
  // Samsung M05 and similar budget phones have ~3-4GB RAM
  // OnePlus 7 Pro has 8-12GB but still benefits from optimizations
  const isBudgetDevice = deviceModel.includes('sm-m') || deviceModel.includes('m05') || 
                         deviceModel.includes('a0') || deviceModel.includes('a1');
  const isLowMemory = deviceMemory <= 4 || isBudgetDevice;
  
  // Battery API detection - wrap in try-catch for iOS
  let isBatteryConstrained = false;
  try {
    if ('getBattery' in navigator) {
      const battery = await (navigator as any).getBattery?.();
      if (battery) {
        isBatteryConstrained = battery.level < 0.2 || (battery.charging === false && battery.level < 0.5);
      }
    }
  } catch {
    // Battery API not supported (iOS, some browsers)
  }
  
  // Determine recommended settings based on device
  const coreCount = navigator.hardwareConcurrency || (isMobile ? 4 : 8);
  const isLowEnd = coreCount <= 4 || isLowMemory || isBudgetDevice;
  
  // Mobile-specific optimizations
  const mobileAdjustment = isMobile ? 0.7 : 1; // 30% reduction for mobile
  
  return {
    supportsMediaRecorder,
    supportsCanvasCapture,
    supportsVP9,
    supportsVP8,
    supportsH264,
    isLowMemory,
    isBatteryConstrained,
    maxRecommendedDuration: isLowEnd ? 15 : (isMobile ? 30 : 60),
    recommendedFPS: isLowEnd ? 15 : (isMobile ? 24 : 30),
    recommendedBitrate: Math.floor((isLowEnd ? 800000 : (isMobile ? 1500000 : 2500000)) * mobileAdjustment),
    isMobile,
    isAndroid,
    isIOS,
    deviceModel,
    bestMimeType,
  };
};

// Client-side video effects using Canvas API (like Instagram/TikTok filters)
const PRESET_STYLES = [
  { name: 'Cyberpunk', filter: 'saturate(2) hue-rotate(180deg) contrast(1.3)' },
  { name: 'Vintage', filter: 'sepia(0.8) contrast(1.1) brightness(0.9)' },
  { name: 'Noir', filter: 'grayscale(1) contrast(1.4) brightness(0.9)' },
  { name: 'Retro 80s', filter: 'saturate(1.5) hue-rotate(-30deg) contrast(1.2)' },
  { name: 'Neon', filter: 'saturate(2.5) brightness(1.2) contrast(1.3)' },
  { name: 'Cinematic', filter: 'contrast(1.2) saturate(0.9) brightness(0.95)' },
  { name: 'Warm Glow', filter: 'sepia(0.3) saturate(1.3) brightness(1.1)' },
  { name: 'Cool Blue', filter: 'hue-rotate(200deg) saturate(1.2) brightness(1.05)' },
  { name: 'Dream', filter: 'blur(1px) saturate(1.4) brightness(1.1)' },
  { name: 'Vignette', filter: 'contrast(1.15) brightness(0.9)' },
];

const AIVideoEffects: React.FC<AIVideoEffectsProps> = ({ videoFile, onEffectApplied }) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [effectIntensity, setEffectIntensity] = useState(100);
  const [skipEffects, setSkipEffects] = useState(false);
  const [deviceCapabilities, setDeviceCapabilities] = useState<DeviceCapability | null>(null);
  const [memoryWarning, setMemoryWarning] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  // Use device tier context for adaptive rendering
  let tierContext: ReturnType<typeof useDeviceTierContext> | null = null;
  try {
    tierContext = useDeviceTierContext();
  } catch {
    // Context not available, use defaults
  }
  
  // Detect device capabilities on mount
  useEffect(() => {
    detectDeviceCapabilities().then(caps => {
      setDeviceCapabilities(caps);
      console.log('[AIVideoEffects] Device capabilities:', caps);
      
      // Auto-enable skip effects for constrained devices
      if (caps.isLowMemory || caps.isBatteryConstrained || !caps.supportsCanvasCapture) {
        setSkipEffects(true);
        if (!caps.supportsCanvasCapture) {
          setMemoryWarning(`Video effects not supported on ${caps.deviceModel || 'this device'}`);
        } else if (caps.isBatteryConstrained) {
          setMemoryWarning('Battery low - effects disabled to save power');
        } else if (caps.isLowMemory) {
          setMemoryWarning('Limited memory - effects disabled for stability');
        }
      }
    });
  }, []);

  // Create preview URL when video file changes
  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [videoFile]);
  
  // Cleanup on unmount - prevent memory leaks
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
    };
  }, []);
      
  // Apply CSS filter to canvas and export as new video - with memory management
  const applyFilterEffect = useCallback(async (filterStyle: string, styleName: string) => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('Video preview not ready');
      return;
    }
    
    // Check device capabilities first
    if (!deviceCapabilities?.supportsMediaRecorder || !deviceCapabilities?.supportsCanvasCapture) {
      toast.error("Your device doesn't support video effects. Using original video.");
      onEffectApplied(previewUrl);
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setSelectedFilter(styleName);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { 
        alpha: false, // Disable alpha for better performance
        desynchronized: true, // Reduce latency on supported browsers
      });
      
      if (!ctx) throw new Error('Canvas context unavailable');

      // Set canvas dimensions - scale down for low-end devices
      const isLowEnd = tierContext?.isLowPowerDevice || deviceCapabilities?.isLowMemory;
      const maxDimension = isLowEnd ? 480 : 720;
      
      let width = video.videoWidth || 640;
      let height = video.videoHeight || 480;
      
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.floor(width * scale / 2) * 2; // Ensure even
        height = Math.floor(height * scale / 2) * 2;
      }
      
      canvas.width = width;
      canvas.height = height;

      // Apply intensity scaling to the filter
      const intensityScale = effectIntensity / 100;
      
      // Use device-appropriate settings - mobile gets lower values
      const fps = deviceCapabilities?.recommendedFPS || (deviceCapabilities?.isMobile ? 15 : 24);
      const bitrate = deviceCapabilities?.recommendedBitrate || (deviceCapabilities?.isMobile ? 800000 : 1500000);
      
      // Prepare for recording - use best supported mime type for device
      let stream: MediaStream;
      try {
        stream = canvas.captureStream(fps);
        if (!stream || stream.getTracks().length === 0) {
          throw new Error('Canvas capture failed');
        }
      } catch (captureError) {
        console.error('Canvas capture not supported:', captureError);
        toast.error("Your device doesn't support video effects. Using original video.");
        onEffectApplied(previewUrl);
        setIsProcessing(false);
        return;
      }
      
      // Use best mime type detected for device (H264 better on mobile)
      const mimeType = deviceCapabilities?.bestMimeType || 'video/webm';
      
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: bitrate,
        });
      } catch (recorderError) {
        // Fallback to no options if mime type fails
        console.warn('MediaRecorder init failed, trying fallback:', recorderError);
        try {
          mediaRecorder = new MediaRecorder(stream);
        } catch (fallbackError) {
          console.error('MediaRecorder completely unsupported:', fallbackError);
          toast.error("Your device doesn't support video recording. Using original video.");
          onEffectApplied(previewUrl);
          setIsProcessing(false);
          stream.getTracks().forEach(t => t.stop());
          return;
        }
      }
      
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      // Handle MediaRecorder errors
      mediaRecorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        toast.error('Recording failed. Using original video.');
        onEffectApplied(previewUrl);
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second for better mobile performance
      video.currentTime = 0;
      
      // Mobile video playback can fail - wrap in try-catch
      try {
        await video.play();
      } catch (playError) {
        console.warn('Video autoplay blocked:', playError);
        // On mobile, autoplay may be blocked - try muted
        video.muted = true;
        try {
          await video.play();
        } catch {
          toast.error('Cannot play video. Tap to play first.');
          mediaRecorder.stop();
          stream.getTracks().forEach(t => t.stop());
          setIsProcessing(false);
          return;
        }
      }
      
      setProgress(10);

      // Process frames with filter - with memory-efficient approach
      let lastFrameTime = 0;
      const frameInterval = 1000 / fps; // Limit frame rate
      
      const processFrame = (timestamp: number) => {
        if (video.ended || video.paused) return;
        
        // Throttle frame processing for mobile
        if (timestamp - lastFrameTime < frameInterval) {
          rafIdRef.current = requestAnimationFrame(processFrame);
          return;
        }
        lastFrameTime = timestamp;
        
        // Apply filter and draw
        ctx.filter = filterStyle;
        ctx.globalAlpha = intensityScale;
        ctx.drawImage(video, 0, 0, width, height);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        
        // Update progress based on video time
        const progressPct = (video.currentTime / video.duration) * 80 + 10;
        setProgress(Math.min(90, progressPct));
        
        if (!video.ended) {
          rafIdRef.current = requestAnimationFrame(processFrame);
        }
      };

      rafIdRef.current = requestAnimationFrame(processFrame);

      // Wait for video to end with proper cleanup
      const maxDuration = deviceCapabilities?.maxRecommendedDuration || (deviceCapabilities?.isMobile ? 15 : 60);
      await new Promise<void>((resolve) => {
        video.onended = () => resolve();
        // Timeout fallback - respect device limits
        setTimeout(() => {
          video.pause();
          if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
          }
          resolve();
        }, Math.min((video.duration || 30) * 1000 + 1000, maxDuration * 1000));
      });

      mediaRecorder.stop();
      stream.getTracks().forEach(t => t.stop()); // Clean up stream tracks
      mediaRecorderRef.current = null;
      setProgress(95);

      // Wait for recording to finish
      await new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => resolve();
      });

      // Create blob URL
      const blob = new Blob(chunks, { type: 'video/webm' });
      const effectUrl = URL.createObjectURL(blob);
      
      // Clear chunks to free memory
      chunks.length = 0;
      
      setProgress(100);
      onEffectApplied(effectUrl);
      toast.success(`${styleName} effect applied!`);
    } catch (error) {
      console.error('Error applying filter effect:', error);
      toast.error('Failed to apply effect. Try a different filter.');
    } finally {
      setIsProcessing(false);
      setProgress(0);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    }
  }, [deviceCapabilities, tierContext, effectIntensity, previewUrl, onEffectApplied]);

  // Quick preview (applies CSS filter to video element only)
  const previewFilter = (filterStyle: string, styleName: string) => {
    if (videoRef.current) {
      videoRef.current.style.filter = filterStyle;
      setSelectedFilter(styleName);
    }
  };

  const resetPreview = () => {
    if (videoRef.current) {
      videoRef.current.style.filter = 'none';
      setSelectedFilter(null);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  // Post without effects
  const handleSkipEffects = () => {
    onEffectApplied(previewUrl);
    toast.success('Video ready (no effects)');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">AI Video Effects</h3>
          {tierContext?.isLowPowerDevice && (
            <Badge variant="outline" className="text-xs">
              <Zap className="w-3 h-3 mr-1" />
              Lite Mode
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="skip-effects" className="text-xs text-muted-foreground">
            Skip Effects
          </Label>
          <Switch
            id="skip-effects"
            checked={skipEffects}
            onCheckedChange={setSkipEffects}
          />
        </div>
      </div>
      
      {/* Device warning banner */}
      {memoryWarning && (
        <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs">
          <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          <span className="text-yellow-600 dark:text-yellow-400">{memoryWarning}</span>
        </div>
      )}
      
      {/* Device capabilities info */}
      {deviceCapabilities && (!deviceCapabilities.supportsMediaRecorder || !deviceCapabilities.supportsCanvasCapture) && (
        <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/30 rounded-lg text-xs">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
          <span className="text-destructive">
            {!deviceCapabilities.supportsMediaRecorder 
              ? "Your browser doesn't support video effects. Please use Chrome, Firefox, or Edge."
              : `Video effects may not work on ${deviceCapabilities.deviceModel || 'this device'}. Try "Skip Effects".`
            }
          </span>
        </div>
      )}
      
      {/* Mobile device info badge */}
      {deviceCapabilities?.isMobile && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            {deviceCapabilities.isAndroid ? '📱 Android' : deviceCapabilities.isIOS ? '📱 iOS' : '📱 Mobile'}
          </Badge>
          <span>• {deviceCapabilities.recommendedFPS}fps • {Math.round(deviceCapabilities.recommendedBitrate/1000)}kbps</span>
        </div>
      )}

      {/* Video Preview with live filter */}
      {previewUrl && (
        <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
          <video
            ref={videoRef}
            src={previewUrl}
            className="w-full h-full object-contain"
            loop
            muted
            playsInline
            preload="metadata"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Play/Pause overlay */}
          <button
            onClick={togglePlayPause}
            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
          >
            {isPlaying ? (
              <Pause className="w-12 h-12 text-white/80" />
            ) : (
              <Play className="w-12 h-12 text-white/80" />
            )}
          </button>
          
          {/* Current filter badge */}
          {selectedFilter && (
            <Badge className="absolute top-2 left-2 bg-primary/80">
              {selectedFilter}
            </Badge>
          )}
          
          {/* Reset button */}
          {selectedFilter && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
              onClick={resetPreview}
            >
              <RotateCcw className="w-4 h-4 text-white" />
            </Button>
          )}
        </div>
      )}

      {!skipEffects && (
        <>
          {/* Effect Intensity Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm">Effect Intensity</Label>
              <span className="text-xs text-muted-foreground">{effectIntensity}%</span>
            </div>
            <Slider
              value={[effectIntensity]}
              onValueChange={(v) => setEffectIntensity(v[0])}
              min={20}
              max={100}
              step={5}
            />
          </div>

          {/* Preset Styles Grid */}
          <div className="space-y-2">
            <Label>Preset Styles (Tap to preview, long-press to apply)</Label>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_STYLES.map((style) => (
                <Badge
                  key={style.name}
                  variant={selectedFilter === style.name ? 'default' : 'outline'}
                  className={`cursor-pointer text-center justify-center py-2 transition-all ${
                    selectedFilter === style.name 
                      ? 'bg-primary text-primary-foreground scale-105' 
                      : 'hover:bg-primary/20'
                  }`}
                  onClick={() => previewFilter(style.filter, style.name)}
                  onDoubleClick={() => !isProcessing && applyFilterEffect(style.filter, style.name)}
                >
                  {style.name}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Single tap to preview • Double-tap to apply permanently
            </p>
          </div>

          {/* Apply Selected Filter Button */}
          {selectedFilter && (
            <Button
              onClick={() => {
                const style = PRESET_STYLES.find(s => s.name === selectedFilter);
                if (style) applyFilterEffect(style.filter, style.name);
              }}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Applying {selectedFilter}... {progress}%
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Apply &quot;{selectedFilter}&quot; Effect
                </span>
              )}
            </Button>
          )}

          {/* Custom Prompt (for future AI integration) */}
          <div className="space-y-2">
            <Label htmlFor="custom-prompt">Custom Style (AI Coming Soon)</Label>
            <div className="flex gap-2">
              <Input
                id="custom-prompt"
                placeholder="e.g., 'dreamy pastel colors'"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                disabled={isProcessing}
                className="text-sm"
              />
              <Button
                onClick={() => toast.info('AI custom styles coming soon!')}
                disabled={isProcessing || !customPrompt}
                size="icon"
              >
                <Sparkles className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Skip Effects / Use Original */}
      {skipEffects && (
        <Button onClick={handleSkipEffects} className="w-full">
          <Play className="w-4 h-4 mr-2" />
          Use Original Video (No Effects)
        </Button>
      )}

      {/* Processing Progress */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Processing video...</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        🎬 Instagram/TikTok-style filters • {deviceCapabilities?.isLowMemory ? 'Lite mode active' : 'Client-side processing'} • No upload for preview
      </p>
      
      {/* Performance stats for debugging */}
      {tierContext && (
        <p className="text-[10px] text-muted-foreground/50">
          Device: {tierContext.tier} tier • {deviceCapabilities?.recommendedFPS || 24}fps • {Math.round((deviceCapabilities?.recommendedBitrate || 1500000) / 1000)}kbps
        </p>
      )}
    </div>
  );
};

export default AIVideoEffects;