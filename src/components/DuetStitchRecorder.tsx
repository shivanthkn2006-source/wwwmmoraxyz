import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Video, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DuetStitchRecorderProps {
  originalVideoUrl: string;
  mode: 'duet' | 'stitch';
  onRecordingComplete: (blob: Blob) => void;
  onCancel: () => void;
}

const DuetStitchRecorder: React.FC<DuetStitchRecorderProps> = ({
  originalVideoUrl,
  mode,
  onRecordingComplete,
  onCancel,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [layout, setLayout] = useState<'side-by-side' | 'sequential'>('side-by-side');
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    startUserCamera();
    return () => {
      stopUserCamera();
    };
  }, []);

  const startUserCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 720, height: 1280 },
        audio: true,
      });
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream;
        userVideoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera');
    }
  };

  const stopUserCamera = () => {
    const stream = userVideoRef.current?.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const startCountdown = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === 1) {
          clearInterval(interval);
          startRecording();
          return null;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);
  };

  const startRecording = async () => {
    try {
      const canvas = canvasRef.current;
      if (!canvas || !originalVideoRef.current || !userVideoRef.current) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 720;
      canvas.height = 1280;

      // Start original video
      originalVideoRef.current.currentTime = 0;
      originalVideoRef.current.play();

      const canvasStream = canvas.captureStream(30);
      const userStream = userVideoRef.current.srcObject as MediaStream;
      const audioTrack = userStream.getAudioTracks()[0];
      
      if (audioTrack) {
        canvasStream.addTrack(audioTrack);
      }

      mediaRecorderRef.current = new MediaRecorder(canvasStream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        onRecordingComplete(blob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Draw frames
      const drawFrame = () => {
        if (!isRecording || !ctx) return;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (mode === 'duet' && layout === 'side-by-side') {
          // Side by side layout
          ctx.drawImage(originalVideoRef.current!, 0, 0, 360, 1280);
          ctx.drawImage(userVideoRef.current!, 360, 0, 360, 1280);
        } else if (mode === 'stitch' || layout === 'sequential') {
          // Sequential layout - show original first, then user
          const originalDuration = originalVideoRef.current?.duration || 0;
          const currentTime = originalVideoRef.current?.currentTime || 0;
          
          if (currentTime < originalDuration) {
            ctx.drawImage(originalVideoRef.current!, 0, 0, 720, 1280);
          } else {
            ctx.drawImage(userVideoRef.current!, 0, 0, 720, 1280);
          }
        }

        requestAnimationFrame(drawFrame);
      };

      drawFrame();
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      originalVideoRef.current?.pause();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold capitalize">{mode} Mode</h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {mode === 'duet' && (
        <RadioGroup value={layout} onValueChange={(v) => setLayout(v as typeof layout)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="side-by-side" id="side-by-side" />
            <Label htmlFor="side-by-side">Side by Side</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="sequential" id="sequential" />
            <Label htmlFor="sequential">Sequential</Label>
          </div>
        </RadioGroup>
      )}

      <div className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden">
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/50">
            <span className="text-6xl font-bold text-white">{countdown}</span>
          </div>
        )}

        <canvas ref={canvasRef} className="w-full h-full" />
        
        <video
          ref={originalVideoRef}
          src={originalVideoUrl}
          className="hidden"
          playsInline
          muted
        />
        
        <video
          ref={userVideoRef}
          className="hidden"
          playsInline
          muted
        />
      </div>

      <div className="flex gap-2">
        {!isRecording ? (
          <Button onClick={startCountdown} className="flex-1">
            <Video className="w-4 h-4 mr-2" />
            Start Recording
          </Button>
        ) : (
          <Button onClick={stopRecording} variant="destructive" className="flex-1">
            <Square className="w-4 h-4 mr-2" />
            Stop Recording
          </Button>
        )}
      </div>
    </div>
  );
};

export default DuetStitchRecorder;
