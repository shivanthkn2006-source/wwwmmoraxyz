import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  Video,
  Wand2,
  Type,
  Scissors,
  X,
  Check,
  RotateCcw,
  Sparkles,
  Camera,
  Users,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import AREffectsPanel from './AREffectsPanel';
import DuetStitchRecorder from './DuetStitchRecorder';
import AIVideoEffects from './AIVideoEffects';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { Progress } from '@/components/ui/progress';

interface VideoCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  duetStitchMode?: { type: 'duet' | 'stitch'; videoUrl: string; postId: string } | null;
  privateTimelineId?: string;
}

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

const VideoCreationModal: React.FC<VideoCreationModalProps> = ({
  open,
  onOpenChange,
  onComplete,
  duetStitchMode = null,
  privateTimelineId,
}) => {
  const { user } = useAuth();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [recordingMode, setRecordingMode] = useState<'upload' | 'camera' | 'duet-stitch'>('upload');
  
  // Media upload hook with auto-compression
  const { 
    uploadMedia, 
    isUploading, 
    progress: uploadProgress,
    getLimitsInfo 
  } = useMediaUpload({
    bucket: 'post-media',
    folder: user?.id,
    showToasts: true
  });
  
  // Filters
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  
  // Text overlays
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [currentText, setCurrentText] = useState('');
  
  // Trim
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(60);
  const [duration, setDuration] = useState(60);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const limits = getLimitsInfo();

  useEffect(() => {
    if (duetStitchMode) {
      setRecordingMode('duet-stitch');
    }
  }, [duetStitchMode]);

  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [videoFile]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.onloadedmetadata = () => {
        const dur = videoRef.current?.duration || 60;
        setDuration(dur);
        setEndTime(Math.min(60, dur));
      };
    }
  }, [videoUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error('Video must be under 50MB');
        return;
      }
      setVideoFile(file);
    } else {
      toast.error('Please select a valid video file');
    }
  };

  const addTextOverlay = () => {
    if (!currentText.trim()) return;
    
    const newOverlay: TextOverlay = {
      id: Math.random().toString(36).substr(2, 9),
      text: currentText,
      x: 50,
      y: 50,
      fontSize: 24,
      color: '#ffffff',
    };
    
    setTextOverlays([...textOverlays, newOverlay]);
    setCurrentText('');
  };

  const removeTextOverlay = (id: string) => {
    setTextOverlays(textOverlays.filter(overlay => overlay.id !== id));
  };

  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };

  const handleDuetStitchComplete = (blob: Blob) => {
    const file = new File([blob], 'duet-stitch.webm', { type: 'video/webm' });
    setVideoFile(file);
    setRecordingMode('upload');
  };

  const handleUpload = async () => {
    if (!videoFile || !user) return;

    try {
      // Use the media upload hook with auto-compression
      const result = await uploadMedia(videoFile);
      
      if (!result.success || !result.url) {
        throw new Error(result.error || 'Upload failed');
      }

      // Create post with video
      const postData: any = {
        user_id: user.id,
        content: caption,
        media_url: result.url,
        media_type: 'video',
        visibility: privateTimelineId ? 'personal' : 'global',
        ...(privateTimelineId && { private_timeline_id: privateTimelineId }),
      };

      const { error: postError } = await supabase
        .from('posts')
        .insert(postData);

      if (postError) throw postError;

      toast.success('Video posted successfully!');
      onComplete();
      onOpenChange(false);
      
      // Reset state
      setVideoFile(null);
      setVideoUrl('');
      setCaption('');
      setTextOverlays([]);
      resetFilters();
      setRecordingMode('upload');
    } catch (error) {
      console.error('Error uploading video:', error);
      toast.error('Failed to upload video');
    }
  };

  const filterStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Create Loop Video
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {recordingMode === 'duet-stitch' && duetStitchMode ? (
            <DuetStitchRecorder
              originalVideoUrl={duetStitchMode.videoUrl}
              mode={duetStitchMode.type}
              onRecordingComplete={handleDuetStitchComplete}
              onCancel={() => {
                setRecordingMode('upload');
                onOpenChange(false);
              }}
            />
          ) : recordingMode === 'camera' ? (
            <div className="space-y-4">
              <AREffectsPanel
                videoRef={videoRef}
                canvasRef={canvasRef}
                isRecording={isUploading}
              />
              <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
                />
              </div>
              <Button
                onClick={() => setRecordingMode('upload')}
                variant="outline"
                className="w-full"
              >
                Switch to Upload
              </Button>
            </div>
          ) : !videoFile ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8" />
                  <span>Upload Video</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => setRecordingMode('camera')}
                >
                  <Camera className="w-8 h-8" />
                  <span>Record with AR</span>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Max 60 seconds, up to 50MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Video Preview */}
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full max-h-96 object-contain"
                  style={filterStyle}
                  controls
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Text Overlays Preview */}
                {textOverlays.map((overlay) => (
                  <div
                    key={overlay.id}
                    className="absolute pointer-events-none"
                    style={{
                      left: `${overlay.x}%`,
                      top: `${overlay.y}%`,
                      fontSize: `${overlay.fontSize}px`,
                      color: overlay.color,
                      fontWeight: 'bold',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    }}
                  >
                    {overlay.text}
                  </div>
                ))}
              </div>

              {/* Editing Tools */}
              <Tabs defaultValue="filters" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="filters">
                    <Wand2 className="w-4 h-4 mr-2" />
                    Filters
                  </TabsTrigger>
                  <TabsTrigger value="text">
                    <Type className="w-4 h-4 mr-2" />
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="trim">
                    <Scissors className="w-4 h-4 mr-2" />
                    Trim
                  </TabsTrigger>
                  <TabsTrigger value="ai">
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Effects
                  </TabsTrigger>
                </TabsList>

                {/* Filters Tab */}
                <TabsContent value="filters" className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Brightness: {brightness}%
                      </label>
                      <Slider
                        value={[brightness]}
                        onValueChange={(v) => setBrightness(v[0])}
                        min={0}
                        max={200}
                        step={1}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Contrast: {contrast}%
                      </label>
                      <Slider
                        value={[contrast]}
                        onValueChange={(v) => setContrast(v[0])}
                        min={0}
                        max={200}
                        step={1}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Saturation: {saturation}%
                      </label>
                      <Slider
                        value={[saturation]}
                        onValueChange={(v) => setSaturation(v[0])}
                        min={0}
                        max={200}
                        step={1}
                      />
                    </div>
                    <Button variant="outline" onClick={resetFilters} className="w-full">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset Filters
                    </Button>
                  </div>
                </TabsContent>

                {/* Text Tab */}
                <TabsContent value="text" className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter text..."
                      value={currentText}
                      onChange={(e) => setCurrentText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTextOverlay()}
                    />
                    <Button onClick={addTextOverlay}>Add</Button>
                  </div>
                  
                  <div className="space-y-2">
                    {textOverlays.map((overlay) => (
                      <div
                        key={overlay.id}
                        className="flex items-center justify-between p-2 border rounded-lg"
                      >
                        <span className="text-sm">{overlay.text}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTextOverlay(overlay.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Trim Tab */}
                <TabsContent value="trim" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Start Time: {startTime.toFixed(1)}s
                    </label>
                    <Slider
                      value={[startTime]}
                      onValueChange={(v) => setStartTime(Math.min(v[0], endTime - 1))}
                      min={0}
                      max={duration}
                      step={0.1}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      End Time: {endTime.toFixed(1)}s
                    </label>
                    <Slider
                      value={[endTime]}
                      onValueChange={(v) => setEndTime(Math.max(v[0], startTime + 1))}
                      min={0}
                      max={duration}
                      step={0.1}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Duration: {(endTime - startTime).toFixed(1)}s
                  </p>
                </TabsContent>

                {/* AI Effects Tab */}
                <TabsContent value="ai" className="space-y-4">
                  <AIVideoEffects
                    videoFile={videoFile}
                    onEffectApplied={(url) => {
                      setVideoUrl(url);
                      toast.success('AI effect applied!');
                    }}
                  />
                </TabsContent>
              </Tabs>

              {/* Caption */}
              <div>
                <label className="text-sm font-medium mb-2 block">Caption</label>
                <Textarea
                  placeholder="Write a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setVideoFile(null);
                    setVideoUrl('');
                  }}
                  className="flex-1"
                >
                  Change Video
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex-1"
                >
                  {isUploading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {uploadProgress > 0 ? `${Math.round(uploadProgress)}%` : 'Processing...'}
                    </span>
                  ) : 'Post Video'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoCreationModal;
