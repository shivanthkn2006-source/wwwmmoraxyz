import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, FlipHorizontal, Square, Circle, Upload, X, Globe, Users, BookText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AIFilterPanel, FilterConfig } from '@/components/AIFilterPanel';
import { useAIFilters } from '@/hooks/useAIFilters';

const CameraPage = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [capturedMedia, setCapturedMedia] = useState<{ url: string; type: 'image' | 'video'; file?: Blob } | null>(null);
  const [postContent, setPostContent] = useState('');
  const [postVisibility, setPostVisibility] = useState<'global' | 'personal'>('personal');
  const [isUploading, setIsUploading] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [textVisibility, setTextVisibility] = useState<'global' | 'personal'>('personal');
  const [showAIFilters, setShowAIFilters] = useState(false);
  const [hasAppliedFilter, setHasAppliedFilter] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const { toast } = useToast();
  const { user } = useAuth();
  const { isProcessing: isFilterProcessing, applyAIFilter } = useAIFilters();

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [facingMode, toast]);

  useEffect(() => {
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setCapturedMedia({ url, type: 'image' });
        setShowPreview(true);
      }
    }, 'image/jpeg', 0.8);
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm'
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setCapturedMedia({ url, type: 'video' });
      setShowPreview(true);
      setIsRecording(false);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);

    // Stop recording after 60 seconds
    setTimeout(() => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    }, 60000);
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    setCapturedMedia({ url, type, file });
    setShowPreview(true);
    
    // Reset the input so the same file can be selected again
    event.target.value = '';
  }, []);

  const compressFile = async (file: Blob, type: 'image' | 'video'): Promise<Blob> => {
    if (type === 'image') {
      // Simple image compression logic
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
          const MAX_WIDTH = 1080;
          const MAX_HEIGHT = 1080;
          let { width, height } = img;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = (height * MAX_WIDTH) / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = (width * MAX_HEIGHT) / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(resolve, 'image/jpeg', 0.8);
        };

        img.src = URL.createObjectURL(file);
      });
    }

    // For video, return as-is for now (would need more complex compression)
    return file;
  };

  const uploadMedia = async (file: Blob, type: 'image' | 'video') => {
    if (!user) return null;

    const compressedFile = await compressFile(file, type);
    const fileExt = type === 'image' ? 'jpg' : 'webm';
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('posts')
      .upload(fileName, compressedFile);

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    // Generate signed URL (expires in 1 year)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('posts')
      .createSignedUrl(fileName, 31536000);
    
    if (urlError || !signedUrlData?.signedUrl) {
      console.error('Failed to generate signed URL:', urlError);
      return null;
    }

    return signedUrlData.signedUrl;
  };

  const createPost = async () => {
    if (!user || !capturedMedia) return;

    setIsUploading(true);
    try {
      // Use stored file or convert URL to blob
      const blob = capturedMedia.file || await fetch(capturedMedia.url).then(r => r.blob());

      const mediaUrl = await uploadMedia(blob, capturedMedia.type);

      if (!mediaUrl) {
        throw new Error('Failed to upload media');
      }

      // AI Content Moderation
      const { data: moderationResult } = await supabase.functions.invoke('moderate-content', {
        body: { 
          content: postContent, 
          mediaUrl: capturedMedia.type === 'image' ? mediaUrl : null,
          mediaType: capturedMedia.type 
        }
      });

      if (!moderationResult?.approved) {
        toast({
          title: "Content Moderated",
          description: moderationResult?.reason || "This content violates community guidelines.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: postContent,
          media_url: mediaUrl,
          media_type: capturedMedia.type,
          visibility: postVisibility,
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Post Created!",
        description: `Your ${capturedMedia.type} has been shared.`,
      });

      // Reset state
      setShowPreview(false);
      setCapturedMedia(null);
      setPostContent('');
      setPostVisibility('personal');

    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Upload Failed",
        description: "Could not create post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const cancelPreview = () => {
    if (capturedMedia) {
      URL.revokeObjectURL(capturedMedia.url);
    }
    setShowPreview(false);
    setCapturedMedia(null);
    setPostContent('');
    setHasAppliedFilter(false);
    setShowAIFilters(false);
  };

  const handleFilterApply = async (filter: FilterConfig) => {
    if (!capturedMedia || capturedMedia.type !== 'image') {
      toast({
        title: "Filter Error",
        description: "Filters can only be applied to images.",
        variant: "destructive",
      });
      return;
    }

    const filteredUrl = await applyAIFilter(capturedMedia.url, filter);
    
    if (filteredUrl) {
      // Update the captured media with filtered version
      setCapturedMedia({
        ...capturedMedia,
        url: filteredUrl,
      });
      setHasAppliedFilter(true);
    }
  };

  const createTextPost = async () => {
    if (!user || !textContent.trim()) return;

    setIsUploading(true);
    try {
      // AI Content Moderation
      const { data: moderationResult } = await supabase.functions.invoke('moderate-content', {
        body: { 
          content: textContent,
          mediaUrl: null,
          mediaType: 'text'
        }
      });

      if (!moderationResult?.approved) {
        toast({
          title: "Content Moderated",
          description: moderationResult?.reason || "This content violates community guidelines.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: textContent,
          media_url: null,
          media_type: null,
          visibility: textVisibility,
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Post Created!",
        description: "Your text post has been shared.",
      });

      // Reset state
      setShowTextDialog(false);
      setTextContent('');
      setTextVisibility('personal');

    } catch (error) {
      console.error('Error creating text post:', error);
      toast({
        title: "Post Failed",
        description: "Could not create post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (showPreview && capturedMedia) {
    return (
      <div className="fixed inset-0 bg-background z-[60]">
        <div className="relative h-full flex flex-col">
          {/* AI Filter Button - Top Right */}
          {capturedMedia.type === 'image' && (
            <div className="absolute top-4 right-4 z-10">
              <Button
                onClick={() => setShowAIFilters(!showAIFilters)}
                className="bg-primary hover:bg-primary/90"
                size="sm"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Filters
              </Button>
            </div>
          )}

          {/* Preview Media */}
          <div className="flex-1 relative bg-background">
            {capturedMedia.type === 'image' ? (
              <img
                src={capturedMedia.url}
                alt="Captured"
                className="w-full h-full object-contain"
              />
            ) : (
              <video
                src={capturedMedia.url}
                controls
                className="w-full h-full object-contain"
              />
            )}
          </div>

          {/* Post Creation Form */}
          <Card className="mx-4 mb-4 mt-2 bg-card border-border">
            <CardContent className="p-4 space-y-4">
              <Textarea
                placeholder="Write a caption..."
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                className="bg-background border-border resize-none"
                rows={3}
              />

              <div className="flex space-x-2">
                <Button
                  variant={postVisibility === 'global' ? "default" : "outline"}
                  onClick={() => setPostVisibility('global')}
                  className="flex-1"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Global
                </Button>
                <Button
                  variant={postVisibility === 'personal' ? "default" : "outline"}
                  onClick={() => setPostVisibility('personal')}
                  className="flex-1"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Friends
                </Button>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={cancelPreview}
                  className="flex-1"
                  disabled={isUploading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={createPost}
                  className="flex-1"
                  disabled={isUploading}
                >
                  {isUploading ? 'Posting...' : 'Post'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Filter Panel */}
          <AnimatePresence>
            {showAIFilters && (
              <AIFilterPanel
                onFilterApply={handleFilterApply}
                isProcessing={isFilterProcessing}
                onClose={() => setShowAIFilters(false)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background">
      {/* Camera View - Fullscreen */}
      <div className="relative h-full w-full">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Top Controls */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')}
            className="bg-background/50 text-foreground hover:bg-background/70"
          >
            <FlipHorizontal className="w-6 h-6" />
          </Button>

          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground">Capture</h1>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="file-upload">
              <Button
                variant="ghost"
                size="icon"
                className="bg-background/50 text-foreground hover:bg-background/70"
                asChild
              >
                <div>
                  <Upload className="w-6 h-6" />
                </div>
              </Button>
            </label>
            <input
              id="file-upload"
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTextDialog(true)}
              className="bg-background/50 text-foreground hover:bg-background/70"
            >
              <BookText className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Text Post Dialog */}
        <Dialog open={showTextDialog} onOpenChange={setShowTextDialog}>
          <DialogContent className="bg-card border-border max-w-md">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Create Text Post</h2>
              <Textarea
                placeholder="Write your Thoughts..."
                value={textContent}
                onChange={(e) => {
                  if (e.target.value.length <= 256) {
                    setTextContent(e.target.value);
                  }
                }}
                className="bg-background border-border resize-none min-h-[120px]"
                rows={5}
              />
              
              <div className="text-right text-sm text-muted-foreground">
                {textContent.length}/256
              </div>

              <div className="flex gap-2">
                <Button
                  variant={textVisibility === 'global' ? "default" : "outline"}
                  onClick={() => setTextVisibility('global')}
                  className="flex-1"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Global
                </Button>
                <Button
                  variant={textVisibility === 'personal' ? "default" : "outline"}
                  onClick={() => setTextVisibility('personal')}
                  className="flex-1"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Friends
                </Button>
              </div>

              <Button
                onClick={createTextPost}
                className="w-full"
                disabled={isUploading || !textContent.trim()}
              >
                {isUploading ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bottom Controls */}
        <div className="absolute bottom-8 left-0 right-0">
          <div className="flex justify-center items-center space-x-8">
            {/* Photo Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={capturePhoto}
              className="w-16 h-16 bg-foreground/20 border-2 border-foreground rounded-full flex items-center justify-center"
              disabled={isRecording}
            >
              <Camera className="w-8 h-8 text-foreground" />
            </motion.button>

            {/* Record Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-red-500'
                  : 'bg-foreground border-4 border-foreground/50'
              }`}
            >
              {isRecording ? (
                <Square className="w-8 h-8 text-foreground" />
              ) : (
                <Circle className="w-10 h-10 text-destructive" />
              )}
            </motion.button>
          </div>

          {isRecording && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mt-4"
            >
              <div className="inline-flex items-center space-x-2 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm">
                <div className="w-2 h-2 bg-destructive-foreground rounded-full animate-pulse" />
                <span>Recording...</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraPage;
