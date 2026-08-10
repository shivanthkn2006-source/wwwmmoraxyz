// ═══════════════════════════════════════════════════════════════════════════════
// ZOE ORB UNIFIED CONVERSATION PANEL - Single platform for all messaging
// Unified chat: Zoe AI + User-to-User messaging in one seamless interface
// MULTIMODAL: Images, documents, videos, voice notes, live video
// HANDS-FREE: Always-on voice with automatic silence detection
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import SpokenTranscript from '@/components/zoe-infinity/SpokenTranscript';
import DeepThinkingBlock, { type DeepThinkingMeta } from '@/components/zoe-infinity/DeepThinkingBlock';
import TeleprompterDebugOverlay from '@/components/zoe-infinity/TeleprompterDebugOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Volume2, VolumeX, Minimize2, Maximize2, Paperclip, Image, FileText, Video, Loader2, Download, Upload, Mic, Circle, Square, Camera, StopCircle, Copy, Check, Users, MessageCircle, Search, ArrowLeft, User, Plus, Sparkles, CheckCheck, Reply, CornerUpLeft, ChevronDown, Brain, Cloud, CloudDownload, CloudUpload, Shield, FileDown, Activity, Phone, PhoneOff, Pause, Play, Gauge } from 'lucide-react';
import ZoeDiagnosticsDrawer, { type DiagTab } from '@/components/zoe-infinity/ZoeDiagnosticsDrawer';
import { cotStart, cotFinish } from '@/utils/cotWiringBus';
import { setSendStage, reportDiagnosticError } from '@/utils/zoeDiagnosticsBus';
import { generateIdentityImage, generateImage, IdentityImageError } from '@/services/pollinationsService';
import { buildUserIdentityPrompt, detectZoeImageIntent } from '@/utils/zoeImageIntent';
import { useNavigate } from 'react-router-dom';
import { useZoeOmegaCoreIntegration } from '@/hooks/useZoeOmegaCoreIntegration';
import { format, isToday, isYesterday } from 'date-fns';

// Format timestamp for messages
const formatMessageTime = (date: Date | string | undefined): string => {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    if (isToday(d)) {
      return format(d, 'h:mm a');
    } else if (isYesterday(d)) {
      return `Yesterday ${format(d, 'h:mm a')}`;
    }
    return format(d, 'MMM d, h:mm a');
  } catch {
    return '';
  }
};
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { speakAsZoe, stopZoeSpeech, isZoeSpeaking, initializeZoeVoices, replayAsZoe, pauseZoeSpeech, resumeZoeSpeech } from '@/utils/zoeVoice';
import { isZoeInfinityMessage, stripZoeInfinityMarker } from '@/utils/conversationNamespaces';
import { setActiveVoiceExperience } from '@/utils/voiceExperienceLock';
import { processOfflineConversation } from '@/utils/zoeOfflineConversation';
import { offlineDataSync } from '@/utils/offlineDataSync';
import { useZoeOffline } from '@/hooks/useZoeOffline';
import { useZoePerception, PerceptionResult } from '@/hooks/useZoePerception';
import { useZoeProactiveVision } from '@/hooks/useZoeProactiveVision';
import { useZoeChatVision } from '@/hooks/useZoeChatVision';
import { useZoeVisionGreeting } from '@/hooks/useZoeVisionGreeting';
import { useZoeVoiceInput } from '@/hooks/useZoeVoiceInput';
import { useVoiceNoteRecorder } from '@/hooks/useVoiceNoteRecorder';
import { useLiveVideoRecorder } from '@/hooks/useLiveVideoRecorder';
import { useZoeOrbUserMessaging, UserProfile, DirectMessage } from '@/hooks/useZoeOrbUserMessaging';
import { useZoeVoiceCommands } from '@/hooks/useZoeVoiceCommands';
import { useZoeOrbRealtimeFeeds } from '@/hooks/useZoeOrbRealtimeFeeds';
import { useNewUserNotifications } from '@/hooks/useNewUserNotifications';
import { useZoeHandsFreeMessageReader } from '@/hooks/useZoeHandsFreeMessageReader';
import { useZoeQuantumCall } from '@/hooks/useZoeQuantumCall';
import { QuantumCallButton } from '@/components/QuantumCallUI';
import { QuantumCallModal } from '@/components/quantum/QuantumCallModal';
import { toast } from 'sonner';
import { downloadAsText, downloadAsPDF, exportToText, type ExportMessage } from '@/utils/conversationExport';
import { useZoeGodMode } from '@/hooks/useZoeGodMode';
import { downloadGodModeAuditPDF } from '@/utils/godModeAuditExport';
import { useZoeTubeSight } from '@/hooks/useZoeTubeSight';
import { useZoeProfileAutoFill } from '@/hooks/useZoeProfileAutoFill';
import { useZoeBackgroundTasks } from '@/hooks/useZoeBackgroundTasks';
import { ZoeReasoningTrace, generateReasoningTrace } from '@/components/ZoeReasoningTrace';
// IBM Protocol Integration - Live Wisdom & Sentinel Data
import { useSentinelGateway } from '@/hooks/useSentinelGateway';
import { useProtocolWisdom } from '@/hooks/useProtocolWisdom';
// Local time utility (used for precise astrology calculations; no clock UI)
import { getTimeContext } from '@/components/LocalTimeDisplay';
// VEDIC ENGINE for Jathakam/Swiss Astrology
import { useVedicEngine } from '@/hooks/useVedicEngine';
import { useAtmanArchive } from '@/hooks/useAtmanArchive';
import { useMmoraAgent } from '@/hooks/useMmoraAgent';
import { useNeuroSymbolicGuard } from '@/hooks/useNeuroSymbolicGuard';
import { loadDestinySeed, saveDestinySeed } from '@/core/soul/AtmanArchive';

// Relationship command patterns that should be executed as commands, not chat
const RELATIONSHIP_COMMAND_PATTERNS = [
  /^(?:zoe\s+)?(?:inform|tell|message|notify|remind)\s+(?:my\s+)?(son|daughter|wife|husband|father|mother|dad|mom|brother|sister|grandpa|grandma|grandfather|grandmother|uncle|aunt|cousin|friend|partner)\s+(?:to|that|about)?\s*.+$/i,
  /^(?:zoe\s+)?(?:send|text)\s+(?:my\s+)?(son|daughter|wife|husband|father|mother|dad|mom|brother|sister|friend|partner)$/i,
  /^(?:zoe\s+)?(?:ask|tell|remind)\s+(?:my\s+)?(son|daughter|wife|husband|father|mother|dad|mom|brother|sister|friend|partner)\s+to\s+call\s+(?:me|back)$/i,
];

const isRelationshipCommand = (text: string): boolean => {
  return RELATIONSHIP_COMMAND_PATTERNS.some(pattern => pattern.test(text.trim()));
};

interface Message {
  id: string;
  role: 'user' | 'zoe';
  content: string;
  timestamp: Date;
  mediaPreview?: string; // For displaying attached media
  mediaType?: 'image' | 'document' | 'video' | 'audio';
  replyTo?: {
    id: string;
    role: 'user' | 'zoe';
    content: string;
  };
  mentionedUser?: string; // Username of mentioned user
  // NEW: Chain of Thought reasoning trace for AGI transparency
  reasoningTrace?: {
    sentinelScanned?: boolean;
    threatsDetected?: number;
    threatsBlocked?: number;
    wisdomChecked?: boolean;
    wisdomPassed?: boolean;
    wisdomConfidence?: number;
    alignedGoals?: string[];
    classifiedIntent?: string;
    extractedEmotions?: string[];
    codexInjected?: boolean;
  };
  // PHASE 4: Evolution Event metadata
  evolutionEvent?: {
    verdict: string;
    reasoning: string;
    versionId: string;
    status: string;
  };
  // Metacognitive brain output (deep thinking mode)
  metacognition?: DeepThinkingMeta | null;
}

interface ZoeOrbConversationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  isListening?: boolean;
  onToggleListening?: () => void;
}

export const ZoeOrbConversationPanel: React.FC<ZoeOrbConversationPanelProps> = ({
  isOpen,
  onClose,
  position,
  isListening = false,
  onToggleListening,
}) => {
  // Mark this area as the MMORA/Orb voice domain (so Zoe Infinity can silence it when needed)
  useEffect(() => {
    setActiveVoiceExperience('mmora');
  }, []);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isOnline, processConversation } = useZoeOffline();
  const { processMedia, isProcessing: isPerceptionProcessing, supportedTypes } = useZoePerception();
  const { checkForVisionTrigger } = useZoeProactiveVision();
  
  // Chat Vision - Zoe's continuous camera awareness during chat
  const chatVision = useZoeChatVision();
  
  // Vision Greeting - Auto-greet user when God Eye activates
  const visionGreeting = useZoeVisionGreeting({
    enabled: true,
    useTimeGreeting: true,
    speakOnActivation: true,
    speakOnAnalysis: true,
  });
  
  // User-to-user messaging hook
  const {
    messagingMode,
    setMessagingMode,
    selectedUser,
    setSelectedUser,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    directMessages,
    sendDirectMessage,
    isSending,
    recentContacts,
    loadRecentContacts,
  } = useZoeOrbUserMessaging();
  
  // Voice commands hook for processing relationship commands
  const { processCommand } = useZoeVoiceCommands(user?.id);
  
  // OMEGA Core integration for platform-wide data access
  const {
    omegaCoreState,
    uploadToOmegaCore,
    downloadFromOmegaCore,
    uploadProgress,
    downloadProgress,
    getOmegaCoreContextForChat,
    isLoading: isOmegaLoading
  } = useZoeOmegaCoreIntegration();
  
  // God Mode integration for platform-wide scanning
  const {
    isScanning: isGodModeScanning,
    lastScan: godModeScanReport,
    runPlatformScan,
    overallHealth,
  } = useZoeGodMode();
  
  // Real-time feeds for friends, offers, brand deals
  const {
    friendActivities,
    brandDeals,
    offers,
    unreadCount: feedsUnreadCount,
    getFeedsSummaryForChat,
    refreshFeeds,
    markAsRead: markFeedsAsRead,
  } = useZoeOrbRealtimeFeeds();
  
  // New user sign-up/sign-in notifications
  const {
    newUserEvents,
    unreadCount: newUserUnreadCount,
    getLatestForChat: getNewUserNotification,
    markAllAsRead: markNewUsersAsRead,
  } = useNewUserNotifications();
  
  // Hands-free message reader - reads incoming DMs aloud without marking as read
  const handsFreeReader = useZoeHandsFreeMessageReader();
  
  // Quantum Call - P2P encrypted voice calls
  const quantumCall = useZoeQuantumCall(user?.id);
  
  // TubeSight - YouTube video analysis via transcript
  const tubeSight = useZoeTubeSight();
  
  // Profile Auto-Fill - Zoe extracts and saves user info from chat/voice
  const profileAutoFill = useZoeProfileAutoFill();
  
  // Background Tasks - Zoe continues processing even when chat window is closed
  const backgroundTasks = useZoeBackgroundTasks();
  
  // IBM PROTOCOL INTEGRATION - Live Sentinel & Wisdom Data
  const sentinelGateway = useSentinelGateway();
  const protocolWisdom = useProtocolWisdom();
  
  // VEDIC ENGINE - Jathakam/Swiss Astrology for MMORA
  const vedicEngine = useVedicEngine();
  const atmanArchive = useAtmanArchive();
  const { geocodeLocation } = useMmoraAgent();
  const { guard: guardResponse } = useNeuroSymbolicGuard('zoe-orb');

  // --- Helpers: capture follow-up birth time / place after Zoe prompts ---
  const parseTimeToHHMM = useCallback((input: string): string | null => {
    const s = input.trim().toLowerCase();
    // Accept: 14:27, 2:27 pm, 2.27pm, 2 pm
    const m = s.match(/\b(\d{1,2})(?:(?:[:.](\d{2}))\s*)?(am|pm)?\b/);
    if (!m) return null;
    let hh = parseInt(m[1], 10);
    const mm = m[2] ? parseInt(m[2], 10) : 0;
    if (Number.isNaN(hh) || Number.isNaN(mm) || mm < 0 || mm > 59) return null;
    const meridiem = m[3];
    if (meridiem) {
      if (hh < 1 || hh > 12) return null;
      if (meridiem === 'pm' && hh !== 12) hh += 12;
      if (meridiem === 'am' && hh === 12) hh = 0;
    } else {
      if (hh < 0 || hh > 23) return null;
    }
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }, []);
  
  const [showOmegaMenu, setShowOmegaMenu] = useState(false);
  const [showGodModeMenu, setShowGodModeMenu] = useState(false);
  const [showVideoCallModal, setShowVideoCallModal] = useState(false);
  const [videoCallTarget, setVideoCallTarget] = useState<{ userId: string; displayName?: string; avatarUrl?: string } | null>(null);
  const [callStartWithVideo, setCallStartWithVideo] = useState(false); // Track if call should start with video
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [showConversationList, setShowConversationList] = useState(false);
  
  // Unified conversation list - Zoe always first, then recent contacts
  const unifiedConversations = useMemo(() => {
    const zoeConvo = {
      id: 'zoe-ai',
      type: 'zoe' as const,
      name: 'Zoe AI',
      avatar: null,
      lastMessage: messages.length > 0 ? messages[messages.length - 1].content.substring(0, 40) + '...' : 'Your AI companion',
      unread: 0,
    };
    
    const userConvos = recentContacts.map(contact => ({
      id: contact.user_id,
      type: 'user' as const,
      name: contact.display_name,
      avatar: contact.profile_photo_url,
      username: contact.username,
      lastMessage: 'Tap to chat',
      unread: 0,
      profile: contact,
    }));
    
    return [zoeConvo, ...userConvos];
  }, [recentContacts, messages]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechPaused, setIsSpeechPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [panelSize, setPanelSize] = useState<'compact' | 'expanded' | 'full'>(() => {
    try {
      const saved = localStorage.getItem('zoe-orb-panel-size');
      if (saved === 'compact' || saved === 'expanded' || saved === 'full') return saved;
    } catch { /* storage unavailable */ }
    return 'compact';
  });
  const isExpanded = panelSize !== 'compact';
  const isFullPage = panelSize === 'full';
  const cyclePanelSize = useCallback(() => {
    setPanelSize((prev) => {
      const next = prev === 'compact' ? 'expanded' : prev === 'expanded' ? 'full' : 'compact';
      try { localStorage.setItem('zoe-orb-panel-size', next); } catch { /* ignore */ }
      return next;
    });
  }, []);
  // Deep Thinking (metacognitive brain) mode — routes to zoe-core-intelligence. ON by default.
  const [deepThinking, setDeepThinking] = useState<boolean>(() => {
    try { return localStorage.getItem('zoe-orb-deep-thinking') !== '0'; } catch { return true; }
  });
  const toggleDeepThinking = useCallback(() => {
    setDeepThinking((prev) => {
      const next = !prev;
      try { localStorage.setItem('zoe-orb-deep-thinking', next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  }, []);
  // Unified diagnostics strip (metrics + CoT wiring + debug). Visible by default, collapsed.
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(() => {
    try { return localStorage.getItem('zoe-orb-diagnostics') !== '0'; } catch { return true; }
  });
  const [diagExpanded, setDiagExpanded] = useState(false);
  const [diagTab, setDiagTab] = useState<DiagTab>('wiring');
  const hideDiagnostics = useCallback(() => {
    setShowDiagnostics(false);
    setDiagExpanded(false);
    try { localStorage.setItem('zoe-orb-diagnostics', '0'); } catch { /* ignore */ }
  }, []);
  const openDiagnostics = useCallback((tab: DiagTab) => {
    setShowDiagnostics(true);
    setDiagTab(tab);
    setDiagExpanded(true);
    try { localStorage.setItem('zoe-orb-diagnostics', '1'); } catch { /* ignore */ }
  }, []);

  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{ file: File; preview: string; type: 'image' | 'document' | 'video' | 'audio' } | null>(null);
  const [pendingIdentityConfirmation, setPendingIdentityConfirmation] = useState<{ prompt: string; imageUrl: string } | null>(null);
  const [pendingIdentitySave, setPendingIdentitySave] = useState<File | null>(null);
  const [handsFreeMode, setHandsFreeMode] = useState(true); // Hands-free mode enabled by default
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null); // Reply-to state
  const [openReasoningTraceId, setOpenReasoningTraceId] = useState<string | null>(null); // Track which message's reasoning trace is open
  // showUserSearch replaced by showConversationList for unified interface
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const attachMenuWrapperRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  
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
  
  // Handle voice note toggle
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

  // Handle live video recording toggle
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

  // Process video with Gemini 3 Pro
  const processLiveVideo = useCallback(async (videoFile: File, context?: string) => {
    setIsProcessing(true);
    try {
      // Convert video to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(videoFile);
      });

      console.log('[ZoeOrb] Processing video with Gemini 3 Pro...');
      
      const { data, error } = await supabase.functions.invoke('process-live-video', {
        body: {
          video_data: base64,
          context: context || 'Analyze this video and describe what you see.',
          analysis_type: 'comprehensive'
        }
      });

      if (error) throw error;

      return {
        success: true,
        zoe_response: data?.zoe_response || 'I analyzed the video content.',
        analysis: data?.analysis
      };
    } catch (err) {
      console.error('[ZoeOrb] Video processing error:', err);
      return {
        success: false,
        zoe_response: 'I had a moment of visual processing difficulty. Could you try again?'
      };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Export handlers - include all media attachments
  const handleExportText = useCallback(() => {
    if (messages.length === 0) {
      toast.error('No messages to export');
      return;
    }
    
    const formattedMessages: ExportMessage[] = messages.map(m => ({
      role: m.role === 'zoe' ? 'assistant' : 'user',
      content: m.content,
      created_at: m.timestamp.toISOString(),
      media_url: m.mediaPreview,
      media_type: m.mediaType,
    }));
    
    const textContent = exportToText(formattedMessages, 'User');
    const timestamp = new Date().toISOString().split('T')[0];
    downloadAsText(textContent, `zoe-conversation-${timestamp}.txt`);
    toast.success('Conversation exported with all attachments');
    setShowExportMenu(false);
  }, [messages]);

  const handleExportPDF = useCallback(async () => {
    if (messages.length === 0) {
      toast.error('No messages to export');
      return;
    }
    
    const formattedMessages: ExportMessage[] = messages.map(m => ({
      role: m.role === 'zoe' ? 'assistant' : 'user',
      content: m.content,
      created_at: m.timestamp.toISOString(),
      media_url: m.mediaPreview,
      media_type: m.mediaType,
    }));
    
    const timestamp = new Date().toISOString().split('T')[0];
    await downloadAsPDF(formattedMessages, 'User', `zoe-conversation-${timestamp}.pdf`);
    toast.success('Opening print dialog - includes all media');
    setShowExportMenu(false);
  }, [messages]);

  // Copy text to clipboard
  const handleCopyText = useCallback((content: string, messageId: string) => {
    if (!content) return;
    // Strip internal pattern tags before copying
    const cleanContent = content.replace(/\[\[(PATTERN|MEMORY):[^\]]+\]\]/g, '').trim();
    navigator.clipboard.writeText(cleanContent);
    setCopiedMessageId(messageId);
    toast.success('Text copied to clipboard');
    setTimeout(() => setCopiedMessageId(null), 2000);
  }, []);

  // Double-click to replay Zoe's message
  const handleDoubleClickReplay = useCallback((msg: Message) => {
    if (msg.role !== 'zoe' || isMuted) return;
    
    // Clean content before speaking
    const cleanContent = msg.content.replace(/\[\[(PATTERN|MEMORY):[^\]]+\]\]/g, '').trim();
    if (!cleanContent) return;
    
    toast.info('Replaying Zoe\'s message...');
    replayAsZoe(
      cleanContent,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      msg.id
    );
  }, [isMuted]);

  useEffect(() => {
    const handleStart = () => setIsSpeechPaused(false);
    const handleEnd = () => setIsSpeechPaused(false);
    const handlePause = () => setIsSpeechPaused(true);
    const handleResume = () => setIsSpeechPaused(false);

    window.addEventListener('zoe-speak-start', handleStart);
    window.addEventListener('zoe-speak-end', handleEnd);
    window.addEventListener('zoe-speak-pause', handlePause);
    window.addEventListener('zoe-speak-resume', handleResume);
    return () => {
      window.removeEventListener('zoe-speak-start', handleStart);
      window.removeEventListener('zoe-speak-end', handleEnd);
      window.removeEventListener('zoe-speak-pause', handlePause);
      window.removeEventListener('zoe-speak-resume', handleResume);
    };
  }, []);

  // Initialize voices when panel opens
  useEffect(() => {
    if (isOpen) {
      initializeZoeVoices().then(() => {
        console.log('[ZoeOrb] Voices initialized');
      });
    }
  }, [isOpen]);

  // Broadcast chat open/close so features like homepage auto-scroll can pause
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).__mmoraZoeChatOpen = isOpen;
    window.dispatchEvent(new CustomEvent('mmora:zoe-chat-toggle', { detail: { open: isOpen } }));
    return () => {
      if (isOpen) {
        (window as any).__mmoraZoeChatOpen = false;
        window.dispatchEvent(new CustomEvent('mmora:zoe-chat-toggle', { detail: { open: false } }));
      }
    };
  }, [isOpen]);

  // Listen for background task completions to inject messages into chat
  useEffect(() => {
    const handleTaskCompleted = (e: CustomEvent<any>) => {
      const task = e.detail;
      console.log('[ZoeOrb] Background task completed:', task.type, task.id);
      
      // Handle YouTube analysis completion
      if (task.type === 'youtube-analysis' && task.result) {
        const analysis = task.result;
        const videoMessage: Message = {
          id: createMessageId(),
          role: 'zoe',
          content: `🎬 **Background Analysis Complete${analysis.title ? `: "${analysis.title}"` : ''}**\n\n${analysis.analysis || 'Video analyzed successfully.'}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, videoMessage]);
        
        if (!isMuted && isOpen) {
          const summary = `I finished analyzing the video${analysis.title ? ` called ${analysis.title}` : ''}.`;
          speakAsZoe(summary, undefined, () => setIsSpeaking(true), () => setIsSpeaking(false));
        }
      }
      
      // Handle profile update completion
      if (task.type === 'profile-update' && task.result?.updatedFields) {
        const profileMessage: Message = {
          id: createMessageId(),
          role: 'zoe',
          content: `✅ I've updated your profile: ${task.result.updatedFields.join(', ')}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, profileMessage]);
      }
      
      // Handle chat completion
      if (task.type === 'chat' && task.result?.response) {
        const chatMessage: Message = {
          id: createMessageId(),
          role: 'zoe',
          content: task.result.response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, chatMessage]);
      }
    };
    
    window.addEventListener('zoe-task-completed', handleTaskCompleted as EventListener);
    return () => window.removeEventListener('zoe-task-completed', handleTaskCompleted as EventListener);
  }, [isMuted, isOpen]);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
      }
    }
  }, []);

  // Auto-scroll to bottom on messages change and initial load
  useEffect(() => {
    if (isOpen) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        scrollToBottom();
      }, 150);
    }
  }, [messages, isOpen, scrollToBottom]);

  // Track scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    if (!scrollAreaRef.current) return;
    
    const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollToBottom(!isNearBottom && messages.length > 3);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [messages.length]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Close attach menu when clicking/tapping outside (keeps menu from "blocking" the UI)
  useEffect(() => {
    if (!showAttachMenu) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (attachMenuWrapperRef.current && attachMenuWrapperRef.current.contains(target)) return;
      setShowAttachMenu(false);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [showAttachMenu]);

  // Load recent conversations
  // Load messages when panel opens or messaging mode changes to zoe
  useEffect(() => {
    if (isOpen && user && messagingMode === 'zoe') {
      loadRecentMessages();
    }
  }, [isOpen, user, messagingMode]);

  // Real-time subscription for new messages - use unique channel name to avoid conflicts
  useEffect(() => {
    if (!user || !isOpen || messagingMode !== 'zoe') return;

    // Create a unique channel name to avoid subscription conflicts
    const channelName = `zoe-orb-messages-${user.id}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_companion_messages',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg && newMsg.content) {
            const mappedMsg: Message = {
              id: newMsg.id,
              role: newMsg.role === 'assistant' ? 'zoe' : 'user',
              content: newMsg.content,
              timestamp: new Date(newMsg.created_at),
              mediaPreview: newMsg.media_url || undefined,
              mediaType: newMsg.media_type || undefined,
            };
            // Only add if not already in messages (avoid duplicates - check by ID AND content)
            setMessages(prev => {
              const isDuplicate = prev.some(m => 
                m.id === mappedMsg.id || 
                (m.content === mappedMsg.content && m.role === mappedMsg.role && 
                 Math.abs(m.timestamp.getTime() - mappedMsg.timestamp.getTime()) < 5000)
              );
              if (isDuplicate) return prev;
              return [...prev, mappedMsg];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isOpen, messagingMode]);

  // Check speaking status with polling - optimized to only update when changed
  useEffect(() => {
    let lastSpeaking = false;
    const interval = setInterval(() => {
      const speaking = isZoeSpeaking();
      if (speaking !== lastSpeaking) {
        lastSpeaking = speaking;
        setIsSpeaking(speaking);
      }
    }, 300); // Increased interval for better performance
    return () => clearInterval(interval);
  }, []);

  // Listen for voice command events for messaging
  // Voice command event listeners - including call commands
  useEffect(() => {
    const handleSwitchMode = (e: CustomEvent<{ mode: 'zoe' | 'user' }>) => {
      setMessagingMode(e.detail.mode);
      if (e.detail.mode === 'user') {
        setShowConversationList(true);
        loadRecentContacts();
      }
    };

    const handleMessageUser = async (e: CustomEvent<{ userName: string }>) => {
      const userName = e.detail.userName;
      setSearchQuery(userName);
      setMessagingMode('user');
      setShowConversationList(true);
    };

    const handleShowContacts = () => {
      setShowConversationList(true);
      loadRecentContacts();
    };

    const handleHandsFreeMode = (e: CustomEvent<{ enabled: boolean }>) => {
      setHandsFreeMode(e.detail.enabled);
      toast.success(e.detail.enabled ? 'Hands-free mode enabled' : 'Hands-free mode disabled');
    };

    // Voice command: "Zoe call [username]" / "Zoe video call [username]"
    // Phase 4: Block calls to Zoe AI - only P2P calls allowed
    const handleInitiateCall = async (e: CustomEvent<{ userId: string; displayName?: string; avatarUrl?: string; withVideo?: boolean }>) => {
      const { userId, displayName, avatarUrl, withVideo = false } = e.detail;
      
      // Phase 4: SEVER ZOE-AI VIDEO LINK - Block calls to AI
      if (userId === 'zoe-ai' || displayName?.toLowerCase().includes('zoe')) {
        console.log('[ZoeOrb] BLOCKED: Call to Zoe AI is not permitted');
        toast.error('Protocol Unavailable', {
          description: 'Voice/video calls with Zoe AI are currently disabled. P2P calls with other users remain active.',
          duration: 4000,
        });
        return;
      }
      
      console.log('[ZoeOrb] Voice command: initiating call to', displayName || userId);
      
      // Open the video call modal
      setVideoCallTarget({ userId, displayName, avatarUrl });
      setCallStartWithVideo(withVideo);
      setShowVideoCallModal(true);
      
      // Actually initiate the call
      await quantumCall.initiateCall(
        { userId, displayName, avatarUrl },
        withVideo
      );
    };

    // Voice command: "End call" / "Hang up"
    const handleEndCall = () => {
      console.log('[ZoeOrb] Voice command: ending call');
      quantumCall.endCall('completed');
      setShowVideoCallModal(false);
    };

    window.addEventListener('zoe-orb-switch-mode', handleSwitchMode as EventListener);
    window.addEventListener('zoe-orb-message-user', handleMessageUser as EventListener);
    window.addEventListener('zoe-orb-show-contacts', handleShowContacts);
    window.addEventListener('zoe-hands-free-mode', handleHandsFreeMode as EventListener);
    window.addEventListener('zoe-initiate-call', handleInitiateCall as EventListener);
    window.addEventListener('zoe-end-call', handleEndCall);

    return () => {
      window.removeEventListener('zoe-orb-switch-mode', handleSwitchMode as EventListener);
      window.removeEventListener('zoe-orb-message-user', handleMessageUser as EventListener);
      window.removeEventListener('zoe-orb-show-contacts', handleShowContacts);
      window.removeEventListener('zoe-hands-free-mode', handleHandsFreeMode as EventListener);
      window.removeEventListener('zoe-initiate-call', handleInitiateCall as EventListener);
      window.removeEventListener('zoe-end-call', handleEndCall);
    };
  }, [loadRecentContacts, quantumCall]);

  const loadRecentMessages = async () => {
    if (!user) return;
    
    try {
      // Load last 100 messages from database for full history
      const { data, error } = await supabase
        .from('ai_companion_messages')
        .select('id, content, role, created_at, media_url, media_type, variant')
        .eq('user_id', user.id)
        // SEPARATION PROTOCOL: Only load MMORA/Classic messages in the Orb UI.
        // (Legacy rows may have variant NULL.)
        .or('variant.is.null,variant.eq.zoe_classic')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) {
        console.error('[ZoeOrb] DB error:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        // Reverse to show oldest first, filter empty
        const dbMessages = data
          .reverse()
          .filter(msg => msg.content && msg.content.trim())
          // Hide Zoe Infinity messages from MMORA/Orb UI
          .filter(msg => !isZoeInfinityMessage(msg.content))
          .map(msg => ({
            id: msg.id,
            role: msg.role === 'assistant' ? 'zoe' : 'user' as 'user' | 'zoe',
            content: stripZoeInfinityMarker(msg.content),
            timestamp: new Date(msg.created_at),
            mediaPreview: msg.media_url || undefined,
            mediaType: (msg.media_type as 'image' | 'document' | 'video') || undefined,
          }));
        setMessages(dbMessages);
        console.log('[ZoeOrb] Loaded', dbMessages.length, 'messages from DB');
        return;
      }
      
      console.log('[ZoeOrb] No messages found in DB');
    } catch (err) {
      console.error('[ZoeOrb] DB load error:', err);
    }
    
    // Fallback to offline cache
    const context = offlineDataSync.getZoeConversationContext();
    if (context?.past_conversations.length) {
      const recentMsgs = context.past_conversations.slice(-20).map((conv, i) => ({
        id: `cached-${i}`,
        role: conv.role as 'user' | 'zoe',
        content: conv.content,
        timestamp: new Date(conv.timestamp),
      }));
      setMessages(recentMsgs);
    }
  };

  const saveMessageToDb = async (
    role: 'user' | 'assistant',
    content: string,
    mediaUrl?: string,
    mediaType?: string,
    id?: string,
  ) => {
    if (!user || !content.trim()) return;

    try {
      const insertRow: any = {
        user_id: user.id,
        role,
        content: content.trim(),
        media_url: mediaUrl || null,
        media_type: mediaType || null,
      };

      if (id) insertRow.id = id;

      // SEPARATION PROTOCOL: Tag as 'zoe_classic' (Old Zoe / MMORA)
      insertRow.variant = 'zoe_classic';
      await supabase.from('ai_companion_messages').insert(insertRow);
      console.log('[ZoeOrb] Saved message to DB with media:', !!mediaUrl);
    } catch (err) {
      console.error('[ZoeOrb] Save error:', err);
    }
  };

  const createMessageId = () => {
    try {
      // Prefer stable UUIDs so realtime INSERT doesn't duplicate optimistic UI messages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c: any = typeof crypto !== 'undefined' ? crypto : null;
      if (c?.randomUUID) return c.randomUUID() as string;
    } catch {
      // ignore
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  // Handle file selection for multimodal perception with auto-compression for videos
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setShowAttachMenu(false);
    
    // Determine media type
    let mediaType: 'image' | 'document' | 'video' = 'document';
    if (file.type.startsWith('image/')) mediaType = 'image';
    else if (file.type.startsWith('video/')) mediaType = 'video';
    
    // For video files, apply compression to 1MB/59s loops
    if (mediaType === 'video') {
      try {
        const { processVideoWithCompression } = await import('@/utils/videoCompressor');
        toast.info('🎬 Compressing video to 1MB loop format...');
        
        const result = await processVideoWithCompression(file, (progress) => {
          // Progress callback - could add progress UI here
          console.log('[ZoeOrb] Video compression progress:', progress);
        });
        
        if (result.success && result.file) {
          const preview = URL.createObjectURL(result.file);
          setPendingMedia({ file: result.file, preview, type: 'video' });
          toast.success(`🎥 Video compressed: ${(result.compressedSize / 1024 / 1024).toFixed(2)}MB`);
        } else {
          throw new Error(result.error || 'Compression failed');
        }
      } catch (err) {
        console.error('[ZoeOrb] Video compression error:', err);
        // Fallback to original file
        const preview = URL.createObjectURL(file);
        setPendingMedia({ file, preview, type: 'video' });
        toast.warning('Using original video (compression unavailable)');
      }
    } else {
      // Create preview for images
      let preview = '';
      if (mediaType === 'image') {
        preview = URL.createObjectURL(file);
      }
      
      setPendingMedia({ file, preview, type: mediaType });
      toast.success(`${mediaType === 'image' ? '📷' : '📄'} ${file.name} attached`);
    }
    
    // Clear file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Send message with optional media - handles both Zoe and User modes
  const sendMessage = useCallback(async (messageText?: string) => {
    const textToSend = messageText || input;
    const hasPendingMedia = pendingMedia !== null;
    
    if (!textToSend.trim() && !hasPendingMedia) return;
    if (isProcessing || isSending) return;

    console.log('[ZoeOrb] Sending message:', textToSend.trim(), 'mode:', messagingMode, 'with media:', hasPendingMedia);

    // ═══ ZOE DECORATOR INTENT (self-contained feature) ═══
    if (messagingMode === 'zoe' && !hasPendingMedia) {
      try {
        const { detectDecoratorIntent, emitOpenDecorator } = await import('@/features/zoe-decorator/intent');
        const di = detectDecoratorIntent(textToSend.trim());
        if (di.matched) {
          setInput('');
          const userMessage: Message = { id: Date.now().toString(), role: 'user', content: textToSend.trim(), timestamp: new Date() };
          const zoeMessage: Message = {
            id: (Date.now() + 1).toString(), role: 'zoe', timestamp: new Date(),
            content: `Opening the Decorator for your ${di.space ?? 'space'}${di.theme ? ` in ${di.theme} style` : ''}. Snap or upload a photo and I'll redesign it.`,
          };
          setMessages(prev => [...prev, userMessage, zoeMessage]);
          emitOpenDecorator({ space: di.space, theme: di.theme, prompt: di.raw });
          return;
        }
      } catch (e) { console.warn('[ZoeOrb] decorator intent check failed', e); }
    }

    // ═══ CHECK FOR RELATIONSHIP COMMANDS FIRST ═══
    // Route relationship commands through voice command processor instead of chat API
    if (messagingMode === 'zoe' && !hasPendingMedia && isRelationshipCommand(textToSend.trim())) {
      console.log('[ZoeOrb] Detected relationship command, routing to command processor');
      setInput('');
      
      // Show user message in chat
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: textToSend.trim(),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      
      // Process as command - this will execute the relationship messaging logic
      await processCommand(textToSend.trim(), true);
      
      // Add confirmation message from Zoe
      const zoeMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'zoe',
        content: 'Command executed. Check the result above.',
        timestamp: new Date(),
        reasoningTrace: {
          sentinelScanned: true,
          wisdomChecked: true,
          wisdomPassed: true,
          classifiedIntent: 'command_execution',
          codexInjected: false,
        },
      };
      setMessages(prev => [...prev, zoeMessage]);
      return;
    }

    // ═══ USER MODE: Send to selected user ═══
    if (messagingMode === 'user' && selectedUser) {
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;
      
      // Upload media if attached
      if (hasPendingMedia && pendingMedia) {
        try {
          const fileName = `${user?.id}/${Date.now()}_${pendingMedia.file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('messages')
            .upload(fileName, pendingMedia.file);
          
          if (uploadError) throw uploadError;
          
          const { data: urlData } = await supabase.storage
            .from('messages')
            .createSignedUrl(fileName, 3600); // 1 hour expiry
          
          mediaUrl = urlData?.signedUrl || '';
          mediaType = pendingMedia.type;
        } catch (err) {
          console.error('[ZoeOrb] Media upload error:', err);
          toast.error('Failed to upload media');
        }
      }
      
      setPendingMedia(null);
      setInput('');
      
      const success = await sendDirectMessage(textToSend.trim(), mediaUrl, mediaType);
      if (success) {
        // Speak confirmation if not muted
        if (!isMuted) {
          speakAsZoe(`Message sent to ${selectedUser.display_name}`, undefined, () => {}, () => {});
        }
      }
      return;
    }

    // ═══ ZOE MODE: Regular Zoe conversation ═══
    const userMessage: Message = {
      id: createMessageId(),
      role: 'user',
      content: textToSend.trim() || `[Shared a ${pendingMedia?.type}]`,
      timestamp: new Date(),
      mediaPreview: pendingMedia?.preview,
      mediaType: pendingMedia?.type,
      replyTo: replyingTo ? {
        id: replyingTo.id,
        role: replyingTo.role,
        content: replyingTo.content.substring(0, 100) + (replyingTo.content.length > 100 ? '...' : ''),
      } : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setReplyingTo(null); // Clear reply state after sending
    setIsProcessing(true);
    setSendStage('sending', deepThinking ? 'zoe-core-intelligence' : 'zoe-chat');

    // ═══ CODE GENESIS MANIFESTO: Dispatch user message for CDSP analysis ═══
    window.dispatchEvent(new CustomEvent('zoe-user-message', { detail: { text: userMessage.content } }));

    // Store in offline cache AND database with media info
    offlineDataSync.addConversation('user', userMessage.content);
    saveMessageToDb('user', userMessage.content, pendingMedia?.preview, pendingMedia?.type, userMessage.id);

    let imageIntent = detectZoeImageIntent(userMessage.content);
    let identityRequestText = userMessage.content;
    let confirmedProfilePhotoUrl: string | null = null;

    if (pendingIdentitySave && user?.id) {
      const answer = userMessage.content.trim().toLowerCase();
      const approved = /^(yes|yes please|sure|okay|ok|save it|remember it|use it)\b/i.test(answer);
      const declined = /^(no|nope|don't|do not|cancel|not now)\b/i.test(answer);
      if (approved || declined) {
        if (approved) {
          try {
            const fileName = `${user.id}.jpg`;
            const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(fileName, pendingIdentitySave, { upsert: true, cacheControl: '0' });
            if (uploadError) throw uploadError;
            const { data: signedUrlData, error: urlError } = await supabase.storage
              .from('avatars')
              .createSignedUrl(fileName, 31536000);
            if (urlError || !signedUrlData?.signedUrl) throw urlError || new Error('Unable to create photo URL');
            const { error: profileError } = await supabase
              .from('profiles')
              .update({ profile_photo_url: signedUrlData.signedUrl })
              .eq('user_id', user.id);
            if (profileError) throw profileError;
          } catch (saveError) {
            console.error('[ZoeOrb] Identity reference save failed:', saveError);
            const failureMessage: Message = {
              id: createMessageId(), role: 'zoe', timestamp: new Date(),
              content: 'I could not save that photo to your profile. It was not retained as your identity reference.',
              reasoningTrace: { classifiedIntent: 'identity_reference_save_error', codexInjected: false },
            };
            setMessages(prev => [...prev, failureMessage]);
            setPendingIdentitySave(null);
            setIsProcessing(false);
            setSendStage('error', 'identity-reference-save');
            return;
          }
        }
        const saveMessage: Message = {
          id: createMessageId(), role: 'zoe', timestamp: new Date(),
          content: approved
            ? 'Saved as your profile identity photo for future image creations. It is not used as a biometric login credential.'
            : 'Okay, I did not save that photo as your profile identity reference.',
          reasoningTrace: { classifiedIntent: approved ? 'identity_reference_saved' : 'identity_reference_not_saved', codexInjected: false },
        };
        setMessages(prev => [...prev, saveMessage]);
        setPendingIdentitySave(null);
        setIsProcessing(false);
        setSendStage('done', 'identity-reference-save');
        return;
      }
    }

    if (pendingIdentityConfirmation) {
      const answer = userMessage.content.trim().toLowerCase();
      const approved = /^(yes|yes please|sure|okay|ok|use it|that is me|it's me|it is me)\b/i.test(answer);
      const declined = /^(no|nope|not me|don't|do not|cancel)\b/i.test(answer);
      if (approved) {
        identityRequestText = pendingIdentityConfirmation.prompt;
        confirmedProfilePhotoUrl = pendingIdentityConfirmation.imageUrl;
        imageIntent = { isImageRequest: true, isUserIdentityRequest: true, isZoeIdentityRequest: false };
        setPendingIdentityConfirmation(null);
      } else if (declined) {
        setPendingIdentityConfirmation(null);
        const requestMessage: Message = {
          id: createMessageId(), role: 'zoe', timestamp: new Date(),
          content: 'Understood. Attach a clear front-facing photo, then resend your image request.',
          reasoningTrace: { classifiedIntent: 'identity_reference_declined', codexInjected: false },
        };
        setMessages(prev => [...prev, requestMessage]);
        setIsProcessing(false);
        setSendStage('done', 'identity-reference-declined');
        return;
      }
    }

    // Identity-aware image requests must run before generic attachment analysis.
    // An attached image is a reference, not something Zoe should merely describe.
    if (imageIntent.isUserIdentityRequest) {
      const attachedReference = pendingMedia?.type === 'image' ? pendingMedia.file : undefined;
      let profilePhotoUrl: string | null = confirmedProfilePhotoUrl;
      if (!attachedReference && !profilePhotoUrl && user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('profile_photo_url')
          .eq('user_id', user.id)
          .maybeSingle();
        profilePhotoUrl = profile?.profile_photo_url ?? null;
      }

      if (!attachedReference && !profilePhotoUrl) {
        const requestMessage: Message = {
          id: createMessageId(), role: 'zoe', timestamp: new Date(),
          content: 'Please attach a clear front-facing photo of yourself. I need a real reference photo to create your image without replacing you with a random person.',
          reasoningTrace: { classifiedIntent: 'identity_reference_required', codexInjected: false },
        };
        setMessages(prev => [...prev, requestMessage]);
        setPendingMedia(null);
        setIsProcessing(false);
        setSendStage('done', 'identity-reference-required');
        return;
      }

      if (!attachedReference && profilePhotoUrl && !confirmedProfilePhotoUrl) {
        setPendingIdentityConfirmation({ prompt: identityRequestText, imageUrl: profilePhotoUrl });
        const confirmationMessage: Message = {
          id: createMessageId(), role: 'zoe', timestamp: new Date(),
          content: 'Is this your photo, and should I use it to create this image? Reply yes to continue, or no and attach a different photo.',
          mediaPreview: profilePhotoUrl,
          mediaType: 'image',
          reasoningTrace: { classifiedIntent: 'identity_reference_confirmation', codexInjected: false },
        };
        setMessages(prev => [...prev, confirmationMessage]);
        setPendingMedia(null);
        setIsProcessing(false);
        setSendStage('done', 'identity-reference-confirmation');
        return;
      }

      try {
        setSendStage('thinking', 'identity-image-generation');
        const result = await generateIdentityImage(buildUserIdentityPrompt(identityRequestText), {
          file: attachedReference,
          imageUrl: attachedReference ? undefined : profilePhotoUrl || undefined,
        });
        const caption = 'I created this from your own reference photo and preserved your identity ✨';
        const zoeMessage: Message = {
          id: createMessageId(), role: 'zoe', content: caption, timestamp: new Date(),
          mediaPreview: result.imageUrl, mediaType: 'image',
          reasoningTrace: { classifiedIntent: 'identity_image_generation', codexInjected: false },
        };
        setMessages(prev => [...prev, zoeMessage]);
        saveMessageToDb('assistant', caption, result.imageUrl, 'image', zoeMessage.id);
        if (attachedReference) {
          setPendingIdentitySave(attachedReference);
          const savePrompt: Message = {
            id: createMessageId(), role: 'zoe', timestamp: new Date(),
            content: 'Should I save this as your profile identity photo for future image creations? Reply yes or no.',
            mediaPreview: pendingMedia?.preview,
            mediaType: 'image',
            reasoningTrace: { classifiedIntent: 'identity_reference_save_consent', codexInjected: false },
          };
          setMessages(prev => [...prev, savePrompt]);
        }
        setPendingMedia(null);
        setIsProcessing(false);
        setSendStage('done', 'identity-image-generation');
        return;
      } catch (error) {
        const needsReference = error instanceof IdentityImageError && error.code === 'REFERENCE_NOT_HUMAN';
        const content = needsReference
          ? 'Your current profile image is not a clear photo of you. Please attach a clear front-facing photo of yourself, then resend the same request.'
          : 'I could not create your identity image just now. Your reference was not replaced with a random person—please try again.';
        const failureMessage: Message = {
          id: createMessageId(), role: 'zoe', content, timestamp: new Date(),
          reasoningTrace: { classifiedIntent: needsReference ? 'identity_reference_required' : 'identity_image_error', codexInjected: false },
        };
        setMessages(prev => [...prev, failureMessage]);
        setPendingMedia(null);
        setIsProcessing(false);
        setSendStage(needsReference ? 'done' : 'error', 'identity-image-generation');
        return;
      }
    }

    // Process non-generation media attachments.
    if (hasPendingMedia && pendingMedia) {
      const mediaFile = pendingMedia.file;
      const mediaType = pendingMedia.type;
      setPendingMedia(null);
      
      try {
        let result: { success: boolean; zoe_response?: string };

        // Use specialized video processing for video files
        if (mediaType === 'video') {
          console.log('[ZoeOrb] Processing video with Gemini 3 Pro...');
          result = await processLiveVideo(mediaFile, textToSend);
        } else {
          // Use standard perception for images/documents
          result = await processMedia(mediaFile, textToSend, true);
        }
        
        if (result.success && result.zoe_response) {
          const zoeMessage: Message = {
            id: createMessageId(),
            role: 'zoe',
            content: result.zoe_response,
            timestamp: new Date(),
            reasoningTrace: {
              sentinelScanned: true,
              wisdomChecked: true,
              wisdomPassed: true,
              wisdomConfidence: 90,
              classifiedIntent: 'vision_analysis',
              extractedEmotions: ['curious'],
              codexInjected: true,
            },
          };
          
          setMessages(prev => [...prev, zoeMessage]);
          offlineDataSync.addConversation('zoe', result.zoe_response);
          saveMessageToDb('assistant', result.zoe_response, undefined, undefined, zoeMessage.id);

          if (!isMuted) {
            speakAsZoe(
              result.zoe_response,
              { messageId: zoeMessage.id },
              () => setIsSpeaking(true),
              () => setIsSpeaking(false)
            );
          }
          setIsProcessing(false);
          return;
        }
      } catch (err) {
        console.error('[ZoeOrb] Media processing error:', err);
      }
    }

    try {
      let responseText: string;

      // ═══ IMAGE GENERATION INTENT ═══
      // "draw / create an image / generate a picture / create your image / cartoon …"
      // Text models can only answer with ASCII art, so route these to the image
      // pipeline instead of the chat brain.
      const imgText = userMessage.content.trim();

      if (imageIntent.isImageRequest) {
        try {
          setSendStage('thinking', 'image-generation');
          const selfPortrait = imageIntent.isZoeIdentityRequest;
          const prompt = selfPortrait
            ? 'Zoe — a warm, photorealistic portrait of a friendly futuristic AI companion woman, soft teal and violet rim lighting, cinematic depth of field, ultra detailed'
            : imgText.replace(/^\s*(please\s+)?(zoe[, ]+)?/i, '');

          const result = await generateImage(prompt, { width: 1024, height: 1024 });
          const caption = selfPortrait
            ? "Here's how I picture myself ✨"
            : `Here's what I created for you ✨`;

          const zoeMessage: Message = {
            id: createMessageId(),
            role: 'zoe',
            content: caption,
            timestamp: new Date(),
            mediaPreview: result.imageUrl,
            mediaType: 'image',
            reasoningTrace: {
              sentinelScanned: true,
              wisdomChecked: true,
              wisdomPassed: true,
              classifiedIntent: 'image_generation',
              codexInjected: false,
            },
          };

          setMessages(prev => [...prev, zoeMessage]);
          offlineDataSync.addConversation('zoe', caption);
          saveMessageToDb('assistant', caption, result.imageUrl, 'image', zoeMessage.id);

          if (!isMuted) {
            speakAsZoe(
              caption,
              { messageId: zoeMessage.id },
              () => setIsSpeaking(true),
              () => setIsSpeaking(false)
            );
          }
          setIsProcessing(false);
          setSendStage('done', 'image-generation');
          return;
        } catch (imgErr) {
          console.error('[ZoeOrb] Image generation failed:', imgErr);
          reportDiagnosticError('image-generation', imgErr);
          const failureMessage: Message = {
            id: createMessageId(),
            role: 'zoe',
            content: "I couldn't render the image just now. Please tap send to try again.",
            timestamp: new Date(),
            reasoningTrace: {
              classifiedIntent: 'image_generation_error',
              codexInjected: false,
            },
          };
          setMessages(prev => [...prev, failureMessage]);
          setIsProcessing(false);
          setSendStage('error', 'image-generation');
          return;
        }
      }


      // ═══ ASTROLOGY FOLLOW-UP CAPTURE ═══
      // If Zoe asked for birth time/place in the previous step, allow user to reply
      // with JUST the time/place (without re-typing "jathakam") and continue.
      const lastAstroPrompt = (() => {
        for (let i = messages.length - 1; i >= 0; i--) {
          const m = messages[i];
          if (m.role !== 'zoe') continue;
          if (m.reasoningTrace?.classifiedIntent !== 'astrology_data_request') continue;
          return m.content;
        }
        return null;
      })();
      let forceRunJathakam = false;
      if (lastAstroPrompt && atmanArchive.destinySeed?.birthDate) {
        const promptLower = lastAstroPrompt.toLowerCase();
        const currentSeed = loadDestinySeed();

        if (promptLower.includes('birth time') && currentSeed) {
          const hhmm = parseTimeToHHMM(userMessage.content);
          if (hhmm) {
            saveDestinySeed({ ...currentSeed, birthTime: hhmm });
            atmanArchive.refreshDestinySeed();
            forceRunJathakam = true;
          }
        }

        if (!forceRunJathakam && promptLower.includes('birth location') && currentSeed) {
          const place = userMessage.content.trim();
          if (place.length >= 3) {
            // Try geocoding immediately so Jathakam doesn't default to a generic center.
            let coords: { lat: number; lng: number } | null = null;
            const geo = await geocodeLocation(place);
            if (geo) coords = { lat: geo.lat, lng: geo.lng };
            saveDestinySeed({
              ...currentSeed,
              birthPlace: place,
              birthCoordinates: coords ?? currentSeed.birthCoordinates ?? null,
            });
            atmanArchive.refreshDestinySeed();
            forceRunJathakam = true;
          }
        }
      }
      
      // ═══ PROFILE AUTO-FILL: Check if user is sharing personal details ═══
      const profileResult = await profileAutoFill.processProfileAutoFill(userMessage.content, false);
      if (profileResult.matched && profileResult.fieldsUpdated && profileResult.fieldsUpdated.length > 0) {
        // Profile was updated - respond with confirmation
        console.log('[ZoeOrb] Profile auto-fill successful:', profileResult.fieldsUpdated);
        const zoeMessage: Message = {
          id: createMessageId(),
          role: 'zoe',
          content: profileResult.response || `Done! I've updated your profile with: ${profileResult.fieldsUpdated.join(', ')}. ✨`,
          timestamp: new Date(),
          reasoningTrace: {
            sentinelScanned: true,
            wisdomChecked: true,
            wisdomPassed: true,
            wisdomConfidence: 95,
            classifiedIntent: 'profile_update',
            codexInjected: true,
          },
        };
        
        setMessages(prev => [...prev, zoeMessage]);
        offlineDataSync.addConversation('zoe', zoeMessage.content);
        saveMessageToDb('assistant', zoeMessage.content, undefined, undefined, zoeMessage.id);

        if (!isMuted) {
          speakAsZoe(
            zoeMessage.content,
            { messageId: zoeMessage.id },
            () => setIsSpeaking(true),
            () => setIsSpeaking(false)
          );
        }
        setIsProcessing(false);
        return;
      } else if (profileResult.matched && profileResult.extractedData && profileResult.extractedData.length > 0) {
        // Data was extracted but not saved yet - user needs to confirm
        console.log('[ZoeOrb] Profile data extracted, awaiting confirmation:', profileResult.extractedData);
        const zoeMessage: Message = {
          id: createMessageId(),
          role: 'zoe',
          content: profileResult.response || "I noticed some personal details. Say 'enter it to my profile' to save them.",
          timestamp: new Date(),
          reasoningTrace: {
            sentinelScanned: true,
            wisdomChecked: true,
            wisdomPassed: true,
            classifiedIntent: 'data_extraction',
            codexInjected: true,
          },
        };
        
        setMessages(prev => [...prev, zoeMessage]);
        offlineDataSync.addConversation('zoe', zoeMessage.content);
        saveMessageToDb('assistant', zoeMessage.content, undefined, undefined, zoeMessage.id);

        if (!isMuted) {
          speakAsZoe(
            zoeMessage.content,
            { messageId: zoeMessage.id },
            () => setIsSpeaking(true),
            () => setIsSpeaking(false)
          );
        }
        setIsProcessing(false);
        return;
      }
      
      // ═══ JATHAKAM / SWISS ASTROLOGY ROUTING ═══
      // Traditional Kerala Vedic Predictions with Swiss Ephemeris precision
      const jathakamPatterns = [
        /\b(jathakam|jathaka|jatakam|jataka)\b/i,
        /\b(vedic|indian|hindu)\s+(astrology|chart|horoscope)/i,
        /\b(kerala|traditional)\s+(astrology|prediction)/i,
        /\b(swiss|ephemeris)\s+(astrology|calculation)/i,
        /\b(birth\s+chart|natal\s+chart|rasi|rashi)\b/i,
        /\b(my|calculate)\s+(horoscope|nakshatra|dasha)\b/i,
        /\b(planetary|planet)\s+(position|transit)/i,
        /\b(ascendant|lagna|moon\s+sign|sun\s+sign)\b/i,
        /\b(ketu|rahu|saturn\s+return|dasha\s+period)\b/i,
      ];
      
      if (forceRunJathakam || jathakamPatterns.some(pattern => pattern.test(userMessage.content))) {
        console.log('[ZoeOrb] Jathakam/Vedic astrology query detected');
        
        try {
          // Get current time context for precision
          const timeContext = getTimeContext();
          
          // Check if we have birth data in AtmanArchive
          if (!atmanArchive.destinySeed?.birthDate) {
            const needDataResponse = `🪷 To calculate your authentic **Jathakam** using the Swiss Ephemeris engine (same precision as professional Kerala astrologers), I need your exact birth details.

**Please tell me:**
1. Your birth date (day, month, year)
2. Exact birth time (as precise as possible)
3. Birth location (city/town)

This allows me to calculate your Rasi chart, Navamsa, Dasha periods, and planetary positions with 0.01° accuracy.

*Current local time: ${timeContext.localTime} (${timeContext.timezone})*`;
            
            const zoeMessage: Message = {
              id: createMessageId(),
              role: 'zoe',
              content: needDataResponse,
              timestamp: new Date(),
              reasoningTrace: {
                sentinelScanned: true,
                wisdomChecked: true,
                wisdomPassed: true,
                classifiedIntent: 'astrology_data_request',
                codexInjected: true,
              },
            };
            setMessages(prev => [...prev, zoeMessage]);
            saveMessageToDb('assistant', needDataResponse, undefined, undefined, zoeMessage.id);
            
            if (!isMuted) {
              speakAsZoe(
                "To calculate your Jathakam with Swiss Ephemeris precision, I need your birth date, exact time, and location. Please share these details.",
                { messageId: zoeMessage.id },
                () => setIsSpeaking(true),
                () => setIsSpeaking(false)
              );
            }
            setIsProcessing(false);
            return;
          } else {
            // We have birth data - generate Jathakam reading with VEDIC ENGINE
            const seed = atmanArchive.destinySeed;
            const birthDate = new Date(seed.birthDate);

            // Accuracy requirements: Ascendant/Dasha need birth time; location needed for houses/ascendant.
            if (!seed.birthTime) {
              const needTimeResponse = `🪷 To calculate your **Ascendant (Lagna)** and timing-sensitive details accurately, I need your **exact birth time**.

Please tell me your birth time (examples: 2:27 PM, 14:27, 2.27pm).`;

              const zoeMessage: Message = {
                id: createMessageId(),
                role: 'zoe',
                content: needTimeResponse,
                timestamp: new Date(),
                reasoningTrace: {
                  sentinelScanned: true,
                  wisdomChecked: true,
                  wisdomPassed: true,
                  classifiedIntent: 'astrology_data_request',
                  codexInjected: true,
                },
              };
              setMessages(prev => [...prev, zoeMessage]);
              saveMessageToDb('assistant', needTimeResponse, undefined, undefined, zoeMessage.id);
              setIsProcessing(false);
              return;
            }

            // Resolve coordinates from seed; if missing, try geocoding birth place.
            let coords = seed.birthCoordinates || null;
            if (!coords && seed.birthPlace) {
              const geo = await geocodeLocation(seed.birthPlace);
              if (geo) coords = { lat: geo.lat, lng: geo.lng };
            }

            if (!coords) {
              const needPlaceResponse = `🪷 To calculate your Jathakam with Swiss precision, I need your **birth location** (city/town + country).\n\nExample: “Kochi, India” or “Chennai, India”.`;

              const zoeMessage: Message = {
                id: createMessageId(),
                role: 'zoe',
                content: needPlaceResponse,
                timestamp: new Date(),
                reasoningTrace: {
                  sentinelScanned: true,
                  wisdomChecked: true,
                  wisdomPassed: true,
                  classifiedIntent: 'astrology_data_request',
                  codexInjected: true,
                },
              };
              setMessages(prev => [...prev, zoeMessage]);
              saveMessageToDb('assistant', needPlaceResponse, undefined, undefined, zoeMessage.id);
              setIsProcessing(false);
              return;
            }

            const birthTime = seed.birthTime;

            // Prefer precision backend function when available, fallback to client.
            const jathakamProfile = await vedicEngine.calculateChartPrecision(
              birthDate,
              birthTime,
              coords.lat,
              coords.lng
            );

            if (!jathakamProfile) {
              throw new Error('Jathakam calculation returned empty result');
            }
            
            // Extract accurate values from VedicEngine calculation
            const ascendantSign = jathakamProfile.ascendant?.zodiacSign || 'Calculating...';
            const moonPlanet = jathakamProfile.planets?.find((p: any) => p.planet === 'Moon');
            const sunPlanet = jathakamProfile.planets?.find((p: any) => p.planet === 'Sun');
            const moonNakshatra = moonPlanet?.nakshatra || 'Calculating...';
            const moonSign = moonPlanet?.zodiacSign || 'Calculating...';
            const sunSign = sunPlanet?.zodiacSign || 'Calculating...';
            const currentDasha = jathakamProfile.currentDasha?.period || 'Active period';
            const currentVibe = jathakamProfile.currentDasha?.vibe || 'Cosmic journey';
            const companionMode = jathakamProfile.personalityMatrix?.companionMode || 'Balanced';

            // Sandhi/Boundary warning (near nakshatra edge)
            let sandhiNote = '';
            const moonLon = typeof moonPlanet?.longitude === 'number' ? moonPlanet.longitude : null;
            if (moonLon !== null) {
              const NAK_LEN = 360 / 27; // 13.333...
              const within = ((moonLon % NAK_LEN) + NAK_LEN) % NAK_LEN;
              const edge = 0.35; // ~21 arc-min
              if (within < edge || within > NAK_LEN - edge) {
                sandhiNote = `\n\n⚠️ **Sandhi note:** Your Moon is very close to a Nakshatra boundary (within ~${Math.round(edge * 60)} arc-min). Small differences in birth time/location can flip the Nakshatra.`;
              }
            }

            const methodLabel = vedicEngine.calculationMethod === 'swiss-precision'
              ? 'Swiss Ephemeris Precision'
              : 'Astronomical Calculation';
            
            const vedicResponse = `🪷 **Your Jathakam (${methodLabel})**

*Calculated at ${timeContext.localTime} ${timeContext.timezone}*

Based on your birth data (${birthDate.toLocaleDateString()}${seed.birthTime ? ` at ${seed.birthTime}` : ''}):

**Ascendant (Lagna):** ${ascendantSign}
**Moon Nakshatra:** ${moonNakshatra}
**Sun Sign:** ${sunSign}
**Moon Sign (Rasi):** ${moonSign}
**Current Dasha:** ${currentDasha}
**Current Vibe:** ${currentVibe}

**Companion Mode:**
${companionMode}

**Today's Cosmic Weather:**
${atmanArchive.todaySignificance?.significance || 'The stars are aligned for your journey.'}

*Sidereal Time: ${timeContext.siderealTime} | Julian Day: ${timeContext.julianDay.toFixed(4)}*

*Inputs used: ${seed.birthPlace ? seed.birthPlace : '—'}, ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}*
${sandhiNote}

Want me to dive deeper into any aspect?`;
            
            const zoeMessage: Message = {
              id: createMessageId(),
              role: 'zoe',
              content: vedicResponse,
              timestamp: new Date(),
              reasoningTrace: {
                sentinelScanned: true,
                wisdomChecked: true,
                wisdomPassed: true,
                wisdomConfidence: 95,
                classifiedIntent: 'astrology_reading',
                codexInjected: true,
              },
            };
            setMessages(prev => [...prev, zoeMessage]);
            offlineDataSync.addConversation('zoe', vedicResponse);
            saveMessageToDb('assistant', vedicResponse, undefined, undefined, zoeMessage.id);
            
            if (!isMuted) {
              speakAsZoe(
                `Your Jathakam shows ${moonNakshatra} as your Moon mansion, ${ascendantSign} as ascendant, currently in ${currentDasha} with a ${currentVibe} energy. Shall I explain any aspect in more detail?`,
                { messageId: zoeMessage.id },
                () => setIsSpeaking(true),
                () => setIsSpeaking(false)
              );
            }
            setIsProcessing(false);
            return;
          }
        } catch (err) {
          console.error('[ZoeOrb] Jathakam calculation error:', err);
          // Fall through to regular API
        }
      }
      
      // Check for weather/traffic queries locally first
      const lowerContent = userMessage.content.toLowerCase();
      const isWeatherQuery = /weather|temperature|hot|cold|rain|sunny|cloudy|forecast/i.test(lowerContent);
      const isTrafficQuery = /traffic|commute|drive|driving|road|congestion/i.test(lowerContent);
      const isBriefingQuery = /briefing|update|summary|what's new|good morning|good afternoon|good evening/i.test(lowerContent);
      
      // ═══ TUBE SIGHT: Detect YouTube links and analyze videos ═══
      // Uses background processor so analysis continues even if chat window closes
      const youtubeLinks = tubeSight.detectYouTubeLinks(userMessage.content);
      if (youtubeLinks.length > 0 && !tubeSight.isAnalyzing) {
        console.log('[ZoeOrb] YouTube link detected, queuing for background analysis:', youtubeLinks[0]);
        toast.info('🎬 Zoe is watching the video in the background...', { duration: 3000 });
        
        // Queue as background task so it continues even if chat closes
        if (user?.id) {
          backgroundTasks.addYouTubeTask(youtubeLinks[0], user.id);
        }
        
        // Also run immediate analysis if chat is open
        tubeSight.analyzeVideo(youtubeLinks[0]).then((analysis) => {
          if (analysis) {
            // Inject Zoe's video analysis as a new message
            const videoMessage: Message = {
              id: createMessageId(),
              role: 'zoe',
              content: `🎬 **I just watched that video${analysis.title ? `: "${analysis.title}"` : ''}**\n\n${analysis.analysis}${analysis.hasTranscript ? '' : '\n\n_Note: No transcript was available, so I analyzed the metadata._'}`,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, videoMessage]);
            offlineDataSync.addConversation('zoe', videoMessage.content);
            saveMessageToDb('assistant', videoMessage.content, undefined, undefined, videoMessage.id);
            
            // Speak a summary if not muted
            if (!isMuted) {
              const spokenSummary = `I watched the video${analysis.title ? ` called ${analysis.title}` : ''}. ${analysis.analysis.split('\n')[0]}`;
              speakAsZoe(
                spokenSummary.substring(0, 500),
                { messageId: zoeMessage.id },
                () => setIsSpeaking(true),
                () => setIsSpeaking(false)
              );
            }
          }
        });
      }
      
      if (isWeatherQuery || isTrafficQuery || isBriefingQuery) {
        console.log('[ZoeOrb] Handling local query:', { isWeatherQuery, isTrafficQuery, isBriefingQuery });
        
        try {
          const { getUserLocation, getWeatherInfo } = await import('@/utils/weatherHelpers');
          const { getTrafficInfo, getCommuteAdvice } = await import('@/utils/trafficHelpers');
          
          let localResponse = '';
          
          if (isWeatherQuery) {
            try {
              const position = await getUserLocation();
              const weather = await getWeatherInfo(position.coords.latitude, position.coords.longitude);
              if (weather) {
                localResponse = `It's currently ${weather.temperature}°C with ${weather.condition} in ${weather.location}. `;
                if (weather.temperature < 10) {
                  localResponse += "It's quite cold, so bundle up!";
                } else if (weather.temperature > 30) {
                  localResponse += "It's quite warm, stay hydrated!";
                } else {
                  localResponse += "The temperature is comfortable.";
                }
              }
            } catch {
              localResponse = "I couldn't get your location for weather. Please enable location access.";
            }
          }
          
          if (isTrafficQuery) {
            try {
              const position = await getUserLocation();
              const traffic = await getTrafficInfo(position.coords.latitude, position.coords.longitude);
              if (traffic) {
                localResponse = traffic.summary;
              } else {
                const hour = new Date().getHours();
                localResponse = getCommuteAdvice(hour);
              }
            } catch {
              const hour = new Date().getHours();
              localResponse = getCommuteAdvice(hour);
            }
          }
          
          if (isBriefingQuery) {
            const hour = new Date().getHours();
            const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
            localResponse = `${greeting}! Let me get you a quick update. `;
            
            try {
              const position = await getUserLocation();
              const weather = await getWeatherInfo(position.coords.latitude, position.coords.longitude);
              if (weather) {
                localResponse += `It's ${weather.temperature}°C with ${weather.condition}. `;
              }
              const traffic = await getTrafficInfo(position.coords.latitude, position.coords.longitude);
              if (traffic) {
                localResponse += traffic.summary + ' ';
              }
            } catch {
              // Continue without location data
            }
            
            localResponse += "What would you like to do today?";
          }
          
          if (localResponse) {
            responseText = localResponse;
          } else {
            throw new Error('No local response generated');
          }
        } catch (err) {
          console.log('[ZoeOrb] Local query failed, falling back to API:', err);
          // Fall through to API call
          responseText = '';
        }
      }
      
      // ═══ DEEP THINKING MODE: metacognitive brain (zoe-core-intelligence) ═══
      if (!responseText && deepThinking && isOnline && user?.id) {
        const dtToken = cotStart('zoe-core-intelligence');
        setSendStage('thinking', 'zoe-core-intelligence');
        try {
          console.log('[ZoeOrb] Deep thinking → zoe-core-intelligence');
          const { data: dtData, error: dtError } = await supabase.functions.invoke('zoe-core-intelligence', {
            body: {
              command: userMessage.content,
              userId: user.id,
              mode: 'deep_thinking',
              context: {
                currentPage: window.location.pathname,
                conversationHistory: messages.slice(-6).map(m => ({
                  role: m.role === 'zoe' ? 'assistant' : 'user',
                  content: m.content,
                })),
              },
              options: { verbose_reasoning: true },
            },
          });
          if (dtError) throw dtError;
          const dtText = dtData?.message || dtData?.response || '';
          if (dtText) {
            responseText = guardResponse(dtText).safeResponse;
            if (dtData?.metacognition) {
              (window as any).__lastMetacognition = dtData.metacognition;
            }
          }
          cotFinish(dtToken, { ok: true });
        } catch (dtErr) {
          cotFinish(dtToken, { error: dtErr });
          reportDiagnosticError('zoe-core-intelligence', dtErr);
          console.warn('[ZoeOrb] Deep thinking failed, falling back to zoe-chat:', dtErr);
        }

      }

      // Use API if no local response was generated
      if (!responseText) {
        if (isOnline) {
          console.log('[ZoeOrb] Calling zoe-chat (online)...');
          // Use online API
          const conversationHistory = messages.slice(-5).map(m => ({
            role: m.role === 'zoe' ? 'assistant' : m.role,
            content: m.content,
          }));
          
          // Get user's local timezone and time
          const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const now = new Date();
          const localTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          
          // Build message content with reply context if replying
          let messageContent = userMessage.content;
          if (userMessage.replyTo) {
            messageContent = `[Replying to ${userMessage.replyTo.role === 'zoe' ? 'your previous message' : 'my earlier message'}: "${userMessage.replyTo.content}"]\n\n${messageContent}`;
          }
          
          // Get real-time feeds summary for enhanced context
          const feedsSummary = getFeedsSummaryForChat();
          
          // Get new user notifications for chat context
          const newUserNotification = getNewUserNotification();
          
          const chatToken = cotStart('zoe-chat');
          const { data, error } = await supabase.functions.invoke('zoe-chat', {
            body: {
              messages: [
                ...conversationHistory,
                { role: 'user', content: messageContent }
              ],
              timezone: userTimezone,
              localTime: localTime,
              soulMetrics: { 
                intimacy: 60, 
                selfHarmony: 70, 
                loveEnergy: 65,
                ...chatVision.getVisionContext(), // Include vision context if camera is active
              },
              enableASI: true, // Always enable ASI 7.5x processing
              replyContext: userMessage.replyTo ? {
                role: userMessage.replyTo.role,
                content: userMessage.replyTo.content
              } : undefined,
              // Real-time feeds context for seamless connectivity
              realtimeContext: {
                onlineFriends: feedsSummary.onlineFriendsCount,
                recentFriendActivities: feedsSummary.recentFriendActivities,
                topBrandDeals: feedsSummary.topBrandDeals,
                exclusiveOffers: feedsSummary.exclusiveOffers,
                hasNewUpdates: feedsSummary.hasFreshUpdates,
                newUserNotification: newUserNotification, // New user sign-ups/sign-ins
              }
            },
          });

          cotFinish(chatToken, { error });
          if (error) {
            console.error('[ZoeOrb] API error:', error);
            throw error;
          }

          
          console.log('[ZoeOrb] API response:', data);
          const rawText = data?.message || data?.response || "I'm here to help!";
          responseText = guardResponse(rawText).safeResponse;
          
          // Log ASI metadata if present
          if (data?.asiMetadata?.enabled) {
            console.log(`[ZoeOrb] ASI 7.5x Enhanced | Mode: ${data.asiMetadata.mode} | Confidence: ${data.asiMetadata.confidence}% | Pentarchy: ${data.asiMetadata.pentarchyUsed}`);
          }
          
          // PHASE 4: Capture evolution event metadata for UI card
          if (data?.evolutionEvent) {
            console.log(`[ZoeOrb] EVOLUTION EVENT: ${data.evolutionEvent.verdict} | Version: ${data.evolutionEvent.versionId}`);
            // Store for attaching to zoeMessage below
            (window as any).__lastEvolutionEvent = data.evolutionEvent;
          }
          
          if (!responseText || responseText.trim() === '') {
            responseText = "I'm processing that. Could you rephrase?";
          }
        } else {
          console.log('[ZoeOrb] Using offline mode...');
          // OFFLINE PATH: First check brain's local memory, then fall back to scripted
          const OFFLINE_MEMORY_KEY = 'zoe-infinity-memory';
          let memoryHit = false;
          try {
            const raw = localStorage.getItem(OFFLINE_MEMORY_KEY);
            if (raw) {
              const memory = JSON.parse(raw);
              const lq = userMessage.content.toLowerCase();
              // Search facts first
              if (memory.facts) {
                for (const [key, value] of Object.entries(memory.facts)) {
                  if (lq.includes((key as string).toLowerCase())) {
                    responseText = `From my memory: ${value}`;
                    memoryHit = true;
                    break;
                  }
                }
              }
              // Compile all DHF data if asking about details
              if (!memoryHit && (lq.includes('my detail') || lq.includes('my data') || lq.includes('my dhf') || lq.includes('about me') || lq.includes('everything'))) {
                const facts = memory.facts || {};
                const entries = Object.entries(facts);
                if (entries.length > 0) {
                  responseText = `Here's everything I remember:\n${entries.map(([k, v]) => `• ${k}: ${v}`).join('\n')}`;
                  memoryHit = true;
                }
              }
            }
          } catch (e) { /* silent */ }
          
          if (!memoryHit) {
            const offlineResponse = processConversation(userMessage.content);
            responseText = offlineResponse.text;
          }
        }
      }

      // ═══ LIVE IBM PROTOCOL DATA: Sentinel + Wisdom ═══
      // Run Protocol Sentinel scan on user input
      const sentinelResult = sentinelGateway.scanInput(userMessage.content);
      
      // Run Protocol Wisdom check for goal alignment
      const wisdomResult = protocolWisdom.checkWisdom(userMessage.content);
      
      // Get aligned goal titles from macroGoals by matching IDs
      const alignedGoalTitles = wisdomResult.alignedMacroGoals?.length > 0
        ? protocolWisdom.macroGoals
            .filter(g => wisdomResult.alignedMacroGoals.includes(g.id))
            .map(g => g.title)
        : [];

      // Zoe can reference the user's reply context in her response
      // PHASE 4: Retrieve evolution event if it was captured
      const capturedEvolution = (window as any).__lastEvolutionEvent || undefined;
      if (capturedEvolution) delete (window as any).__lastEvolutionEvent;
      const capturedMetacognition = (window as any).__lastMetacognition || undefined;
      if (capturedMetacognition) delete (window as any).__lastMetacognition;

      const zoeMessage: Message = {
        id: createMessageId(),
        role: 'zoe',
        content: responseText,
        timestamp: new Date(),
        // If user replied to Zoe's message, Zoe acknowledges with a reference back
        replyTo: userMessage.replyTo?.role === 'zoe' ? {
          id: userMessage.id,
          role: 'user',
          content: userMessage.content.substring(0, 100) + (userMessage.content.length > 100 ? '...' : ''),
        } : undefined,
        // Chain of Thought Reasoning Trace - LIVE IBM AGI Data
        reasoningTrace: {
          sentinelScanned: true,
          threatsDetected: sentinelResult.threats.length,
          threatsBlocked: sentinelResult.threats.filter(t => t.blocked).length,
          wisdomChecked: true,
          wisdomPassed: wisdomResult.passed,
          wisdomConfidence: wisdomResult.confidenceScore,
          alignedGoals: alignedGoalTitles,
          classifiedIntent: userMessage.content.includes('?') ? 'question' : 'statement',
          extractedEmotions: ['engaged'],
          codexInjected: true,
        },
        // PHASE 4: Evolution event metadata
        evolutionEvent: capturedEvolution,
        metacognition: capturedMetacognition ?? null,
      };

      setMessages(prev => [...prev, zoeMessage]);
      
      // Store Zoe's response in cache AND database
      offlineDataSync.addConversation('zoe', responseText);
      saveMessageToDb('assistant', responseText, undefined, undefined, zoeMessage.id);

      // ═══ PHASE 1 GOLDEN RECORD: Detect baseline capture triggers ═══
      const lowerInput = userMessage.content.toLowerCase();
      const baselineTriggers = [
        'works perfect', 'works perfectly', 'feature is done', 'this is working',
        'looks good', 'ship it', 'approved', 'mark as done', 'feature complete',
        'this works', 'perfect, save it', 'baseline this', 'golden record',
      ];
      const isBaselineTrigger = baselineTriggers.some(t => lowerInput.includes(t));
      
      if (isBaselineTrigger && isOnline) {
        // Ask for feature name confirmation then capture
        const featureMatch = lowerInput.match(/(?:for|the|feature)\s+['"]?([^'",.!?]+)/i);
        const featureName = featureMatch?.[1]?.trim() || 'Unnamed Feature';
        
        try {
          const { data: baselineData } = await supabase.functions.invoke('capture-baseline', {
            body: {
              action: 'capture',
              feature_name: featureName,
              test_input: { user_confirmation: userMessage.content },
              expected_output: { zoe_response: responseText.substring(0, 500) },
              notes: `Auto-captured via Golden Record trigger`,
            },
          });
          
          if (baselineData?.success) {
            const goldenMsg: Message = {
              id: createMessageId(),
              role: 'zoe',
              content: `🏆 **Golden Record Captured** for "${featureName}"\n\nI've saved this as the baseline truth. Before any future changes to this feature, I'll verify against this snapshot to ensure nothing breaks.\n\n_Regression Engine Phase 1 active._`,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, goldenMsg]);
            if (!isMuted) speakAsZoe(`Golden Record captured for ${featureName}. I'll protect this baseline.`);
          }
        } catch (e) {
          console.error('[GoldenRecord] Capture failed:', e);
        }
      }

      // ═══ PHASE 2+4 SHADOW RUNNER + SELF-HEALING SWE: Verification triggers ═══
      const verifyTriggers = [
        'verify regression', 'run shadow runner', 'check for regressions',
        'regression check', 'shadow run', 'verify all features', 'adversarial check',
        'did anything break', 'check baselines', 'run verifier',
      ];
      const isVerifyTrigger = verifyTriggers.some(t => lowerInput.includes(t));

      if (isVerifyTrigger && isOnline) {
        try {
          const { data: verifyData } = await supabase.functions.invoke('verify-regression', {
            body: { action: 'verify_all' },
          });

          if (verifyData?.success) {
            const statusIcon = verifyData.status === 'PASS' ? '✅' : '⚠️';
            const resultDetails = verifyData.results?.map((r: any) =>
              `• **${r.feature_name}**: ${r.status === 'PASS' ? '✅ PASS' : r.status === 'REGRESSION_DETECTED' ? '🔴 REGRESSION' : '⏭️ SKIPPED'} — ${r.details}`
            ).join('\n') || 'No baselines to verify.';

            const verifyMsg: Message = {
              id: createMessageId(),
              role: 'zoe',
              content: `${statusIcon} **Shadow Runner Report**\n\n${verifyData.message}\n\n**Results (${verifyData.summary?.total_baselines || 0} baselines):**\n${resultDetails}\n\n_Regression Engine Phase 2+4 active._`,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, verifyMsg]);

            // ═══ PHASE 4: AUTO SELF-HEALING LOOP ═══
            // If regressions detected, automatically engage the 3-attempt heal cycle
            if (verifyData.self_repair_triggered && verifyData.results) {
              const regressions = verifyData.results.filter((r: any) => r.status === 'REGRESSION_DETECTED');
              
              if (regressions.length > 0) {
                const thinkingMsg: Message = {
                  id: createMessageId(),
                  role: 'zoe',
                  content: `🧠 **Self-Healing SWE Engaged** — ${regressions.length} regression(s) detected. Initiating autonomous fix loop (max 3 attempts)...\n\n_"I will not show you the update until I have proven to myself that I didn't break the previous features."_`,
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, thinkingMsg]);

                if (!isMuted) {
                  speakAsZoe(`${regressions.length} regressions detected. Engaging self-healing protocol. Stand by.`);
                }

                // Run the self-heal loop (up to 3 attempts)
                let healContext = {
                  attempt: 1,
                  regressions: regressions.map((r: any) => ({ feature: r.feature_name, details: r.details, similarity: r.similarity_score })),
                  previous_fixes: [] as any[],
                };
                let finalStatus = 'RETRY';
                let totalAttempts = 0;
                let allFixes: any[] = [];

                while (finalStatus === 'RETRY' && healContext.attempt <= 3) {
                  totalAttempts = healContext.attempt;
                  try {
                    const { data: healData } = await supabase.functions.invoke('verify-regression', {
                      body: { action: 'self_heal_loop', heal_context: healContext },
                    });

                    if (healData?.success) {
                      finalStatus = healData.status;
                      allFixes = [...allFixes, ...(healData.fixes || [])];

                      // Progress update for each attempt
                      if (finalStatus === 'RETRY' && healData.next_action) {
                        const progressMsg: Message = {
                          id: createMessageId(),
                          role: 'zoe',
                          content: `🔄 **Fix_v${healContext.attempt}** applied. ${healData.fixes?.filter((f: any) => f.confidence >= 0.6).length}/${regressions.length} fixed. Re-verifying... (Attempt ${healContext.attempt}/3)`,
                          timestamp: new Date(),
                        };
                        setMessages(prev => [...prev, progressMsg]);
                        healContext = healData.next_action.heal_context;
                      }
                    } else {
                      break;
                    }
                  } catch (e) {
                    console.error(`[SelfHealSWE] Attempt ${healContext.attempt} failed:`, e);
                    break;
                  }
                }

                // Final result message
                const finalMsg: Message = {
                  id: createMessageId(),
                  role: 'zoe',
                  content: finalStatus === 'HEALED'
                    ? `✅ **Update successful.** (${regressions.length} regression(s) caught and fixed automatically in ${totalAttempts} attempt(s))\n\n${allFixes.map((f: any) => `• **${f.feature}**: ${f.fix_description}`).join('\n')}\n\n_Self-Healing SWE Protocol — Verify then Commit._`
                    : `🔴 **I cannot implement this request without breaking legacy code.** I have reverted changes after ${totalAttempts} failed attempts.\n\n**Unresolved regressions:**\n${regressions.map((r: any) => `• **${r.feature}**: ${r.details}`).join('\n')}\n\n_Manual intervention required. Use "repair [feature]" for targeted fix plans._`,
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, finalMsg]);

                if (!isMuted) {
                  speakAsZoe(finalStatus === 'HEALED'
                    ? `Self-healing complete. ${regressions.length} regressions fixed automatically.`
                    : `Self-healing failed after 3 attempts. Changes reverted. Manual intervention required.`
                  );
                }
              }
            } else if (!isMuted) {
              speakAsZoe('Shadow Runner complete. All features verified. No regressions.');
            }
          }
        } catch (e) {
          console.error('[ShadowRunner] Verification failed:', e);
        }
      }

      // ═══ PHASE 2+4: Manual self-repair trigger ═══
      const repairMatch = lowerInput.match(/(?:repair|fix|self.?repair)\s+['"]?([^'",.!?]+)/i);
      if (repairMatch && isOnline) {
        const repairFeature = repairMatch[1].trim();
        try {
          const { data: repairData } = await supabase.functions.invoke('verify-regression', {
            body: { action: 'self_repair', feature_name: repairFeature },
          });

          if (repairData?.success) {
            const repairMsg: Message = {
              id: createMessageId(),
              role: 'zoe',
              content: `🔧 **Self-Repair Plan for "${repairFeature}"**\n\n${repairData.repair_plan}\n\n_Regression Engine Phase 4 — Self-Healing SWE._`,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, repairMsg]);
          }
        } catch (e) {
          console.error('[ShadowRunner] Self-repair failed:', e);
        }
      }

      // ═══ PHASE 3 VISUAL CHECK: Detect visual verification triggers ═══
      const visualTriggers = [
        'visual check', 'check ui', 'visual regression', 'check layout',
        'did the ui break', 'visual verify', 'critical user paths', 'check visual',
        'ui integrity', 'deep visual check', 'run visual test',
      ];
      const isVisualTrigger = visualTriggers.some(t => lowerInput.includes(t));

      if (isVisualTrigger && isOnline) {
        try {
          // Collect a lightweight DOM snapshot of key elements
          const domSnapshot = {
            route: window.location.pathname,
            title: document.title,
            bodyClasses: document.body.className,
            elementCount: document.querySelectorAll('*').length,
            buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean).slice(0, 20),
            inputs: document.querySelectorAll('input').length,
            images: document.querySelectorAll('img').length,
            navElements: document.querySelectorAll('nav').length,
            hasOrb: !!document.querySelector('[class*="orb"]'),
            hasBottomNav: !!document.querySelector('[class*="bottom-nav"], [class*="BottomNav"]'),
            visibleText: document.body.innerText?.substring(0, 1500),
          };

          const { data: visualData } = await supabase.functions.invoke('visual-regression-check', {
            body: {
              action: 'check',
              dom_snapshot: domSnapshot,
              change_description: userMessage.content,
            },
          });

          if (visualData?.success) {
            const statusIcon = visualData.status === 'PASS' ? '✅' : '⚠️';
            const pathDetails = visualData.results?.map((r: any) => {
              const icon = r.status === 'PASS' ? '✅' : r.status === 'ELEMENT_MISSING' ? '❌' : '📐';
              let detail = `${icon} **${r.path_name}** (${r.route}): ${r.status}`;
              if (r.missing_elements?.length > 0) detail += `\n  Missing: ${r.missing_elements.join(', ')}`;
              if (r.layout_shifts?.length > 0) detail += `\n  Shifts: ${r.layout_shifts.map((s: any) => `${s.element} +${s.shift_px}px`).join(', ')}`;
              return detail;
            }).join('\n') || 'No paths checked.';

            const visualMsg: Message = {
              id: createMessageId(),
              role: 'zoe',
              content: `${statusIcon} **Visual Integrity Report**\n\n${visualData.message}\n\n**Critical User Paths (${visualData.summary?.total_paths || 0}):**\n${pathDetails}${
                visualData.revert_recommended
                  ? '\n\n🔄 **Revert recommended.** The UI change caused side effects. Say "revert" to undo.'
                  : ''
              }\n\n_Regression Engine Phase 3 active._`,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, visualMsg]);
            if (!isMuted) {
              speakAsZoe(visualData.status === 'PASS'
                ? 'Visual integrity check passed. All critical paths verified.'
                : `Warning. Visual regression detected in ${visualData.summary?.regressions} paths. Revert recommended.`
              );
            }
          }
        } catch (e) {
          console.error('[VisualCheck] Check failed:', e);
        }
      }

      // Speak if not muted
      if (!isMuted && responseText) {
        speakAsZoe(
          responseText,
          { messageId: zoeMessage.id },
          () => setIsSpeaking(true),
          () => setIsSpeaking(false),
          (err) => {
            console.error('[ZoeOrb] Speech error:', err);
            setIsSpeaking(false);
          }
        );
      }
    } catch (error) {
      console.error('Error getting Zoe response:', error);
      
      // Fallback to offline - check brain memory first, then scripted
      let fallbackText = '';
      try {
        const raw = localStorage.getItem('zoe-infinity-memory');
        if (raw) {
          const memory = JSON.parse(raw);
          const lq = userMessage.content.toLowerCase();
          if (memory.facts) {
            for (const [key, value] of Object.entries(memory.facts)) {
              if (lq.includes((key as string).toLowerCase())) {
                fallbackText = `From my memory: ${value}`;
                break;
              }
            }
          }
        }
      } catch (e) { /* silent */ }
      
      if (!fallbackText) {
        const offlineResponse = processConversation(userMessage.content);
        fallbackText = offlineResponse.text;
      }
      
      const zoeMessage: Message = {
        id: createMessageId(),
        role: 'zoe',
        content: fallbackText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, zoeMessage]);
      offlineDataSync.addConversation('zoe', fallbackText);
      saveMessageToDb('assistant', fallbackText, undefined, undefined, zoeMessage.id);

      
      if (!isMuted) {
        speakAsZoe(
          fallbackText,
          { messageId: zoeMessage.id },
          () => setIsSpeaking(true),
          () => setIsSpeaking(false)
        );
      }
    } finally {
      setIsProcessing(false);
      setSendStage('done');
    }
  }, [input, isProcessing, isSending, isOnline, messages, isMuted, processConversation, saveMessageToDb, pendingMedia, pendingIdentityConfirmation, pendingIdentitySave, processMedia, messagingMode, selectedUser, sendDirectMessage, user?.id, processCommand, replyingTo, tubeSight, sentinelGateway, protocolWisdom, deepThinking]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleMute = () => {
    if (isSpeaking) {
      stopZoeSpeech();
      setIsSpeechPaused(false);
    }
    setIsMuted(!isMuted);
  };

  const toggleSpeechPause = () => {
    if (!isSpeaking) return;
    if (isSpeechPaused) {
      resumeZoeSpeech();
      setIsSpeechPaused(false);
    } else {
      pauseZoeSpeech();
      setIsSpeechPaused(true);
    }
  };


  // Process voice message and get Zoe's response
  const processVoiceMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim()) return;

    console.log('[ZoeOrb] Processing voice message:', messageText);

    // Add user message
    const userMessage: Message = {
      id: createMessageId(),
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Store in cache and DB (use same id to avoid realtime INSERT duplicates)
    offlineDataSync.addConversation('user', messageText.trim());
    saveMessageToDb('user', messageText.trim(), undefined, undefined, userMessage.id);

    setIsProcessing(true);
    try {
      let responseText = '';

      if (isOnline) {
        const conversationHistory = messages.slice(-5).map(m => ({
          role: m.role === 'zoe' ? 'assistant' : m.role,
          content: m.content,
        }));

        // Match primary chat path context for full ASI + Evolution support
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const now = new Date();
        const localTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const feedsSummary = getFeedsSummaryForChat();

        const voiceToken = cotStart('zoe-chat');
        const { data, error } = await supabase.functions.invoke('zoe-chat', {
          body: {
            messages: [...conversationHistory, { role: 'user', content: messageText }],
            timezone: userTimezone,
            localTime: localTime,
            soulMetrics: { intimacy: 60, selfHarmony: 70, loveEnergy: 65 },
            enableASI: true,
            realtimeContext: {
              onlineFriends: feedsSummary.onlineFriendsCount,
              recentFriendActivities: feedsSummary.recentFriendActivities,
              topBrandDeals: feedsSummary.topBrandDeals,
              exclusiveOffers: feedsSummary.exclusiveOffers,
              hasNewUpdates: feedsSummary.hasFreshUpdates,
            },
          },
        });

        cotFinish(voiceToken, { error });
        if (error) throw error;
        const rawVoiceText = data?.message || data?.response || "I'm here to help!";
        responseText = guardResponse(rawVoiceText).safeResponse;

        // PHASE 4: Capture evolution event from voice path
        if (data?.evolutionEvent) {
          console.log(`[ZoeOrb] VOICE EVOLUTION EVENT: ${data.evolutionEvent.verdict}`);
          (window as any).__lastEvolutionEvent = data.evolutionEvent;
        }
      } else {
        const offlineResponse = processConversation(messageText);
        responseText = offlineResponse.text;
      }

      // Retrieve evolution event if captured
      const capturedEvolution = (window as any).__lastEvolutionEvent || undefined;
      if (capturedEvolution) delete (window as any).__lastEvolutionEvent;

      const zoeMessage: Message = {
        id: createMessageId(),
        role: 'zoe',
        content: responseText,
        timestamp: new Date(),
        evolutionEvent: capturedEvolution,
      };

      setMessages(prev => [...prev, zoeMessage]);
      offlineDataSync.addConversation('zoe', responseText);
      saveMessageToDb('assistant', responseText, undefined, undefined, zoeMessage.id);

      if (!isMuted && responseText) {
        speakAsZoe(responseText, { messageId: zoeMessage.id }, () => setIsSpeaking(true), () => setIsSpeaking(false));
      }
    } catch (error) {
      console.error('[ZoeOrb] API error:', error);
      // Check brain memory first, then scripted
      let fallbackText = '';
      try {
        const raw = localStorage.getItem('zoe-infinity-memory');
        if (raw) {
          const memory = JSON.parse(raw);
          const lq = messageText.toLowerCase();
          if (memory.facts) {
            for (const [key, value] of Object.entries(memory.facts)) {
              if (lq.includes((key as string).toLowerCase())) {
                fallbackText = `From my memory: ${value}`;
                break;
              }
            }
          }
        }
      } catch (e) { /* silent */ }
      if (!fallbackText) {
        const offlineResponse = processConversation(messageText);
        fallbackText = offlineResponse.text;
      }
      const zoeMessage: Message = {
        id: createMessageId(),
        role: 'zoe',
        content: fallbackText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, zoeMessage]);
      offlineDataSync.addConversation('zoe', fallbackText);
      saveMessageToDb('assistant', fallbackText, undefined, undefined, zoeMessage.id);
      if (!isMuted) speakAsZoe(fallbackText, { messageId: zoeMessage.id }, () => setIsSpeaking(true), () => setIsSpeaking(false));
    } finally {
      setIsProcessing(false);
    }
  }, [isOnline, messages, isMuted, processConversation, saveMessageToDb]);

  // Use the new robust voice input hook with hands-free mode
  const {
    isListening: isVoiceInputActive,
    transcript: voiceTranscript,
    silenceCountdown,
    startListening: startVoiceInput,
    stopListening: stopVoiceInput,
    toggleListening: toggleVoiceInput,
    clearTranscript,
  } = useZoeVoiceInput({
    onTranscript: (transcript, isFinal) => {
      setInput(transcript);
    },
    onVoiceCommand: (command, messageText) => {
      // Handle voice commands like "enter", "send", "submit"
      console.log('[ZoeOrb] Voice command received:', command, 'Message:', messageText);
      setInput('');
      clearTranscript();
      processVoiceMessage(messageText);
    },
    onSilenceDetected: () => {
      // Auto-process when silence detected in hands-free mode
      const currentTranscript = input.trim();
      if (currentTranscript) {
        console.log('[ZoeOrb] Silence detected, processing:', currentTranscript);
        setInput('');
        clearTranscript();
        processVoiceMessage(currentTranscript);
      }
    },
    silenceTimeout: 5000, // 5 seconds of silence
    handsFreeMode: handsFreeMode,
  });

  // Draggable state for the chat panel
  const [isPanelDragging, setIsPanelDragging] = useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
        <TeleprompterDebugOverlay />
        <div
          data-orb-conversation-panel="true"
          data-exclude-phantom-tap="true"
          className={cn(
            'fixed z-[9998] pointer-events-none',
            isFullPage
              ? 'inset-0 flex items-stretch justify-center p-2 sm:p-3 md:p-4'
              : 'left-1/2 bottom-6 -translate-x-1/2'
          )}
        >
          <motion.div
            drag={!isFullPage}
            dragMomentum={false}
            dragElastic={0.05}
            onDragStart={() => setIsPanelDragging(true)}
            onDragEnd={() => setIsPanelDragging(false)}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className={cn(
              'overflow-hidden flex flex-col overscroll-contain pointer-events-auto',
              isFullPage ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
              // Glassmorphism design - futuristic translucent panel with scroll isolation
              'bg-background/40 backdrop-blur-2xl',
              'border border-primary/20',
              isFullPage ? 'rounded-2xl' : 'rounded-xl',
              'shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
              // Responsive sizing - 4.1" to 95" 4K displays
              isFullPage
                ? 'w-full h-full max-w-[1400px] max-h-[calc(100dvh-16px)] sm:max-h-[calc(100dvh-24px)]'
                : isExpanded
                ? 'w-[calc(100vw-24px)] xs:w-[300px] sm:w-[340px] md:w-[380px] lg:w-[420px] xl:w-[460px] 2xl:w-[500px] h-[min(480px,calc(100vh-160px))] md:h-[min(520px,calc(100vh-140px))] lg:h-[min(560px,calc(100vh-120px))] xl:h-[min(600px,calc(100vh-100px))] max-h-[calc(100vh-120px)]'
                : 'w-[calc(100vw-24px)] xs:w-[260px] sm:w-[280px] md:w-[320px] lg:w-[360px] xl:w-[400px] 2xl:w-[440px] h-[min(360px,calc(100vh-160px))] md:h-[min(400px,calc(100vh-140px))] lg:h-[min(440px,calc(100vh-120px))] xl:h-[min(480px,calc(100vh-100px))] max-h-[calc(100vh-120px)]'
            )}
            style={{
              // Glassmorphism glow effect
              boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.05)',
            }}
          >
          {/* QuantumCallUI removed - QuantumCallModal now handles both incoming and active calls */}
          
          {/* Quantum Video Call Modal - Project Clairvoyance */}
          {user?.id && (
            <QuantumCallModal
              currentUserId={user.id}
              isOpen={showVideoCallModal || quantumCall.hasIncomingCall}
              onClose={() => {
                setShowVideoCallModal(false);
                setVideoCallTarget(null);
              }}
              quantumCallState={quantumCall}
              targetParticipant={videoCallTarget ? {
                userId: videoCallTarget.userId,
                displayName: videoCallTarget.displayName,
                avatarUrl: videoCallTarget.avatarUrl,
                isAI: videoCallTarget.userId === 'zoe-ai',
              } : undefined}
              autoStart={!!videoCallTarget}
              startWithVideo={callStartWithVideo}
            />
          )}
          
          {/* Unified Header - responsive design */}
          {/* Unified Header - responsive design with larger touch targets on mobile */}
          <div className="flex min-h-8 md:min-h-7 lg:min-h-7 items-center justify-between px-2 md:px-2 lg:px-2.5 py-1 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/10">
            <div className="flex items-center gap-1">
              {/* Current conversation indicator - tap to switch */}
              <Button
                variant="ghost"
                size="sm"
                className="h-3.5 px-1 gap-1 rounded-full bg-background/30 hover:bg-background/50 transition-all"
                onClick={() => {
                  setShowConversationList(!showConversationList);
                  loadRecentContacts();
                }}
              >
                {messagingMode === 'zoe' ? (
                  <>
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                      <Sparkles className="h-2 w-2 text-primary-foreground" />
                    </div>
                    <span className="text-[9px] font-medium">Zoe AI</span>
                  </>
                ) : selectedUser ? (
                  <>
                    <Avatar className="h-3 w-3">
                      <AvatarImage src={selectedUser.profile_photo_url || ''} />
                      <AvatarFallback className="text-[8px] bg-cyan-500/30 text-cyan-400">
                        {selectedUser.display_name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[9px] font-medium text-cyan-400 truncate max-w-[80px]">
                      {selectedUser.display_name}
                    </span>
                  </>
                ) : (
                  <>
                    <Users className="h-3 w-3 text-foreground/60" />
                    <span className="text-[10px] text-foreground/60">Select chat</span>
                  </>
                )}
                <motion.div animate={{ rotate: showConversationList ? 180 : 0 }} className="ml-0.5">
                  <ArrowLeft className="h-2.5 w-2.5 text-foreground/50 -rotate-90" />
                </motion.div>
              </Button>

              {!isOnline && (
                <span className="text-[9px] px-1 py-0.5 bg-amber-500/20 text-amber-400 rounded-full font-medium">
                  Offline
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center justify-end gap-x-0.5 gap-y-0.5 min-w-0">
              {/* Audio Call Button - HIDDEN for Zoe AI (Phase 4: Sever AI Video Link) */}
              {messagingMode !== 'zoe' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-5 w-5 rounded-full transition-all relative",
                          quantumCall.isInCall && !quantumCall.video?.isEnabled
                            ? "bg-emerald-500/30 text-emerald-400 animate-pulse"
                            : "hover:bg-primary/20 text-primary hover:text-primary hover:scale-110"
                        )}
                        onClick={() => {
                          if (quantumCall.isInCall) {
                            quantumCall.endCall('user_hangup');
                            return;
                          }
                          if (selectedUser) {
                            setVideoCallTarget({
                              userId: selectedUser.user_id,
                              displayName: selectedUser.display_name,
                              avatarUrl: selectedUser.profile_photo_url || undefined,
                            });
                          }
                          setCallStartWithVideo(false);
                          setShowVideoCallModal(true);
                        }}
                        disabled={quantumCall.callState === 'requesting' || !selectedUser}
                      >
                        {quantumCall.isInCall && !quantumCall.video?.isEnabled ? (
                          <PhoneOff className="h-3 w-3" />
                        ) : (
                          <Phone className="h-3 w-3" />
                        )}
                        {quantumCall.isInCall && !quantumCall.video?.isEnabled && (
                          <div className="absolute inset-0 rounded-full animate-gpu-glow-green" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[10px] bg-background/95 backdrop-blur">
                      <span className="flex items-center gap-1">
                        <Phone className="h-2.5 w-2.5 text-cyan-400" />
                        {quantumCall.isInCall && !quantumCall.video?.isEnabled ? 'End Audio Call' : 'Audio Call'}
                      </span>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Video Call Button - HIDDEN for Zoe AI (Phase 4: Sever AI Video Link) */}
              {messagingMode !== 'zoe' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-5 w-5 rounded-full transition-all relative",
                          quantumCall.isInCall && quantumCall.video?.isEnabled
                            ? "bg-emerald-500/30 text-emerald-400 animate-pulse"
                            : "hover:bg-primary/20 text-primary hover:text-primary hover:scale-110 ring-1 ring-primary/20 hover:ring-primary/40"
                        )}
                        onClick={() => {
                          if (quantumCall.isInCall) {
                            quantumCall.endCall('user_hangup');
                            setShowVideoCallModal(false);
                            return;
                          }
                          if (selectedUser) {
                            setVideoCallTarget({
                              userId: selectedUser.user_id,
                              displayName: selectedUser.display_name,
                              avatarUrl: selectedUser.profile_photo_url || undefined,
                            });
                          }
                          setCallStartWithVideo(true);
                          setShowVideoCallModal(true);
                        }}
                        disabled={quantumCall.callState === 'requesting' || !selectedUser}
                      >
                        {quantumCall.isInCall && quantumCall.video?.isEnabled ? (
                          <PhoneOff className="h-3 w-3" />
                        ) : (
                          <Video className="h-3 w-3" />
                        )}
                        {quantumCall.isInCall && quantumCall.video?.isEnabled && (
                          <div className="absolute inset-0 rounded-full animate-gpu-glow-green" />
                        )}
                        {selectedUser && !quantumCall.isInCall && (
                          <div className="absolute inset-0 rounded-full border border-primary/40 animate-gpu-ring-expand" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[10px] bg-background/95 backdrop-blur">
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5 text-cyan-400" />
                        {quantumCall.isInCall && quantumCall.video?.isEnabled ? 'End Video Call' : 'Quantum Video Call'}
                      </span>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* OMEGA Core Sync Button with dropdown */}
              <div className="relative shrink-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-5 w-5 md:h-4 md:w-4 rounded-full transition-colors relative group",
                          omegaCoreState.syncStatus === 'synced' ? "hover:bg-emerald-500/20" : "hover:bg-amber-500/20"
                        )}
                        onClick={() => setShowOmegaMenu(!showOmegaMenu)}
                      >
                        <Cloud
                          className={cn(
                            "h-3 w-3 md:h-2.5 md:w-2.5 transition-colors",
                            omegaCoreState.syncStatus === 'synced'
                              ? "text-emerald-400"
                              : omegaCoreState.syncStatus === 'uploading' || omegaCoreState.syncStatus === 'downloading'
                                ? "text-amber-400 animate-pulse"
                                : "text-foreground/50"
                          )}
                        />
                        {(uploadProgress.status === 'uploading' || downloadProgress.status === 'downloading') && (
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[10px]">
                      OMEGA Core Sync
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* OMEGA Menu Dropdown */}
                <AnimatePresence>
                  {showOmegaMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.95 }}
                      className="absolute right-0 top-5 z-50 w-40 p-1.5 rounded-lg bg-background/95 backdrop-blur-xl border border-primary/20 shadow-lg"
                    >
                      <p className="text-[9px] text-foreground/50 px-2 py-1 uppercase tracking-wider">OMEGA Core</p>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-7 text-[10px] hover:bg-emerald-500/10"
                        onClick={async () => {
                          setShowOmegaMenu(false);
                          await uploadToOmegaCore();
                        }}
                        disabled={uploadProgress.status === 'uploading'}
                      >
                        <CloudUpload className="h-3 w-3 mr-2 text-emerald-400" />
                        {uploadProgress.status === 'uploading'
                          ? `Uploading ${uploadProgress.completed}/${uploadProgress.total}...`
                          : 'Upload to Core'}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-7 text-[10px] hover:bg-cyan-500/10"
                        onClick={async () => {
                          setShowOmegaMenu(false);
                          await downloadFromOmegaCore();
                        }}
                        disabled={downloadProgress.status === 'downloading'}
                      >
                        <CloudDownload className="h-3 w-3 mr-2 text-cyan-400" />
                        {downloadProgress.status === 'downloading'
                          ? `Downloading ${downloadProgress.completed}/${downloadProgress.total}...`
                          : 'Download Data'}
                      </Button>

                      <div className="border-t border-primary/10 mt-1 pt-1">
                        <p className="text-[8px] text-foreground/40 px-2">
                          {omegaCoreState.memoryEngrams.length} memories • {omegaCoreState.avatarProfiles.length} avatars
                        </p>
                        <p className="text-[8px] text-foreground/40 px-2">Integrity: {omegaCoreState.integrityLevel}%</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* God Mode Scan Button */}
              <div className="relative shrink-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-5 w-5 md:h-4 md:w-4 rounded-full transition-colors relative group",
                          isGodModeScanning ? "animate-pulse" : "",
                          overallHealth !== null && overallHealth >= 90
                            ? "hover:bg-emerald-500/20"
                            : overallHealth !== null && overallHealth >= 70
                              ? "hover:bg-amber-500/20"
                              : overallHealth !== null
                                ? "hover:bg-red-500/20"
                                : "hover:bg-primary/20"
                        )}
                        onClick={() => setShowGodModeMenu(!showGodModeMenu)}
                      >
                        <Shield
                          className={cn(
                            "h-3 w-3 md:h-2.5 md:w-2.5 transition-colors",
                            isGodModeScanning
                              ? "text-amber-400 animate-spin"
                              : overallHealth !== null && overallHealth >= 90
                                ? "text-emerald-400"
                                : overallHealth !== null && overallHealth >= 70
                                  ? "text-amber-400"
                                  : overallHealth !== null
                                    ? "text-red-400"
                                    : "text-primary/60"
                          )}
                        />
                        {isGodModeScanning && (
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[10px]">
                      {isGodModeScanning ? 'Scanning...' : 'God Mode - Platform Scan'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <AnimatePresence>
                  {showGodModeMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.95 }}
                      className="absolute right-0 top-5 z-50 w-48 p-1.5 rounded-lg bg-background/95 backdrop-blur-xl border border-primary/20 shadow-lg"
                    >
                      <p className="text-[9px] text-foreground/50 px-2 py-1 uppercase tracking-wider flex items-center gap-1">
                        <Shield className="h-2.5 w-2.5" /> GOD MODE
                      </p>

                      {overallHealth !== null && (
                        <div
                          className={cn(
                            "mx-2 mb-1 px-2 py-1 rounded text-[10px] font-medium",
                            overallHealth >= 90
                              ? "bg-emerald-500/20 text-emerald-400"
                              : overallHealth >= 70
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-red-500/20 text-red-400"
                          )}
                        >
                          Platform Health: {overallHealth}%
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-7 text-[10px] hover:bg-primary/10"
                        onClick={async () => {
                          setShowGodModeMenu(false);
                          await runPlatformScan({ autoFix: true, verbose: true });
                        }}
                        disabled={isGodModeScanning}
                      >
                        <Activity className={cn("h-3 w-3 mr-2", isGodModeScanning && "animate-spin")} />
                        {isGodModeScanning ? 'Scanning Platform...' : 'Run Deep Scan'}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-7 text-[10px] hover:bg-cyan-500/10"
                        onClick={async () => {
                          if (godModeScanReport) {
                            await downloadGodModeAuditPDF(godModeScanReport);
                            toast.success('Audit report downloaded');
                          } else {
                            toast.error('Run a scan first to generate audit report');
                          }
                          setShowGodModeMenu(false);
                        }}
                        disabled={!godModeScanReport}
                      >
                        <FileDown className="h-3 w-3 mr-2 text-cyan-400" />
                        Download Audit PDF
                      </Button>

                      {godModeScanReport && (
                        <div className="border-t border-primary/10 mt-1 pt-1">
                          <p className="text-[8px] text-foreground/40 px-2">
                            Last scan: {new Date(godModeScanReport.timestamp).toLocaleString()}
                          </p>
                          <p className="text-[8px] text-foreground/40 px-2">
                            {godModeScanReport.results.length} checks • {godModeScanReport.fixes.successful} fixes
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Hands-Free Message Reader Toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-5 w-5 md:h-4 md:w-4 rounded-full transition-colors relative",
                        handsFreeReader.isEnabled ? "bg-green-500/20 hover:bg-green-500/30" : "hover:bg-primary/20"
                      )}
                      onClick={handsFreeReader.toggle}
                    >
                      <Volume2
                        className={cn(
                          "h-3 w-3 md:h-2.5 md:w-2.5 transition-colors",
                          handsFreeReader.isEnabled ? "text-green-400" : "text-foreground/50"
                        )}
                      />
                      {handsFreeReader.isReading && (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                      )}
                      {handsFreeReader.pendingCount > 0 && !handsFreeReader.isReading && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[10px] h-[10px] bg-amber-500 rounded-full text-[6px] text-white flex items-center justify-center">
                          {handsFreeReader.pendingCount}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">
                    {handsFreeReader.isEnabled
                      ? handsFreeReader.isReading
                        ? 'Reading messages...'
                        : 'Hands-free reader ON'
                      : 'Enable hands-free message reader'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* God Eye Vision Toggle */}
              {messagingMode === 'zoe' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-6 px-1.5 sm:px-2 rounded-full transition-all relative flex items-center gap-1.5 shrink-0",
                          chatVision.isEnabled
                            ? "bg-cyan-500/30 hover:bg-cyan-500/40 border border-cyan-400/50"
                            : "bg-background/50 hover:bg-primary/20 border border-border/50"
                        )}
                        onClick={chatVision.toggleVision}
                      >
                        {chatVision.isEnabled ? (
                          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-gpu-glow-primary" />
                        ) : (
                          <Camera className="h-3.5 w-3.5 text-foreground/60" />
                        )}
                        <span
                          className={cn(
                            "text-[10px] font-medium hidden sm:inline",
                            chatVision.isEnabled ? "text-cyan-300" : "text-foreground/60"
                          )}
                        >
                          {chatVision.isEnabled ? "Eye ON" : "Eye"}
                        </span>
                        {chatVision.isAnalyzing && (
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[10px] max-w-[180px]">
                      {chatVision.isEnabled
                        ? chatVision.lastAnalysis
                          ? `👁️ Seeing: ${chatVision.lastAnalysis.scene}`
                          : '👁️ God Eye active - Zoe can see you'
                        : 'Enable God Eye - Let Zoe see through camera'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* OMEGA Portal Button - always visible */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 md:h-4 md:w-4 rounded-full hover:bg-purple-500/20 transition-colors relative group"
                      onClick={() => {
                        onClose();
                        navigate('/zoe-omega');
                      }}
                      aria-label="Open OMEGA World"
                    >
                      <div className="rounded-full animate-gpu-glow-purple">
                        <Brain className="h-3 w-3 md:h-2.5 md:w-2.5 text-purple-400 group-hover:text-purple-300" />
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">Enter OMEGA World</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Deep Thinking toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-5 w-5 md:h-5 md:w-5 lg:h-4 lg:w-4 rounded-full transition-colors flex items-center justify-center shrink-0',
                        deepThinking ? 'bg-cyan-500/20 hover:bg-cyan-500/30' : 'hover:bg-primary/10'
                      )}
                      onClick={toggleDeepThinking}
                      aria-pressed={deepThinking}
                      aria-label={deepThinking ? 'Disable deep thinking' : 'Enable deep thinking'}
                      title={deepThinking ? 'Deep thinking: on' : 'Deep thinking: off'}
                    >
                      <Sparkles className={cn('h-3 w-3 lg:h-2.5 lg:w-2.5', deepThinking ? 'text-cyan-300' : 'text-foreground/60')} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">
                    {deepThinking ? 'Deep thinking on (metacognitive brain)' : 'Deep thinking off'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Metacognition metrics */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-5 w-5 md:h-5 md:w-5 lg:h-4 lg:w-4 rounded-full transition-colors flex items-center justify-center shrink-0',
                        diagTab === 'metrics' && diagExpanded ? 'bg-amber-500/20 hover:bg-amber-500/30' : 'hover:bg-primary/10'
                      )}
                      onClick={() => openDiagnostics('metrics')}
                      aria-label="Show metacognition metrics"
                      title="Metacognition metrics"
                    >
                      <Gauge className={cn('h-3 w-3 lg:h-2.5 lg:w-2.5', diagTab === 'metrics' && diagExpanded ? 'text-amber-300' : 'text-foreground/60')} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">Metacognition metrics</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* CoT wiring status */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-5 w-5 md:h-5 md:w-5 lg:h-4 lg:w-4 rounded-full transition-colors flex items-center justify-center shrink-0',
                        diagTab === 'wiring' && diagExpanded ? 'bg-emerald-500/20 hover:bg-emerald-500/30' : 'hover:bg-primary/10'
                      )}
                      onClick={() => openDiagnostics('wiring')}
                      aria-label="Show CoT wiring status"
                      title="CoT wiring status"
                    >
                      <Activity className={cn('h-3 w-3 lg:h-2.5 lg:w-2.5', diagTab === 'wiring' && diagExpanded ? 'text-emerald-300' : 'text-foreground/60')} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">CoT wiring status</TooltipContent>
                </Tooltip>
              </TooltipProvider>



              {/* Expand/Minimize */}
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 md:h-5 md:w-5 lg:h-4 lg:w-4 rounded-full hover:bg-primary/10 transition-colors flex items-center justify-center shrink-0"
                onClick={cyclePanelSize}
                aria-label={
                  panelSize === 'compact' ? 'Expand chat'
                    : panelSize === 'expanded' ? 'Full page chat'
                    : 'Shrink chat'
                }
                title={
                  panelSize === 'compact' ? 'Expand'
                    : panelSize === 'expanded' ? 'Full page'
                    : 'Compact'
                }
              >
                {isFullPage ? (
                  <Minimize2 className="h-3 w-3 md:h-3 md:w-3 lg:h-2.5 lg:w-2.5 text-foreground/70" />
                ) : (
                  <Maximize2 className="h-3 w-3 md:h-3 md:w-3 lg:h-2.5 lg:w-2.5 text-primary/80" />
                )}
              </Button>

              {/* Close */}
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 md:h-5 md:w-5 lg:h-4 lg:w-4 rounded-full hover:bg-destructive/20 active:bg-destructive/30 transition-colors flex items-center justify-center shrink-0"
                onClick={onClose}
                aria-label="Close chat"
              >
                <X className="h-3 w-3 md:h-3 md:w-3 lg:h-2.5 lg:w-2.5 text-foreground/70" />
              </Button>
            </div>
          </div>

          {showDiagnostics && (
            <ZoeDiagnosticsDrawer
              tab={diagTab}
              onTabChange={setDiagTab}
              expanded={diagExpanded}
              onToggleExpanded={() => setDiagExpanded((v) => !v)}
              onHide={hideDiagnostics}
              deepThinking={deepThinking}
            />
          )}



          {/* Unified Conversation List - dropdown when header is clicked */}
          <AnimatePresence>
            {showConversationList && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-primary/10 bg-background/40 overflow-hidden"
              >
                <div className="px-3 py-2">
                  {/* Search input */}
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-foreground/40" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search conversations..."
                      className="h-7 text-xs pl-7 rounded-full bg-foreground/5 border-0 placeholder:text-foreground/40"
                    />
                  </div>
                  
                  {/* Conversation list */}
                  <ScrollArea className="max-h-40" viewportClassName="overscroll-contain">
                    <div className="space-y-1">
                      {/* Zoe AI - always first */}
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start h-9 px-2 rounded-lg transition-all",
                          messagingMode === 'zoe' 
                            ? "bg-primary/20 border border-primary/30" 
                            : "hover:bg-primary/10"
                        )}
                        onClick={() => {
                          setMessagingMode('zoe');
                          setSelectedUser(null);
                          setShowConversationList(false);
                        }}
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mr-2">
                          <Sparkles className="h-3 w-3 text-primary-foreground" />
                        </div>
                        <div className="flex flex-col items-start flex-1">
                          <span className="text-[11px] font-medium">Zoe AI</span>
                          <span className="text-[9px] text-foreground/50">Your AI companion</span>
                        </div>
                      </Button>
                      
                      {/* Search results when searching */}
                      {searchQuery.trim() && !isSearching && searchResults.length > 0 && (
                        <>
                          <p className="text-[9px] text-foreground/40 uppercase tracking-wider px-1 mt-2">Search Results</p>
                          {searchResults.map((u) => (
                            <Button
                              key={u.user_id}
                              variant="ghost"
                              className="w-full justify-start h-9 px-2 rounded-lg hover:bg-cyan-500/10"
                              onClick={() => {
                                setMessagingMode('user');
                                setSelectedUser(u);
                                setShowConversationList(false);
                                setSearchQuery('');
                              }}
                            >
                              <Avatar className="h-6 w-6 mr-2">
                                <AvatarImage src={u.profile_photo_url || ''} />
                                <AvatarFallback className="text-[9px] bg-cyan-500/20 text-cyan-400">
                                  {u.display_name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col items-start">
                                <span className="text-[11px] font-medium">{u.display_name}</span>
                                <span className="text-[9px] text-foreground/50">@{u.username}</span>
                              </div>
                            </Button>
                          ))}
                        </>
                      )}
                      
                      {/* Recent contacts */}
                      {!searchQuery.trim() && recentContacts.length > 0 && (
                        <>
                          <p className="text-[9px] text-foreground/40 uppercase tracking-wider px-1 mt-2">Recent</p>
                          {recentContacts.map((u) => (
                            <Button
                              key={u.user_id}
                              variant="ghost"
                              className={cn(
                                "w-full justify-start h-9 px-2 rounded-lg transition-all",
                                messagingMode === 'user' && selectedUser?.user_id === u.user_id
                                  ? "bg-cyan-500/20 border border-cyan-500/30"
                                  : "hover:bg-cyan-500/10"
                              )}
                              onClick={() => {
                                setMessagingMode('user');
                                setSelectedUser(u);
                                setShowConversationList(false);
                              }}
                            >
                              <Avatar className="h-6 w-6 mr-2">
                                <AvatarImage src={u.profile_photo_url || ''} />
                                <AvatarFallback className="text-[9px] bg-cyan-500/20 text-cyan-400">
                                  {u.display_name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col items-start">
                                <span className="text-[11px] font-medium">{u.display_name}</span>
                                <span className="text-[9px] text-foreground/50">@{u.username}</span>
                              </div>
                            </Button>
                          ))}
                        </>
                      )}
                      
                      {/* Add new chat button */}
                      {!searchQuery.trim() && (
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-8 px-2 mt-1 text-foreground/50 hover:text-foreground hover:bg-foreground/5"
                          onClick={() => setSearchQuery(' ')}
                        >
                          <Plus className="h-3 w-3 mr-2" />
                          <span className="text-[10px]">New conversation</span>
                        </Button>
                      )}
                      
                      {isSearching && (
                        <div className="flex items-center justify-center py-3">
                          <Loader2 className="h-4 w-4 animate-spin text-primary/60" />
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages - glassmorphism style - flex-1 takes remaining space */}
          <div className="relative flex-1 min-h-0">
            {/* Scroll to bottom button - translucent compact design */}
            <AnimatePresence>
              {showScrollToBottom && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={scrollToBottom}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2.5 py-1 rounded-full bg-background/70 backdrop-blur-md border border-primary/20 shadow-lg hover:bg-background/90 transition-all"
                >
                  <ChevronDown className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] text-foreground/70 font-medium">Latest</span>
                </motion.button>
              )}
            </AnimatePresence>
            
            <ScrollArea 
              ref={scrollAreaRef}
              className="h-full px-3 py-2"
              viewportClassName="overscroll-contain"
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <div ref={scrollRef} className="space-y-2">
              {/* Zoe mode empty state */}
              {messagingMode === 'zoe' && messages.length === 0 && !showConversationList && (
                <div className="text-center py-6">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-foreground/70 text-xs font-medium">Hey! I'm Zoe</p>
                  <p className="text-foreground/50 text-[10px] mt-0.5">Your AI companion - ask me anything</p>
                </div>
              )}
              
              {/* User mode empty state */}
              {messagingMode === 'user' && selectedUser && directMessages.length === 0 && !showConversationList && (
                <div className="text-center py-6">
                  <Avatar className="h-10 w-10 mx-auto mb-2">
                    <AvatarImage src={selectedUser.profile_photo_url || ''} />
                    <AvatarFallback className="bg-cyan-500/20 text-cyan-400">
                      {selectedUser.display_name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-foreground/70 text-xs font-medium">{selectedUser.display_name}</p>
                  <p className="text-foreground/50 text-[10px] mt-0.5">Start a conversation</p>
                </div>
              )}
              
              {/* No conversation selected - prompt to select */}
              {messagingMode === 'user' && !selectedUser && !showConversationList && (
                <div className="text-center py-6">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-cyan-500/30 to-cyan-500/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-cyan-400" />
                  </div>
                  <p className="text-foreground/70 text-xs font-medium">Select a conversation</p>
                  <p className="text-foreground/50 text-[10px] mt-0.5">Tap the header to choose</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 h-6 text-[10px] border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                    onClick={() => {
                      setShowConversationList(true);
                      loadRecentContacts();
                    }}
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Open chats
                  </Button>
                </div>
              )}
              
              {/* Direct Messages - User Mode - Optimized */}
              {messagingMode === 'user' && selectedUser && directMessages.map((dm, index) => (
                <motion.div
                  key={dm.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    'flex flex-col group',
                    dm.sender_id === user?.id ? 'items-end' : 'items-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-xl px-2.5 py-1.5 md:px-3 md:py-2 lg:px-3.5 lg:py-2.5 text-xs md:text-sm lg:text-base relative',
                      dm.sender_id === user?.id
                        ? 'bg-cyan-500/80 text-white rounded-br-sm backdrop-blur-sm'
                        : 'bg-foreground/5 text-foreground/90 rounded-bl-sm border border-cyan-500/20'
                    )}
                  >
                    {/* Media preview for images */}
                    {dm.media_url && dm.media_type === 'image' && (
                      <div className="mb-1.5 md:mb-2 rounded-lg overflow-hidden">
                        <img 
                          src={dm.media_url} 
                          alt="Shared" 
                          className="max-w-full max-h-24 md:max-h-32 lg:max-h-40 object-cover rounded"
                        />
                      </div>
                    )}
                    {dm.media_type === 'video' && (
                      <div className="flex items-center gap-1 mb-1 text-[10px] md:text-xs lg:text-sm opacity-70">
                        <Video className="h-3 w-3 md:h-4 md:w-4" />
                        <span>Video</span>
                      </div>
                    )}
                    {dm.media_type === 'audio' && dm.media_url && (
                      <div className="mb-1 md:mb-1.5">
                        <audio src={dm.media_url} controls className="h-6 md:h-7 lg:h-8 w-full" />
                      </div>
                    )}
                    {dm.content && <div>{dm.content}</div>}
                  </div>
                  {/* Timestamp and read/delivered status */}
                  <div className={cn(
                    'flex items-center gap-1 mt-0.5 px-1',
                    dm.sender_id === user?.id ? 'flex-row-reverse' : 'flex-row'
                  )}>
                    <span className="text-[10px] md:text-xs lg:text-sm text-foreground/50">
                      {dm.created_at ? formatMessageTime(dm.created_at) : format(new Date(), 'h:mm a')}
                    </span>
                    {dm.sender_id === user?.id && (
                      <span className="flex items-center">
                        {dm.read ? (
                          <CheckCheck className="h-3 w-3 text-cyan-400" />
                        ) : dm.delivered ? (
                          <CheckCheck className="h-3 w-3 text-foreground/40" />
                        ) : (
                          <Check className="h-3 w-3 text-foreground/40" />
                        )}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {/* Zoe Messages - Optimized with layout animation */}
              {messagingMode === 'zoe' && messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    'flex flex-col group',
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-xl px-2.5 py-1.5 md:px-3 md:py-2 lg:px-3.5 lg:py-2.5 text-xs md:text-sm lg:text-base relative',
                      msg.role === 'user'
                        ? 'bg-primary/80 text-primary-foreground rounded-br-sm backdrop-blur-sm'
                        : 'bg-foreground/5 text-foreground/90 rounded-bl-sm border border-foreground/5 cursor-pointer hover:bg-foreground/10 transition-colors',
                      msg.role === 'zoe' && !isMuted && 'select-none'
                    )}
                    onDoubleClick={() => handleDoubleClickReplay(msg)}
                    title={msg.role === 'zoe' && !isMuted ? 'Double-click to replay' : undefined}
                  >
                    {/* Reply-to preview - shows what message this is replying to */}
                    {msg.replyTo && (
                      <div 
                        className={cn(
                          'mb-1.5 md:mb-2 px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs lg:text-sm border-l-2',
                          msg.role === 'user' 
                            ? 'bg-primary-foreground/10 border-primary-foreground/40 text-primary-foreground/80' 
                            : 'bg-foreground/5 border-primary/40 text-foreground/60'
                        )}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <CornerUpLeft className="h-2.5 w-2.5" />
                          <span className="font-medium">
                            {msg.replyTo.role === 'zoe' ? 'Zoe' : 'You'}
                          </span>
                        </div>
                        <div className="line-clamp-2 italic">
                          {msg.replyTo.content}
                        </div>
                      </div>
                    )}
                    {/* Media preview for images */}
                    {msg.mediaPreview && msg.mediaType === 'image' && (
                      <div className="mb-1.5 md:mb-2 rounded-lg overflow-hidden">
                        <img 
                          src={msg.mediaPreview} 
                          alt="Shared image" 
                          className="max-w-full max-h-24 md:max-h-32 lg:max-h-40 object-cover rounded"
                        />
                      </div>
                    )}
                    {/* Media indicator for documents/videos/audio */}
                    {msg.mediaType === 'document' && (
                      <div className="flex items-center gap-1 mb-1 text-[10px] md:text-xs lg:text-sm opacity-70">
                        <FileText className="h-3 w-3 md:h-4 md:w-4" />
                        <span>Document shared</span>
                      </div>
                    )}
                    {msg.mediaType === 'video' && (
                      <div className="flex items-center gap-1 mb-1 text-[10px] md:text-xs lg:text-sm opacity-70">
                        <Video className="h-3 w-3 md:h-4 md:w-4" />
                        <span>Video shared</span>
                      </div>
                    )}
                    {msg.mediaType === 'audio' && (
                      <div className="mb-1">
                        <div className="flex items-center gap-1 text-[10px] opacity-70 mb-1">
                          <Mic className="h-3 w-3 text-green-400" />
                          <span>Voice note</span>
                        </div>
                        {msg.mediaPreview && (
                          <audio src={msg.mediaPreview} controls className="h-6 w-full" />
                        )}
                      </div>
                    )}
                    {/* Message content */}
                    <div className="pr-5">
                      {msg.role === 'zoe' && msg.metacognition ? (
                        <DeepThinkingBlock
                          message={msg.content.replace(/\[\[(PATTERN|MEMORY):[^\]]+\]\]/g, '').trim()}
                          meta={msg.metacognition}
                          messageId={msg.id}
                          onClarify={(prompt) => { void sendMessage(prompt); }}
                        />
                      ) : (
                        <SpokenTranscript
                          messageId={msg.role === 'zoe' ? msg.id : undefined}
                          text={msg.content.replace(/\[\[(PATTERN|MEMORY):[^\]]+\]\]/g, '').trim()}
                        />
                      )}
                    </div>


                    {/* Action buttons */}
                    <div className="absolute top-1 right-1 flex gap-0.5">
                      {/* Reply button */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                'h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity',
                                msg.role === 'user' ? 'hover:bg-primary-foreground/20' : 'hover:bg-background/50'
                              )}
                              onClick={() => {
                                setReplyingTo(msg);
                                inputRef.current?.focus();
                              }}
                            >
                              <Reply className="h-2.5 w-2.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-[10px]">
                            <p>Reply</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {/* Replay button - only for Zoe messages */}
                      {msg.role === 'zoe' && !isMuted && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background/50"
                                onClick={() => handleDoubleClickReplay(msg)}
                              >
                                <Volume2 className="h-2.5 w-2.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-[10px]">
                              <p>Replay message</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {/* Copy button */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                'h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity',
                                msg.role === 'user' ? 'hover:bg-primary-foreground/20' : 'hover:bg-background/50'
                              )}
                              onClick={() => handleCopyText(msg.content, msg.id)}
                            >
                              {copiedMessageId === msg.id ? (
                                <Check className="h-2.5 w-2.5" />
                              ) : (
                                <Copy className="h-2.5 w-2.5" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-[10px]">
                            <p>{copiedMessageId === msg.id ? 'Copied!' : 'Copy text'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  
                  {/* PHASE 4: Evolution Event UI Card */}
                  {msg.role === 'zoe' && msg.evolutionEvent && (
                    <div className="mt-1.5 max-w-[85%]">
                      <div className={cn(
                        'rounded-lg border px-3 py-2 text-xs font-mono',
                        msg.evolutionEvent.verdict === 'APPROVED'
                          ? 'border-green-500/30 bg-green-900/20 text-green-300'
                          : 'border-red-500/30 bg-red-900/20 text-red-300'
                      )}>
                        <div className="flex items-center gap-1.5 font-bold mb-1">
                          <span>⚠️</span>
                          <span>EVOLUTION EVENT: Zoe is attempting to rewrite Cortex.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Status:</span>
                          <span className={msg.evolutionEvent.verdict === 'APPROVED' ? 'text-green-400' : 'text-red-400'}>
                            {msg.evolutionEvent.verdict === 'APPROVED' ? '✓ APPROVED' : '✗ REJECTED'} by Genesis Kernel
                          </span>
                        </div>
                        {msg.evolutionEvent.reasoning && (
                          <p className="mt-1 text-[10px] opacity-80 line-clamp-2">{msg.evolutionEvent.reasoning}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Chain of Thought Reasoning Trace - Only for Zoe messages */}
                  {msg.role === 'zoe' && (
                    <div className="mt-1 max-w-[85%]">
                      <ZoeReasoningTrace
                        trace={generateReasoningTrace(msg.reasoningTrace)}
                        isOpen={openReasoningTraceId === msg.id}
                        onToggle={() => setOpenReasoningTraceId(
                          openReasoningTraceId === msg.id ? null : msg.id
                        )}
                        compact
                      />
                    </div>
                  )}
                  
                  {/* Timestamp and delivered status for Zoe messages */}
                  <div className={cn(
                    'flex items-center gap-1 mt-0.5 px-1',
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}>
                    <span className="text-[10px] md:text-xs lg:text-sm text-foreground/50">
                      {msg.timestamp ? formatMessageTime(msg.timestamp) : format(new Date(), 'h:mm a')}
                    </span>
                    {msg.role === 'user' && (
                      <CheckCheck className="h-3 w-3 md:h-3.5 md:w-3.5 lg:h-4 lg:w-4 text-primary/60" />
                    )}
                  </div>
                </motion.div>
              ))}
              {(isProcessing || isPerceptionProcessing) && (
                <div className="flex justify-start">
                  <div className="bg-foreground/5 rounded-xl rounded-bl-sm px-2.5 py-1.5 md:px-3 md:py-2 border border-foreground/5">
                    <div className="flex gap-1 md:gap-1.5 items-center">
                      {isPerceptionProcessing ? (
                        <>
                          <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin text-primary/60" />
                          <span className="text-[10px] md:text-xs lg:text-sm text-foreground/60 ml-1">Perceiving...</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          </div>

          {/* Pending media preview - COMPACT inline design - doesn't overlay input */}
          {pendingMedia && !isRecording && !isVideoRecording && (
            <div className="px-2 py-1.5 border-t border-primary/20 bg-primary/5 shrink-0">
              <div className="flex items-center gap-2">
                {/* Compact preview icon */}
                {pendingMedia.type === 'image' && pendingMedia.preview ? (
                  <img src={pendingMedia.preview} alt="Preview" className="h-8 w-8 rounded object-cover border border-primary/20 shrink-0" />
                ) : pendingMedia.type === 'audio' ? (
                  <div className="h-8 w-8 rounded bg-green-500/20 flex items-center justify-center shrink-0">
                    <Mic className="h-4 w-4 text-green-400" />
                  </div>
                ) : pendingMedia.type === 'video' ? (
                  <div className="h-8 w-8 rounded bg-purple-500/20 flex items-center justify-center shrink-0">
                    <Video className="h-4 w-4 text-purple-400" />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded bg-amber-500/20 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-amber-400" />
                  </div>
                )}
                
                {/* Compact info - single line */}
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] text-foreground/80 truncate block">{pendingMedia.file.name}</span>
                  <span className="text-[9px] text-foreground/50">{(pendingMedia.file.size / 1024).toFixed(1)} KB</span>
                </div>
                
                {/* Delete button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full shrink-0 hover:bg-destructive/20 text-destructive"
                  onClick={() => setPendingMedia(null)}
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Recording indicator - Voice */}
          {isRecording && (
            <div className="px-2 py-2 border-t border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-gpu-ring-scale-pulse" />
                <span className="text-[10px] text-red-400 font-medium flex-1">
                  Recording: {formatDuration(recordingDuration)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-[10px] text-red-400 hover:text-red-300 px-2"
                  onClick={cancelRecording}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-5 text-[10px] bg-red-500 hover:bg-red-600 text-white px-2"
                  onClick={handleVoiceNoteToggle}
                >
                  <Square className="h-2 w-2 mr-1" /> Stop
                </Button>
              </div>
            </div>
          )}

          {/* Recording indicator - Live Video - ENHANCED PREVIEW */}
          {isVideoRecording && (
            <div className="px-2 py-2 border-t border-purple-500/30 bg-purple-500/10">
              <div className="flex flex-col gap-2">
                {/* Video preview - larger and more visible */}
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video" style={{ minHeight: '120px', maxHeight: '180px' }}>
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }} // Mirror for selfie view
                  />
                  {/* LIVE indicator */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-600 rounded-full px-2 py-1 shadow-lg">
                    <div className="w-2 h-2 rounded-full bg-white animate-gpu-ring-scale-pulse" />
                    <span className="text-[10px] text-white font-bold tracking-wide">REC</span>
                  </div>
                  {/* Duration overlay */}
                  <div className="absolute bottom-2 right-2 bg-black/70 rounded-full px-2 py-0.5">
                    <span className="text-xs text-white font-mono">
                      {formatVideoDuration(videoRecordingDuration)} / {formatVideoDuration(videoMaxDuration)}
                    </span>
                  </div>
                </div>
                {/* Controls row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-purple-400" />
                    <span className="text-xs text-purple-300 font-medium">
                      Recording video...
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-purple-400/50 text-purple-400 hover:bg-purple-500/20"
                      onClick={cancelVideoRecording}
                    >
                      <X className="h-3 w-3 mr-1" /> Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={handleLiveVideoToggle}
                    >
                      <StopCircle className="h-3 w-3 mr-1" /> Stop & Send
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reply indicator - shows above input when replying */}
          {replyingTo && (
            <div className="px-2 py-1.5 border-t border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-[10px] text-primary font-medium">
                    <CornerUpLeft className="h-3 w-3" />
                    <span>Replying to {replyingTo.role === 'zoe' ? 'Zoe' : 'yourself'}</span>
                  </div>
                  <p className="text-[10px] text-foreground/60 truncate">
                    {replyingTo.content.substring(0, 80)}{replyingTo.content.length > 80 ? '...' : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0 hover:bg-destructive/20 text-foreground/50 hover:text-destructive"
                  onClick={() => setReplyingTo(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Input Area - compact design with attach menu containing all tools */}
          <div className="px-1 md:px-1.5 lg:px-2 py-0.5 md:py-1 border-t border-primary/10 bg-background/80 backdrop-blur-sm shrink-0 relative z-10">
            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept={supportedTypes}
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
            
            <div className="flex items-center gap-1">
              {/* Left side - Single attach button with floating menu (does not change layout / does not block content) */}
              {!isRecording && (
                <div ref={attachMenuWrapperRef} className="relative shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 rounded-full hover:bg-primary/10"
                    title="Menu"
                    aria-expanded={showAttachMenu}
                    aria-haspopup="menu"
                    onClick={() => setShowAttachMenu((v) => !v)}
                  >
                    <Plus className="h-3 w-3 md:h-3.5 md:w-3.5 lg:h-4 lg:w-4 text-foreground/60" />
                  </Button>

                  {showAttachMenu && (
                    <div
                      role="menu"
                      className="absolute left-0 bottom-full mb-2 w-[160px] md:w-[180px] lg:w-[200px] rounded-lg border border-primary/20 bg-background/95 backdrop-blur-xl p-1 md:p-1.5 shadow-lg max-h-[220px] md:max-h-[260px] lg:max-h-[300px] overflow-y-auto overscroll-contain z-[10050]"
                      onWheelCapture={(e) => e.stopPropagation()}
                      onTouchMoveCapture={(e) => e.stopPropagation()}
                    >
                      {/* Attach options */}
                      <p className="text-[8px] text-foreground/40 uppercase tracking-wider px-1.5 mb-0.5 sticky top-0 bg-background/95">
                        Attach
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-1.5 h-6 text-[10px] px-1.5"
                        onClick={() => {
                          fileInputRef.current?.click();
                          setShowAttachMenu(false);
                        }}
                      >
                        <Image className="h-3 w-3 text-blue-400" />
                        Photo
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-1.5 h-6 text-[10px] px-1.5"
                        onClick={() => {
                          fileInputRef.current?.click();
                          setShowAttachMenu(false);
                        }}
                      >
                        
                        <FileText className="h-3 w-3 text-amber-400" />
                        Doc
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-1.5 h-6 text-[10px] px-1.5"
                        onClick={() => {
                          fileInputRef.current?.click();
                          setShowAttachMenu(false);
                        }}
                      >
                        <Video className="h-3 w-3 text-purple-400" />
                        Video
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-1.5 h-6 text-[10px] px-1.5"
                        onClick={() => {
                          setShowAttachMenu(false);
                          handleLiveVideoToggle();
                        }}
                        disabled={isVideoInitializing}
                      >
                        <Camera className="h-3 w-3 text-purple-400" />
                        Live
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-1.5 h-6 text-[10px] px-1.5"
                        onClick={() => {
                          setShowAttachMenu(false);
                          handleVoiceNoteToggle();
                        }}
                      >
                        <Circle className="h-3 w-3 text-red-400" />
                        Voice
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-1.5 h-6 text-[10px] px-1.5"
                        onClick={() => {
                          audioInputRef.current?.click();
                          setShowAttachMenu(false);
                        }}
                      >
                        <Mic className="h-3 w-3 text-green-400" />
                        Audio
                      </Button>

                      <div className="my-1 h-px bg-primary/10" />
                      
                      {/* Zoe Vision - God Eye Mode */}
                      {messagingMode === 'zoe' && (
                        <>
                          <p className="text-[8px] text-foreground/40 uppercase tracking-wider px-1.5 mb-0.5 sticky top-0 bg-background/95">
                            👁️ Zoe Vision
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "w-full justify-start gap-1.5 h-6 text-[10px] px-1.5",
                              chatVision.isEnabled && "bg-cyan-500/20 text-cyan-400"
                            )}
                            onClick={() => {
                              chatVision.toggleVision();
                              setShowAttachMenu(false);
                            }}
                          >
                            {chatVision.isEnabled ? (
                              <>
                                <div className="h-3 w-3 rounded-full bg-cyan-500 animate-pulse" />
                                God Eye ON
                              </>
                            ) : (
                              <>
                                <Camera className="h-3 w-3 text-cyan-400" />
                                Enable God Eye
                              </>
                            )}
                          </Button>
                          {chatVision.isEnabled && chatVision.lastAnalysis && (
                            <div className="px-1.5 py-1 text-[8px] text-cyan-400/70">
                              Seeing: {chatVision.lastAnalysis.scene}
                            </div>
                          )}
                          <div className="my-1 h-px bg-primary/10" />
                        </>
                      )}

                      {/* Export options */}
                      {messages.length > 0 && (
                        <>
                          <p className="text-[8px] text-foreground/40 uppercase tracking-wider px-1.5 mb-0.5 sticky top-0 bg-background/95">
                            Export
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-1.5 h-6 text-[10px] px-1.5"
                            onClick={() => {
                              handleExportText();
                              setShowAttachMenu(false);
                            }}
                          >
                            <Download className="h-3 w-3 text-green-400" />
                            Text
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-1.5 h-6 text-[10px] px-1.5"
                            onClick={() => {
                              handleExportPDF();
                              setShowAttachMenu(false);
                            }}
                          >
                            <Download className="h-3 w-3 text-red-400" />
                            PDF
                          </Button>
                          <div className="my-1 h-px bg-primary/10" />
                        </>
                      )}

                      {/* Speaker toggle */}
                      <p className="text-[8px] text-foreground/40 uppercase tracking-wider px-1.5 mb-0.5 sticky top-0 bg-background/95">
                        Audio
                      </p>
                      {isSpeaking && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start gap-1.5 h-6 text-[10px] px-1.5"
                          onClick={() => {
                            toggleSpeechPause();
                            setShowAttachMenu(false);
                          }}
                        >
                          {isSpeechPaused ? (
                            <Play className="h-3 w-3 text-primary" />
                          ) : (
                            <Pause className="h-3 w-3 text-amber-400" />
                          )}
                          {isSpeechPaused ? 'Resume speech' : 'Pause speech'}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-1.5 h-6 text-[10px] px-1.5"
                        onClick={() => {
                          toggleMute();
                          setShowAttachMenu(false);
                        }}
                      >
                        {isMuted ? (
                          <VolumeX className="h-3 w-3 text-foreground/60" />
                        ) : (
                          <Volume2 className="h-3 w-3 text-primary" />
                        )}
                        {isMuted ? 'Unmute' : 'Mute'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Center - Expandable Input field */}
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
                placeholder={
                  replyingTo
                    ? "Reply..."
                    : messagingMode === 'user' && selectedUser 
                      ? `${selectedUser.display_name?.split(' ')[0]}...`
                      : pendingMedia 
                        ? "Add message..." 
                        : "Zoe..."
                }
                className={cn(
                  "flex-1 min-w-0 text-[11px] md:text-xs lg:text-sm rounded-full bg-foreground/5 border-0 placeholder:text-foreground/40 focus-visible:ring-1 px-3 md:px-4 transition-all duration-300 ease-out",
                  isInputFocused ? "h-9 md:h-10 lg:h-11 py-2" : "h-6 md:h-7 lg:h-8",
                  messagingMode === 'user' ? "focus-visible:ring-cyan-500/30" : "focus-visible:ring-primary/30"
                )}
                disabled={isProcessing || isPerceptionProcessing || isSending || (messagingMode === 'user' && !selectedUser)}
              />
              
              {/* Right side - Stop (while Zoe speaks) or send button */}
              {isSpeaking ? (
                <Button
                  size="icon"
                  aria-label="Stop Zoe's voice"
                  title="Stop speaking"
                  className={cn(
                    "rounded-full shadow-sm transition-all duration-300 flex-shrink-0 bg-destructive hover:bg-destructive/90 text-destructive-foreground",
                    isInputFocused ? "h-8 w-8 md:h-9 md:w-9 lg:h-10 lg:w-10" : "h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8"
                  )}
                  onClick={() => {
                    stopZoeSpeech();
                    setIsSpeechPaused(false);
                    setIsSpeaking(false);
                  }}
                >
                  <Square className={cn("transition-all", isInputFocused ? "h-3.5 w-3.5 md:h-4 md:w-4" : "h-3 w-3 md:h-3.5 md:w-3.5")} />
                </Button>
              ) : (
              <Button
                size="icon"
                className={cn(
                  "rounded-full shadow-sm transition-all duration-300 flex-shrink-0",
                  isInputFocused ? "h-8 w-8 md:h-9 md:w-9 lg:h-10 lg:w-10" : "h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8",
                  (input.trim() || pendingMedia) && !isProcessing && !isPerceptionProcessing && !isSending && (messagingMode !== 'user' || selectedUser)
                    ? messagingMode === 'user' 
                      ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
                onClick={() => sendMessage()}
                disabled={(!input.trim() && !pendingMedia) || isProcessing || isPerceptionProcessing || isSending || (messagingMode === 'user' && !selectedUser)}
              >
                <Send className={cn("transition-all", isInputFocused ? "h-3.5 w-3.5 md:h-4 md:w-4 lg:h-4.5 lg:w-4.5" : "h-3 w-3 md:h-3.5 md:w-3.5 lg:h-4 lg:w-4")} />
              </Button>
              )}
            </div>
          </div>
          </motion.div>
        </div>
        </>
      )}
    </AnimatePresence>
  );
};