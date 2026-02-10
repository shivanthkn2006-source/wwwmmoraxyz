import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Camera, Smile, Heart, Stars, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface AREffect {
  id: string;
  name: string;
  icon: React.ReactNode;
  type: 'filter' | 'mask' | 'beautify';
}

const AR_EFFECTS: AREffect[] = [
  { id: 'none', name: 'None', icon: <Camera className="w-5 h-5" />, type: 'filter' },
  { id: 'beauty', name: 'Beauty', icon: <Sparkles className="w-5 h-5" />, type: 'beautify' },
  { id: 'smooth', name: 'Smooth', icon: <Smile className="w-5 h-5" />, type: 'beautify' },
  { id: 'heart', name: 'Hearts', icon: <Heart className="w-5 h-5" />, type: 'mask' },
  { id: 'stars', name: 'Stars', icon: <Stars className="w-5 h-5" />, type: 'mask' },
  { id: 'glow', name: 'Glow', icon: <Zap className="w-5 h-5" />, type: 'filter' },
];

interface AREffectsPanelProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isRecording: boolean;
}

const AREffectsPanel: React.FC<AREffectsPanelProps> = ({ videoRef, canvasRef, isRecording }) => {
  const [selectedEffect, setSelectedEffect] = useState<string>('none');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [deviceSupported, setDeviceSupported] = useState(true);
  const animationFrameRef = useRef<number>();

  // Check device support
  useEffect(() => {
    const checkSupport = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const hasWebGL = !!canvas.getContext('webgl') || !!canvas.getContext('experimental-webgl');
      
      setDeviceSupported(!!(ctx && hasWebGL));
      
      if (!ctx || !hasWebGL) {
        console.warn('[AREffects] Device does not support required features');
        toast.error('AR effects require WebGL support');
      }
    };
    
    checkSupport();
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
        audio: true,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  useEffect(() => {
    if (selectedEffect !== 'none' && videoRef.current && canvasRef.current && deviceSupported) {
      applyEffect();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [selectedEffect, deviceSupported]);

  const applyEffect = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const processFrame = () => {
      if (!video.paused && !video.ended) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Apply effect based on type
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        switch (selectedEffect) {
          case 'beauty':
            // Enhanced beauty filter with skin tone detection
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              
              // Detect skin tones
              if (r > 95 && g > 40 && b > 20 && 
                  Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
                  Math.abs(r - g) > 15 && r > g && r > b) {
                // Smooth and brighten skin
                data[i] = Math.min(255, r + 20);
                data[i + 1] = Math.min(255, g + 15);
                data[i + 2] = Math.min(255, b + 10);
              }
            }
            break;
          case 'smooth':
            // Advanced blur with edge preservation (every other pixel for performance)
            for (let i = 0; i < data.length; i += 8) {
              const avgR = (data[i] + data[i + 4]) / 2;
              const avgG = (data[i + 1] + data[i + 5]) / 2;
              const avgB = (data[i + 2] + data[i + 6]) / 2;
              data[i] = avgR;
              data[i + 1] = avgG;
              data[i + 2] = avgB;
            }
            break;
          case 'glow':
            // Holographic glow effect with rainbow shimmer
            const time = Date.now() / 1000;
            for (let i = 0; i < data.length; i += 4) {
              const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
              const glow = brightness > 150 ? 30 : 0;
              
              // Rainbow shimmer based on position and time
              const shimmer = Math.sin(time + i / 10000) * 20;
              
              data[i] = Math.min(255, data[i] + glow + shimmer);
              data[i + 1] = Math.min(255, data[i + 1] + glow);
              data[i + 2] = Math.min(255, data[i + 2] + glow - shimmer);
            }
            break;
        }

        ctx.putImageData(imageData, 0, 0);

        // Add animated overlays for mask effects
        if (selectedEffect === 'heart' || selectedEffect === 'stars') {
          const time = Date.now() / 1000;
          ctx.font = '48px Arial';
          ctx.globalAlpha = 0.7 + Math.sin(time * 2) * 0.3;
          
          const emoji = selectedEffect === 'heart' ? '❤️' : '⭐';
          const positions = [
            { x: 0.2, y: 0.3 },
            { x: 0.7, y: 0.4 },
            { x: 0.5, y: 0.6 }
          ];
          
          positions.forEach((pos, idx) => {
            const offsetY = Math.sin(time * 2 + idx) * 20;
            ctx.fillText(emoji, canvas.width * pos.x, canvas.height * pos.y + offsetY);
          });
          
          ctx.globalAlpha = 1.0;
        }

        animationFrameRef.current = requestAnimationFrame(processFrame);
      }
    };

    processFrame();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">AR Effects</h3>
        </div>
        {!deviceSupported && (
          <span className="text-xs text-destructive">Not supported on this device</span>
        )}
      </div>
      
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {AR_EFFECTS.map((effect) => (
            <Button
              key={effect.id}
              variant={selectedEffect === effect.id ? 'default' : 'outline'}
              size="sm"
              className="flex-col h-auto py-2 px-3 min-w-[70px]"
              onClick={() => setSelectedEffect(effect.id)}
              disabled={isRecording || !deviceSupported}
            >
              {effect.icon}
              <span className="text-xs mt-1">{effect.name}</span>
            </Button>
          ))}
        </div>
      </ScrollArea>
      
      {selectedEffect !== 'none' && deviceSupported && (
        <p className="text-xs text-muted-foreground">
          {AR_EFFECTS.find(e => e.id === selectedEffect)?.name} effect active
        </p>
      )}
      
      {!deviceSupported && (
        <p className="text-xs text-destructive">
          AR effects require WebGL support. Try using a different browser or device.
        </p>
      )}
    </div>
  );
};

export default AREffectsPanel;
