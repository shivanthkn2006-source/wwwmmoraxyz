// ═══════════════════════════════════════════════════════════════════════════════
// ZOE COMPACT CHAT INPUT - Reusable glassmorphic input with attach/download/send
// Matches the ZoeOrbConversationPanel compact design aesthetics
// ENHANCED: Voice note recording support for audio attachments
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Image, FileText, Video, Download, Mic, MicOff, Loader2, X, Circle, Square, Camera, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { downloadAsText, downloadAsPDF, exportToText, type ExportMessage } from '@/utils/conversationExport';
import { useVoiceNoteRecorder } from '@/hooks/useVoiceNoteRecorder';
import { useLiveVideoRecorder } from '@/hooks/useLiveVideoRecorder';
import { useBehavioralTelemetry } from '@/hooks/useBehavioralTelemetry';
import { toast } from 'sonner';

interface Message {
  role: string;
  content: string;
  created_at?: string;
  timestamp?: Date;
  media_url?: string;
  media_type?: string;
  image_url?: string;
}

// Behavioral telemetry type for emotional sensing
export interface BehavioralTelemetryData {
  hesitationLevel: 'none' | 'low' | 'medium' | 'high';
  deletionCount: number;
  wordsPerMinute: number;
  inferredState: 'calm' | 'contemplative' | 'hesitant' | 'anxious' | 'urgent' | 'excited';
  confidenceScore: number;
}

interface ZoeCompactChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (message: string, media?: { file: File; preview: string; type: string }, telemetry?: BehavioralTelemetryData) => void;
  isLoading?: boolean;
  isListening?: boolean;
  onToggleListening?: () => void;
  placeholder?: string;
  disabled?: boolean;
  messages?: Message[];
  userName?: string;
  showExport?: boolean;
  showAttach?: boolean;
  showMic?: boolean;
  className?: string;
  onAnkaCommand?: () => void; // Secret /anka command handler
  enableTelemetry?: boolean; // Enable behavioral sensing
}

export const ZoeCompactChatInput: React.FC<ZoeCompactChatInputProps> = ({
  input,
  setInput,
  onSend,
  isLoading = false,
  isListening = false,
  onToggleListening,
  placeholder = "Message Zoe...",
  disabled = false,
  messages = [],
  userName = 'User',
  showExport = true,
  showAttach = true,
  showMic = true,
  className,
  onAnkaCommand,
  enableTelemetry = true,
}) => {
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{ file: File; preview: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  
  // Behavioral telemetry for emotional sensing
  const {
    recordKeystroke,
    stopTracking: stopTelemetryTracking,
    resetTelemetry,
  } = useBehavioralTelemetry();
  
  // Voice note recorder
  const { 
    isRecording, 
    recordingDuration, 
    startRecording, 
    stopRecording, 
    cancelRecording,
    formatDuration 
  } = useVoiceNoteRecorder();

  // Live video recorder
  const {
    isRecording: isVideoRecording,
    isInitializing: isVideoInitializing,
    recordingDuration: videoRecordingDuration,
    maxDuration: videoMaxDuration,
    startRecording: startVideoRecording,
    stopRecording: stopVideoRecording,
    cancelRecording: cancelVideoRecording,
    formatDuration: formatVideoDuration,
    getVideoStream
  } = useLiveVideoRecorder();

  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Update video preview when recording starts
  useEffect(() => {
    if (isVideoRecording && videoPreviewRef.current) {
      const stream = getVideoStream();
      if (stream) {
        videoPreviewRef.current.srcObject = stream;
      }
    }
  }, [isVideoRecording, getVideoStream]);
  
  // Track keystrokes for telemetry - using keydown for accurate key detection
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (enableTelemetry) {
      recordKeystroke(e.key, input);
    }
  }, [enableTelemetry, recordKeystroke, input]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [input, pendingMedia]);

  const handleSend = useCallback(() => {
    if ((!input.trim() && !pendingMedia) || isLoading || disabled) return;
    
    // Secret /anka command - triggers Anka Shastra mode
    const trimmedInput = input.trim().toLowerCase();
    if (trimmedInput === '/anka' || trimmedInput === '/anka-shastra' || trimmedInput === '/prasna') {
      if (onAnkaCommand) {
        onAnkaCommand();
        setInput('');
        resetTelemetry();
        return;
      } else {
        // Navigate directly if no handler provided
        window.location.href = '/anka-shastra';
        setInput('');
        resetTelemetry();
        return;
      }
    }
    
    // Capture final telemetry before sending
    let telemetryData: BehavioralTelemetryData | undefined;
    if (enableTelemetry) {
      const finalTelemetry = stopTelemetryTracking();
      telemetryData = {
        hesitationLevel: finalTelemetry.hesitationLevel,
        deletionCount: finalTelemetry.deletionCount,
        wordsPerMinute: finalTelemetry.wordsPerMinute,
        inferredState: finalTelemetry.inferredState,
        confidenceScore: finalTelemetry.confidenceScore,
      };
      console.log('[Zoe Telemetry] Captured:', telemetryData);
    }
    
    onSend(input.trim(), pendingMedia || undefined, telemetryData);
    setInput('');
    setPendingMedia(null);
    setShowAttachMenu(false);
    resetTelemetry();
  }, [input, pendingMedia, isLoading, disabled, onSend, setInput, onAnkaCommand, enableTelemetry, stopTelemetryTracking, resetTelemetry]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determine file type
    let type = 'document';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPendingMedia({
        file,
        preview: event.target?.result as string,
        type
      });
      setShowAttachMenu(false);
    };
    reader.readAsDataURL(file);
    
    // Reset input for re-selection
    e.target.value = '';
  }, []);

  // Handle voice note recording
  const handleVoiceNoteToggle = useCallback(async () => {
    if (isRecording) {
      const result = await stopRecording();
      if (result) {
        setPendingMedia({
          file: result.file,
          preview: result.preview,
          type: 'audio'
        });
        toast.success(`Voice note recorded (${formatDuration(result.duration)})`);
      }
    } else {
      const started = await startRecording();
      if (started) {
        setShowAttachMenu(false);
        toast.info('Recording voice note...');
      }
    }
  }, [isRecording, startRecording, stopRecording, formatDuration]);

  // Handle live video recording
  const handleLiveVideoToggle = useCallback(async () => {
    if (isVideoRecording) {
      const result = await stopVideoRecording();
      if (result) {
        setPendingMedia({
          file: result.file,
          preview: result.preview,
          type: 'video'
        });
        toast.success(`Video recorded (${formatVideoDuration(result.duration)})`);
      }
    } else {
      const started = await startVideoRecording();
      if (started) {
        setShowAttachMenu(false);
        toast.info('Recording video... (max 1 minute)');
      }
    }
  }, [isVideoRecording, startVideoRecording, stopVideoRecording, formatVideoDuration]);

  const handleExportText = useCallback(() => {
    if (messages.length === 0) {
      toast.error('No messages to export');
      return;
    }
    
    const formattedMessages: ExportMessage[] = messages.map(m => ({
      role: m.role,
      content: m.content,
      created_at: m.created_at || m.timestamp?.toISOString() || new Date().toISOString(),
      media_url: m.media_url,
      media_type: m.media_type,
      image_url: m.image_url
    }));
    
    const textContent = exportToText(formattedMessages, userName);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadAsText(textContent, `zoe-conversation-${timestamp}.txt`);
    toast.success('Conversation exported with all content');
    setShowExportMenu(false);
  }, [messages, userName]);

  const handleExportPDF = useCallback(async () => {
    if (messages.length === 0) {
      toast.error('No messages to export');
      return;
    }
    
    const formattedMessages: ExportMessage[] = messages.map(m => ({
      role: m.role,
      content: m.content,
      created_at: m.created_at || m.timestamp?.toISOString() || new Date().toISOString(),
      media_url: m.media_url,
      media_type: m.media_type,
      image_url: m.image_url
    }));
    
    const timestamp = new Date().toISOString().split('T')[0];
    await downloadAsPDF(formattedMessages, userName, `zoe-conversation-${timestamp}.pdf`);
    toast.success('Opening print dialog - includes all media');
    setShowExportMenu(false);
  }, [messages, userName]);

  const clearPendingMedia = useCallback(() => {
    setPendingMedia(null);
  }, []);

  return (
    <div className={cn("relative", className)}>
      {/* Recording indicator - Voice */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-2 p-3 bg-red-500/10 backdrop-blur-xl rounded-lg border border-red-500/30 flex items-center gap-3"
          >
            <div
              className="w-3 h-3 rounded-full bg-red-500 animate-gpu-pulse-scale-fast"
            />
            <span className="text-sm text-red-400 font-medium">
              Recording: {formatDuration(recordingDuration)}
            </span>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-red-400 hover:text-red-300"
              onClick={cancelRecording}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 bg-red-500 hover:bg-red-600 text-white"
              onClick={handleVoiceNoteToggle}
            >
              <Square className="h-3 w-3 mr-1" /> Stop
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording indicator - Live Video - ENHANCED */}
      <AnimatePresence>
        {isVideoRecording && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-2 p-3 bg-purple-500/15 backdrop-blur-xl rounded-xl border border-purple-500/40"
          >
            <div className="flex flex-col gap-3">
              {/* Video preview - larger and visible */}
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video" style={{ minHeight: '140px', maxHeight: '200px' }}>
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }} // Mirror for selfie view
                />
                {/* LIVE indicator */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-600 rounded-full px-2.5 py-1 shadow-lg">
                  <div
                    className="w-2 h-2 rounded-full bg-white animate-gpu-pulse-scale-fast"
                  />
                  <span className="text-xs text-white font-bold tracking-wide">REC</span>
                </div>
                {/* Duration overlay */}
                <div className="absolute bottom-2 right-2 bg-black/70 rounded-full px-2.5 py-1">
                  <span className="text-sm text-white font-mono">
                    {formatVideoDuration(videoRecordingDuration)} / {formatVideoDuration(videoMaxDuration)}
                  </span>
                </div>
              </div>
              {/* Controls row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-purple-300 font-medium">
                    Recording video...
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-sm border-purple-400/50 text-purple-400 hover:bg-purple-500/20"
                    onClick={cancelVideoRecording}
                  >
                    <X className="h-3 w-3 mr-1" /> Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-sm bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={handleLiveVideoToggle}
                  >
                    <StopCircle className="h-3 w-3 mr-1" /> Stop & Send
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending Media Preview - ENHANCED with delete button */}
      <AnimatePresence>
        {pendingMedia && !isRecording && !isVideoRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2 p-3 bg-background/60 backdrop-blur-xl rounded-lg border border-primary/30"
          >
            <div className="flex items-start gap-3">
              {/* Preview thumbnail */}
              {pendingMedia.type === 'image' && (
                <img src={pendingMedia.preview} alt="Preview" className="h-16 w-16 rounded-lg object-cover border border-primary/20" />
              )}
              {pendingMedia.type === 'video' && (
                <div className="relative h-16 w-24 rounded-lg overflow-hidden bg-black border border-purple-500/30">
                  <video src={pendingMedia.preview} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Video className="h-6 w-6 text-purple-400" />
                  </div>
                </div>
              )}
              {pendingMedia.type === 'audio' && (
                <div className="h-16 w-16 rounded-lg bg-green-500/20 flex items-center justify-center border border-green-500/30">
                  <Mic className="h-6 w-6 text-green-400" />
                </div>
              )}
              {pendingMedia.type === 'document' && (
                <div className="h-16 w-16 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                  <FileText className="h-6 w-6 text-amber-400" />
                </div>
              )}
              
              {/* Info and controls */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{pendingMedia.file.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(pendingMedia.file.size / 1024).toFixed(1)} KB • {pendingMedia.type}
                </p>
                {pendingMedia.type === 'audio' && (
                  <audio src={pendingMedia.preview} controls className="h-7 w-full mt-2" />
                )}
                {pendingMedia.type === 'video' && (
                  <video src={pendingMedia.preview} controls className="h-16 w-full mt-2 rounded" />
                )}
              </div>
              
              {/* Delete button - prominent */}
              <Button
                variant="destructive"
                size="icon"
                className="h-8 w-8 rounded-full shrink-0"
                onClick={clearPendingMedia}
                title="Remove attachment"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glassmorphic Input Container */}
      <div className="flex items-center gap-1.5 p-2 bg-background/30 backdrop-blur-xl rounded-full border border-primary/20 shadow-lg">
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Attachment button */}
        {showAttach && !isRecording && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-primary/10 flex-shrink-0"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              title="Attach media"
            >
              <Paperclip className="h-4 w-4 text-foreground/60" />
            </Button>
            
            <AnimatePresence>
              {showAttachMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute bottom-full left-0 mb-2 bg-background/95 backdrop-blur-xl border border-primary/20 rounded-lg p-1 shadow-lg z-50 min-w-[140px]"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 h-8 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Image className="h-4 w-4 text-blue-400" />
                    Photo
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 h-8 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileText className="h-4 w-4 text-amber-400" />
                    Document
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 h-8 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Video className="h-4 w-4 text-purple-400" />
                    Video
                  </Button>
                  <div className="border-t border-primary/10 my-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 h-8 text-xs text-purple-400 hover:text-purple-300"
                    onClick={() => {
                      setShowAttachMenu(false);
                      handleLiveVideoToggle();
                    }}
                    disabled={isVideoInitializing}
                  >
                    <Camera className="h-4 w-4 text-purple-400" />
                    {isVideoInitializing ? 'Starting...' : 'Record Live Video'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 h-8 text-xs text-green-400 hover:text-green-300"
                    onClick={() => {
                      setShowAttachMenu(false);
                      handleVoiceNoteToggle();
                    }}
                  >
                    <Circle className="h-4 w-4 text-red-400" />
                    Record Voice Note
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 h-8 text-xs"
                    onClick={() => audioInputRef.current?.click()}
                  >
                    <Mic className="h-4 w-4 text-green-400" />
                    Upload Audio
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Export/Download button */}
        {showExport && messages.length > 0 && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-primary/10 flex-shrink-0"
              onClick={() => setShowExportMenu(!showExportMenu)}
              title="Download chat history"
            >
              <Download className="h-4 w-4 text-foreground/60" />
            </Button>
            
            <AnimatePresence>
              {showExportMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute bottom-full left-0 mb-2 bg-background/95 backdrop-blur-xl border border-primary/20 rounded-lg p-1 shadow-lg z-50 min-w-[120px]"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 h-8 text-xs"
                    onClick={handleExportText}
                  >
                    <FileText className="h-4 w-4 text-green-400" />
                    Export as Text
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 h-8 text-xs"
                    onClick={handleExportPDF}
                  >
                    <FileText className="h-4 w-4 text-red-400" />
                    Export as PDF
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Text Input */}
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          onKeyDown={handleKeyDown}
          placeholder={pendingMedia ? "Add a message..." : placeholder}
          className="flex-1 h-8 text-sm rounded-full bg-foreground/5 border-0 placeholder:text-foreground/40 focus-visible:ring-1 focus-visible:ring-primary/30"
          disabled={isLoading || disabled}
        />

        {/* Mic button */}
        {showMic && onToggleListening && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-full flex-shrink-0 transition-all",
              isListening ? "bg-red-500/20 hover:bg-red-500/30" : "hover:bg-primary/10"
            )}
            onClick={onToggleListening}
            disabled={isLoading || disabled}
            title={isListening ? "Stop listening" : "Start voice input"}
          >
            {isListening ? (
              <MicOff className="h-4 w-4 text-red-400" />
            ) : (
              <Mic className="h-4 w-4 text-foreground/60" />
            )}
          </Button>
        )}

        {/* Send button */}
        <Button
          size="icon"
          className={cn(
            "h-8 w-8 rounded-full shadow-md transition-all flex-shrink-0",
            (input.trim() || pendingMedia) && !isLoading && !disabled
              ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
          onClick={handleSend}
          disabled={(!input.trim() && !pendingMedia) || isLoading || disabled}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};
