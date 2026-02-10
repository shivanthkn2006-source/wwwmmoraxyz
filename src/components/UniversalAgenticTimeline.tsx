import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, Play, Pause, Volume2, Plus, Edit, Trash2, Share2, Image as ImageIcon, GraduationCap, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';

// Lazy load Three.js components to prevent initial bundle issues
const SolarSystemExplorer = lazy(() => import('@/components/SolarSystemExplorer').then(module => ({ default: module.SolarSystemExplorer })));
const ZoeDreamsAI = lazy(() => import('@/components/ZoeDreamsAI').then(module => ({ default: module.ZoeDreamsAI })));
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { thresholds, thresholdVoiceCommands, type Threshold } from '@/data/universalTimelineData';
import { useZoeAgent } from '@/hooks/useZoeAgent';
import { useUniversalTimelineVoice } from '@/hooks/useUniversalTimelineVoice';
import { useTimelineProgress, type ExpertiseLevel } from '@/hooks/useTimelineProgress';
import { useTimelineNotifications } from '@/hooks/useTimelineNotifications';
import { useTimelineContent } from '@/hooks/useTimelineContent';
import { useTimelineArchitect } from '@/hooks/useTimelineArchitect';
import { TimelineTutorialOverlay } from '@/components/TimelineTutorialOverlay';
import { TimelineContentDisplay } from '@/components/TimelineContentDisplay';
import { TimelineShareModal } from '@/components/TimelineShareModal';
import { TimelineSearchBar } from '@/components/TimelineSearchBar';
import { speakAsZoe } from '@/utils/zoeVoice';
import { toast } from 'sonner';
import { TimelineThresholdNode } from '@/components/TimelineThresholdNode';
import { UserPersonalTimeline } from '@/components/UserPersonalTimeline';
import { cn } from '@/lib/utils';

/**
 * UNIVERSAL AGENTIC TIMELINE V2.00
 * 
 * Enhanced immersive cosmic timeline from Big Bang to Post-Human Future
 * Big History Project-inspired design with era-based color coding
 * Voice-navigable via Zoe AI Architect
 * Zoe serves as timeline guardian and architect
 * Space exploration movie aesthetic with research-grade data
 */

export const UniversalAgenticTimeline: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const [selectedThreshold, setSelectedThreshold] = useState<Threshold | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [userProposal, setUserProposal] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showContentManager, setShowContentManager] = useState(false);
  const [newContentText, setNewContentText] = useState('');
  const [newContentImage, setNewContentImage] = useState<File | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [architectMode, setArchitectMode] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(0.5);
  const [isInstructionsMinimized, setIsInstructionsMinimized] = useState(false);
  const [showPersonalTimeline, setShowPersonalTimeline] = useState(false);
  const [showHeliosphere, setShowHeliosphere] = useState(false);
  const [showDreams, setShowDreams] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { executeCommand } = useZoeAgent();
  const { progress, isLoading: progressLoading, markThresholdExplored, updateExpertiseLevel } = useTimelineProgress();
  const { trackActivity } = useTimelineNotifications();
  const { content, addContent, deleteContent, shareContent } = useTimelineContent(selectedThreshold?.id);
  const { processArchitectCommand, generateTimelineInsights } = useTimelineArchitect();

  // Enable voice command handling
  useUniversalTimelineVoice();

  // Auto-scroll animation with speed control - MOBILE OPTIMIZED
  useEffect(() => {
    if (!isPlaying || selectedThreshold) return;
    
    // MOBILE OPTIMIZATION: Use 100ms interval instead of 50ms to reduce CPU usage
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const intervalMs = isMobile ? 100 : 50;
    
    let intervalId: NodeJS.Timeout | null = null;
    intervalId = setInterval(() => {
      setScrollPosition(prev => (prev + (0.02 * speedMultiplier * (isMobile ? 2 : 1))) % 100);
    }, intervalMs);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaying, selectedThreshold, speedMultiplier]);

  // Sync scroll position
  useEffect(() => {
    if (scrollRef.current && !selectedThreshold) {
      scrollRef.current.scrollLeft = (scrollPosition / 100) * (scrollRef.current.scrollWidth - scrollRef.current.clientWidth);
    }
  }, [scrollPosition, selectedThreshold]);

  // Voice command listener - Enhanced with all timeline controls including stop/pause
  useEffect(() => {
    const handleTimelineNavigate = (event: CustomEvent) => {
      const { thresholdId, keyword } = event.detail;
      const threshold = thresholds.find(t => t.id === thresholdId);
      if (threshold) {
        handleThresholdClick(threshold);
        speakAsZoe(`Navigating to ${threshold.name}. ${threshold.shortDescription}`);
      }
    };

    const handleTimelinePlayPause = (event: CustomEvent) => {
      const { action } = event.detail;
      if (action === 'play') {
        setIsPlaying(true);
        speakAsZoe("Timeline playback started");
      } else if (action === 'pause' || action === 'stop') {
        setIsPlaying(false);
        speakAsZoe("Timeline playback stopped");
      }
    };

    const handleTimelineNarrate = (event: CustomEvent) => {
      const { thresholdId } = event.detail;
      const threshold = thresholds.find(t => t.id === thresholdId);
      if (threshold) {
        handleThresholdClick(threshold);
        speakAsZoe(threshold.narratives.experiential);
      }
    };

    const handleTimelineSearch = (event: CustomEvent) => {
      const { query } = event.detail;
      // Trigger search by finding matching threshold
      const lowerQuery = query.toLowerCase();
      const matchingThreshold = thresholds.find(t => 
        t.name.toLowerCase().includes(lowerQuery) ||
        t.shortDescription.toLowerCase().includes(lowerQuery) ||
        t.narratives.scientific.toLowerCase().includes(lowerQuery) ||
        t.narratives.experiential.toLowerCase().includes(lowerQuery)
      );
      
      if (matchingThreshold) {
        handleThresholdClick(matchingThreshold);
        speakAsZoe(`Found: ${matchingThreshold.name}. ${matchingThreshold.shortDescription}`);
      } else {
        speakAsZoe(`No results found for ${query}`);
      }
    };

    const handleTimelinePlay = () => {
      setIsPlaying(true);
      speakAsZoe('Timeline playing');
    };

    const handleTimelinePause = () => {
      setIsPlaying(false);
      speakAsZoe('Timeline paused');
    };

    const handleTimelineSpeedUp = () => {
      setSpeedMultiplier(prev => Math.min(prev + 0.5, 3));
      speakAsZoe(`Speed increased to ${Math.min(speedMultiplier + 0.5, 3)} times`);
    };

    const handleTimelineSpeedDown = () => {
      setSpeedMultiplier(prev => Math.max(prev - 0.5, 0.5));
      speakAsZoe(`Speed decreased to ${Math.max(speedMultiplier - 0.5, 0.5)} times`);
    };

    const handleArchitectMode = (event: CustomEvent) => {
      const { enabled } = event.detail;
      setArchitectMode(enabled);
    };

    const handleZoomIn = () => {
      setZoomLevel(prev => Math.min(prev + 0.2, 3));
      speakAsZoe(`Zoom level: ${Math.round(Math.min(zoomLevel + 0.2, 3) * 100)} percent`);
    };

    const handleZoomOut = () => {
      setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
      speakAsZoe(`Zoom level: ${Math.round(Math.max(zoomLevel - 0.2, 0.5) * 100)} percent`);
    };

    const handleShowPersonal = () => {
      setShowPersonalTimeline(true);
      speakAsZoe('Opening your personal cosmic timeline with Zoe AI predictions');
    };

    const handleOpenHeliosphere = () => {
      setShowHeliosphere(true);
      speakAsZoe('Opening 4K Heliosphere Explorer. Explore our solar system in stunning detail.');
    };

    const handleOpenDreams = () => {
      setShowDreams(true);
      speakAsZoe('Opening Zoe Dreams AI. Let me help you understand your dreams and inner patterns.');
    };

    // Add all event listeners
    window.addEventListener('timeline-navigate' as any, handleTimelineNavigate as EventListener);
    window.addEventListener('timeline-narrate' as any, handleTimelineNarrate as EventListener);
    window.addEventListener('timeline-search' as any, handleTimelineSearch as EventListener);
    window.addEventListener('timeline-play' as any, handleTimelinePlay as EventListener);
    window.addEventListener('timeline-pause' as any, handleTimelinePause as EventListener);
    window.addEventListener('timeline-speed-up' as any, handleTimelineSpeedUp as EventListener);
    window.addEventListener('timeline-speed-down' as any, handleTimelineSpeedDown as EventListener);
    window.addEventListener('timeline-architect-mode' as any, handleArchitectMode as EventListener);
    window.addEventListener('timeline-zoom-in' as any, handleZoomIn as EventListener);
    window.addEventListener('timeline-zoom-out' as any, handleZoomOut as EventListener);
    window.addEventListener('timeline-show-personal' as any, handleShowPersonal as EventListener);
    window.addEventListener('timeline-open-heliosphere' as any, handleOpenHeliosphere as EventListener);
    window.addEventListener('timeline-open-dreams' as any, handleOpenDreams as EventListener);
    
    return () => {
      window.removeEventListener('timeline-navigate' as any, handleTimelineNavigate as EventListener);
      window.removeEventListener('timeline-narrate' as any, handleTimelineNarrate as EventListener);
      window.removeEventListener('timeline-search' as any, handleTimelineSearch as EventListener);
      window.removeEventListener('timeline-play' as any, handleTimelinePlay as EventListener);
      window.removeEventListener('timeline-pause' as any, handleTimelinePause as EventListener);
      window.removeEventListener('timeline-speed-up' as any, handleTimelineSpeedUp as EventListener);
      window.removeEventListener('timeline-speed-down' as any, handleTimelineSpeedDown as EventListener);
      window.removeEventListener('timeline-architect-mode' as any, handleArchitectMode as EventListener);
      window.removeEventListener('timeline-zoom-in' as any, handleZoomIn as EventListener);
      window.removeEventListener('timeline-zoom-out' as any, handleZoomOut as EventListener);
      window.removeEventListener('timeline-show-personal' as any, handleShowPersonal as EventListener);
      window.removeEventListener('timeline-open-heliosphere' as any, handleOpenHeliosphere as EventListener);
      window.removeEventListener('timeline-open-dreams' as any, handleOpenDreams as EventListener);
    };
  }, [speedMultiplier, zoomLevel]);

  const handleThresholdClick = useCallback((threshold: Threshold) => {
    setSelectedThreshold(threshold);
    setIsPlaying(false);
    
    // Track exploration
    markThresholdExplored(threshold.id);
    trackActivity('threshold_explored', {
      thresholdId: threshold.id,
      description: `Explored: ${threshold.name}`,
      voiceMessage: `You explored ${threshold.name}, ${threshold.shortDescription}`,
    });
    
    // Scroll to threshold
    if (scrollRef.current) {
      const thresholdIndex = thresholds.findIndex(t => t.id === threshold.id);
      const targetScroll = (thresholdIndex / (thresholds.length - 1)) * (scrollRef.current.scrollWidth - scrollRef.current.clientWidth);
      scrollRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  }, [markThresholdExplored, trackActivity]);

  const handleAnalyzeProposal = async () => {
    if (!userProposal.trim()) {
      toast.error('Please enter your future proposal first');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const prompt = `Analyze this future prediction proposal in exactly 50 words. Provide feasibility assessment and critical insights: "${userProposal}"`;
      
      // Use Zoe AI to analyze (triggers voice response)
      await executeCommand(prompt);
      
      // Provide analysis based on proposal complexity
      const wordCount = userProposal.trim().split(/\s+/).length;
      const hasSpecificDates = /\d{4}/.test(userProposal);
      const hasTechnology = /(AI|quantum|fusion|neural|robot|space)/i.test(userProposal);
      
      let feasibilityScore = 50;
      if (hasSpecificDates) feasibilityScore += 15;
      if (hasTechnology) feasibilityScore += 20;
      if (wordCount > 50) feasibilityScore += 15;
      
      setAiAnalysis(`Feasibility Score: ${Math.min(feasibilityScore, 95)}%. Your proposal demonstrates ${hasSpecificDates ? 'concrete temporal planning' : 'visionary thinking'}. ${hasTechnology ? 'Technological specificity enhances credibility.' : 'Consider adding specific technological implementations.'} ${wordCount > 50 ? 'Comprehensive detail supports feasibility analysis.' : 'Additional detail would strengthen the prediction.'} Alignment with current trends: ${feasibilityScore > 70 ? 'High' : 'Moderate'}. Zoe has provided detailed voice feedback.`);
      
      // Track activity
      trackActivity('future_proposal_analyzed', {
        thresholdId: 10,
        description: `Future proposal analyzed: ${userProposal.substring(0, 50)}...`,
        voiceMessage: `Your future proposal has been analyzed with a feasibility score of ${Math.min(feasibilityScore, 95)} percent.`,
      });
      
      toast.success('AI Analysis Complete');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Analysis failed. Please try again.');
      setAiAnalysis('Analysis unavailable. Please refine your proposal and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddContent = async () => {
    if (!selectedThreshold || (!newContentText && !newContentImage)) {
      toast.error('Please add text or image content');
      return;
    }

    const result = await addContent({
      thresholdId: selectedThreshold.id,
      contentType: newContentImage ? 'image' : 'text',
      data: { text: newContentText },
      imageFile: newContentImage || undefined,
      expertiseLevel: progress?.expertisePreference || 'intermediate',
      isPublic: false,
    });

    if (result) {
      trackActivity('content_added', {
        thresholdId: selectedThreshold.id,
        contentId: result.id,
        description: `Added content to ${selectedThreshold.name}`,
      });
      setNewContentText('');
      setNewContentImage(null);
      setShowContentManager(false);
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    const success = await deleteContent(contentId);
    if (success) {
      trackActivity('content_removed', {
        contentId,
        description: 'Content removed from timeline',
      });
    }
  };

  const handleShareContent = async (shareType: 'global' | 'friends' | 'private_timeline' | 'huddle') => {
    if (!selectedContentId) return;
    
    const success = await shareContent(selectedContentId, shareType);
    if (success) {
      trackActivity('content_shared', {
        contentId: selectedContentId,
        description: `Content shared to ${shareType}`,
      });
      setShareModalOpen(false);
      setSelectedContentId(null);
    }
  };

  const handleSpeakNarrative = (text: string) => {
    speakAsZoe(text);
  };

  // Calculate logarithmic position for thresholds
  const getThresholdPosition = (yearsBefore: number) => {
    const maxYears = 13800000000; // Big Bang
    const logMax = Math.log10(maxYears + 1);
    const logCurrent = Math.log10(Math.abs(yearsBefore) + 1);
    return (logCurrent / logMax) * 100;
  };

  return (
    <>
      {/* First-time tutorial */}
      {!progressLoading && progress && !progress.tutorialCompleted && (
        <TimelineTutorialOverlay onComplete={() => {}} />
      )}

      {/* Main Timeline */}
      <div className="relative w-full h-screen overflow-hidden bg-gradient-to-b from-[hsl(265,85%,8%)] via-[hsl(260,80%,10%)] to-background">
      {/* Cosmic Starfield Background - Altered Carbon aesthetic */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(2px 2px at 20% 30%, white, transparent),
                           radial-gradient(2px 2px at 60% 70%, white, transparent),
                           radial-gradient(1px 1px at 50% 50%, white, transparent),
                           radial-gradient(1px 1px at 80% 10%, white, transparent),
                           radial-gradient(2px 2px at 90% 60%, white, transparent),
                           radial-gradient(1px 1px at 33% 80%, white, transparent)`,
          backgroundSize: '200px 200px, 250px 250px, 180px 180px, 220px 220px, 300px 300px, 150px 150px',
          animation: 'twinkle 3s ease-in-out infinite, cosmic-drift 60s linear infinite'
        }} />
        {/* Nebula overlay effect - Altered Carbon style */}
        <div className="absolute inset-0 opacity-10"
          style={{
            background: 'radial-gradient(ellipse at 30% 40%, hsl(320, 100%, 40%), transparent 50%), radial-gradient(ellipse at 70% 60%, hsl(265, 85%, 50%), transparent 60%)'
          }}
        />
      </div>

      {/* Navigation buttons - Top Left Corner - Hidden when modals open */}
      {!showHeliosphere && !showDreams && (
        <div className="absolute top-2 left-2 z-50 flex gap-1.5 pointer-events-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/webdrop')}
            className="h-8 w-8 bg-black/60 backdrop-blur-xl border-cyan-500/30 hover:bg-cyan-500/20 rounded-lg"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => window.dispatchEvent(new CustomEvent('timeline-open-heliosphere'))}
            className="h-8 w-8 bg-black/60 backdrop-blur-xl border-cyan-500/30 hover:bg-cyan-500/20 rounded-lg"
            title="Solar System"
          >
            <span className="text-sm">🪐</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => window.dispatchEvent(new CustomEvent('timeline-open-dreams'))}
            className="h-8 w-8 bg-black/60 backdrop-blur-xl border-cyan-500/30 hover:bg-cyan-500/20 rounded-lg"
            title="Zoe Dreams"
          >
            <span className="text-sm">🌙</span>
          </Button>
        </div>
      )}

      {/* Header with Holographic Effect - Mobile Compact */}
      <div className="absolute top-0 left-0 right-0 z-30 pt-12 xs:pt-14 pb-2 px-2 bg-gradient-to-b from-black/95 via-black/80 to-transparent backdrop-blur-sm pointer-events-none">
        <div className="flex flex-col items-center gap-1.5 max-w-7xl mx-auto">
          {/* Title - Compact */}
          <div className="text-center">
            <h1 className="text-base xs:text-lg sm:text-2xl font-bold flex items-center justify-center gap-1.5 text-cyan-300">
              <Sparkles className="w-4 h-4 xs:w-5 xs:h-5 text-cyan-400 animate-pulse" />
              <span className="hidden xs:inline">Universal Agentic</span> Timeline <span className="text-xs opacity-70">V2.00</span>
            </h1>
            <p className="text-[10px] xs:text-xs text-cyan-300/60 hidden xs:block">
              13.8 Billion Years • Big History Project
            </p>
          </div>
          
          {/* Control Panel - Compact Grid */}
          <div className="flex items-center gap-1 xs:gap-1.5 flex-wrap justify-center pointer-events-auto max-w-full overflow-x-auto pb-1">
            {/* Search Bar */}
            <div className="z-50">
              <TimelineSearchBar onThresholdSelect={handleThresholdClick} />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPersonalTimeline(!showPersonalTimeline)}
              className="h-7 px-2 text-[10px] xs:text-xs rounded-lg bg-black/60 border-cyan-500/30 hover:bg-cyan-500/20"
            >
              <Sparkles className="w-3 h-3 xs:mr-1" />
              <span className="hidden xs:inline">{showPersonalTimeline ? 'Universal' : 'Personal'}</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setArchitectMode(!architectMode)}
              className="h-7 px-2 text-[10px] xs:text-xs rounded-lg bg-black/60 border-cyan-500/30 hover:bg-cyan-500/20"
            >
              <GraduationCap className="w-3 h-3 xs:mr-1" />
              <span className="hidden xs:inline">{architectMode ? 'View' : 'Architect'}</span>
            </Button>
            
            {/* Speed Slider - Compact */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 border border-cyan-500/30">
              <span className="text-[9px] xs:text-[10px] text-cyan-300/80 hidden xs:block">Speed</span>
              <Slider
                value={[speedMultiplier]}
                onValueChange={(value) => setSpeedMultiplier(value[0])}
                min={0.05}
                max={2}
                step={0.05}
                className="w-14 xs:w-16"
              />
              <span className="text-[9px] xs:text-[10px] font-bold text-cyan-400 w-8 text-right">{speedMultiplier.toFixed(2)}×</span>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsPlaying(!isPlaying)}
              className="h-7 w-7 rounded-lg bg-black/60 border-cyan-500/30 hover:bg-cyan-500/20"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Zoom Controls - Compact Right Side */}
      <div className="absolute top-2 right-2 z-40 flex items-center gap-1 pointer-events-auto bg-black/60 backdrop-blur-sm rounded-lg p-1 border border-cyan-500/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 3))}
          className="h-7 w-7 rounded hover:bg-cyan-500/20"
        >
          <span className="text-sm font-bold text-cyan-400">+</span>
        </Button>
        <span className="text-[10px] font-bold text-cyan-400 w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.5))}
          className="h-7 w-7 rounded hover:bg-cyan-500/20"
        >
          <span className="text-sm font-bold text-cyan-400">−</span>
        </Button>
      </div>

      {/* Cosmic Timeline Ribbon */}
      <div 
        ref={scrollRef}
        className="absolute top-1/2 left-0 right-0 -translate-y-1/2 overflow-x-auto overflow-y-hidden custom-scrollbar"
        style={{ 
          height: `${400 * zoomLevel}px`,
          transform: `translateY(-50%) scale(${zoomLevel})`,
          transformOrigin: 'center center'
        }}
      >
        <div className="relative h-full" style={{ width: `${5000 * zoomLevel}px` }}>
          {/* Enhanced Energy Stream with Era Colors & Holographic Effect */}
          <div className="absolute top-1/2 left-0 right-0 h-4 -translate-y-1/2 opacity-70 hologram-effect">
            {/* Early Universe: Crimson → Orange → Gold */}
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(0,85%,35%)] via-[hsl(20,95%,55%)] to-[hsl(40,90%,50%)] hologram-border" style={{ width: '60%' }} />
            {/* Planetary & Life Era: Blue-cyan → Emerald */}
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(195,70%,45%)] via-[hsl(150,90%,45%)] to-[hsl(180,65%,50%)] hologram-border" style={{ left: '60%', width: '20%' }} />
            {/* Human & Modern Era: Teal → Gold → Steel Blue → Violet */}
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(45,80%,55%)] via-[hsl(210,70%,50%)] to-[hsl(265,85%,60%)] hologram-border" style={{ left: '80%', width: '15%' }} />
            {/* Future: Electric violet → Transcendent magenta */}
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(265,85%,60%)] to-[hsl(320,100%,70%)] hologram-border" style={{ left: '95%', width: '5%' }} />
          </div>
          
          {/* Era Labels with Holographic Text */}
          {architectMode && (
            <>
              <div className="absolute top-8 left-[10%] text-xs font-bold hologram-text text-cyan-300 whitespace-nowrap">EARLY UNIVERSE (13.8-4.5 Ga)</div>
              <div className="absolute top-8 left-[65%] text-xs font-bold hologram-text text-emerald-300 whitespace-nowrap">LIFE ERA (4.5 Ga-Present)</div>
              <div className="absolute top-8 left-[88%] text-xs font-bold hologram-text text-purple-300 whitespace-nowrap">DIGITAL AGE & FUTURE</div>
            </>
          )}
          
          {/* Threshold Nodes */}
          {thresholds.map((threshold, index) => {
            const position = getThresholdPosition(threshold.yearsBefore);
            
            return (
              <motion.div
                key={threshold.id}
                className="absolute top-1/2 -translate-y-1/2"
                style={{ left: `${position}%` }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                {/* Glow Effect */}
                <div 
                  className="absolute inset-0 rounded-full blur-xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ 
                    width: '120px', 
                    height: '120px',
                    left: '-40px',
                    top: '-40px',
                    backgroundColor: `hsl(${threshold.glowColor})`
                  }}
                />
                
                {/* Optimized Threshold Node Component */}
                <TimelineThresholdNode
                  threshold={threshold}
                  onClick={() => handleThresholdClick(threshold)}
                  zoomLevel={zoomLevel}
                />

                {/* Enhanced Holographic Label with Year */}
                <div className="absolute top-24 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="hologram-border bg-black/90 backdrop-blur-sm px-4 py-3 rounded-lg shadow-xl hologram-effect">
                    <p className="text-base font-bold hologram-text">{threshold.name}</p>
                    <p className="text-xs text-cyan-300/70 mt-1 hologram-text">{threshold.displayTime}</p>
                    {architectMode && (
                      <p className="text-xs text-cyan-400 mt-1 hologram-glow">Threshold {threshold.id}/10</p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Detail Modal with Holographic Effect */}
      <AnimatePresence>
        {selectedThreshold && (
          <motion.div
            className="absolute inset-0 z-60 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md hologram-effect"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedThreshold(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl"
            >
              <Card className="p-6 hologram-border bg-black/90 backdrop-blur-sm max-h-[80vh] overflow-y-auto custom-scrollbar hologram-effect"
                style={{ borderColor: `hsl(${selectedThreshold.color})` }}
              >
                {/* Header with Holographic Effect */}
              <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4 flex-1">
                    <div 
                      className="w-20 h-20 rounded-full flex items-center justify-center text-4xl threshold-node-hologram shadow-lg"
                      style={{ backgroundColor: `hsl(${selectedThreshold.color})` }}
                    >
                      {selectedThreshold.icon}
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold hologram-text">{selectedThreshold.name}</h2>
                      <p className="text-lg text-cyan-300/70 hologram-text">{selectedThreshold.displayTime}</p>
                      <p className="text-sm mt-2 hologram-text">{selectedThreshold.shortDescription}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowContentManager(!showContentManager)}
                      className="hologram-border bg-black/50 hover:bg-cyan-500/20"
                    >
                      <Plus className="w-4 h-4 mr-1 hologram-glow" />
                      <span className="hologram-text">Add Content</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedThreshold(null)}
                      className="hologram-border bg-black/50 hover:bg-cyan-500/20"
                    >
                      <X className="w-5 h-5 hologram-glow" />
                    </Button>
                  </div>
                </div>

                {/* Content Manager */}
                {showContentManager && (
                  <Card className="p-4 mb-4 bg-accent/30">
                    <h4 className="font-semibold mb-2">Add Your Content</h4>
                    <Textarea
                      placeholder="Add your notes, observations, or insights..."
                      value={newContentText}
                      onChange={(e) => setNewContentText(e.target.value)}
                      className="mb-2"
                    />
                    <div className="flex gap-2">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => setNewContentImage(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <ImageIcon className="w-4 h-4 mr-1" />
                        Image
                      </Button>
                      <Button size="sm" onClick={handleAddContent}>
                        Save
                      </Button>
                    </div>
                  </Card>
                )}

                {/* User Content Display */}
                {content && content.length > 0 && (
                  <div className="mb-4">
                    <TimelineContentDisplay
                      content={content}
                      onEdit={(contentId) => {
                        // Handle edit
                        const item = content.find(c => c.id === contentId);
                        if (item) {
                          setNewContentText(item.content_data.text || '');
                          setShowContentManager(true);
                        }
                      }}
                      onDelete={handleDeleteContent}
                      onShare={(contentId) => {
                        setSelectedContentId(contentId);
                        setShareModalOpen(true);
                      }}
                    />
                  </div>
                )}

                {/* Narratives Tabs */}
                <Tabs defaultValue="experiential" className="mt-6">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="scientific">Scientific Facts</TabsTrigger>
                    <TabsTrigger value="experiential">The Movie</TabsTrigger>
                    <TabsTrigger value="future">Future Impact</TabsTrigger>
                  </TabsList>

                  <TabsContent value="scientific" className="space-y-4 mt-4">
                    <div className="p-4 rounded-lg bg-accent/50 border border-border">
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-sm leading-relaxed">{selectedThreshold.narratives.scientific}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSpeakNarrative(selectedThreshold.narratives.scientific)}
                        >
                          <Volume2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="experiential" className="space-y-4 mt-4">
                    <div className="p-4 rounded-lg bg-accent/50 border border-border">
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-sm leading-relaxed italic">{selectedThreshold.narratives.experiential}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSpeakNarrative(selectedThreshold.narratives.experiential)}
                        >
                          <Volume2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="future" className="space-y-4 mt-4">
                    <div className="p-4 rounded-lg bg-accent/50 border border-border">
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-sm leading-relaxed">{selectedThreshold.narratives.futureImpact}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSpeakNarrative(selectedThreshold.narratives.futureImpact)}
                        >
                          <Volume2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Future Prediction Simulator (Threshold 10 only) */}
                {selectedThreshold.id === 10 && (
                  <div className="mt-6 p-6 rounded-lg bg-gradient-to-br from-[hsl(270,100%,15%)] to-[hsl(270,100%,8%)] border-2 border-[hsl(270,100%,70%)]">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Zoe AI Architect: Future Proposal Analyzer
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      As your timeline architect, I analyze future proposals using advanced neural intelligence. Propose your vision and I'll provide scientific feasibility assessment, technological pathway analysis, and connection to cosmic evolution patterns.
                    </p>
                    
                    <Textarea
                      placeholder="Example: 'Humanity establishes the first self-sustaining Mars colony with 10,000 inhabitants by 2065, powered entirely by fusion reactors and supported by autonomous robotic systems...'"
                      value={userProposal}
                      onChange={(e) => setUserProposal(e.target.value)}
                      className="min-h-[120px] mb-4"
                    />

                    <Button
                      onClick={handleAnalyzeProposal}
                      disabled={isAnalyzing || !userProposal.trim()}
                      className="w-full"
                    >
                      {isAnalyzing ? 'Analyzing...' : 'Analyze Feasibility'}
                    </Button>

                    {aiAnalysis && (
                      <div className="mt-4 p-4 rounded-lg bg-background/50 border border-primary">
                        <p className="text-sm font-bold mb-2">Zoe's Analysis:</p>
                        <p className="text-sm leading-relaxed">{aiAnalysis}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      <div className="absolute bottom-6 left-0 right-0 z-30 pointer-events-none">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-cyan-300/90 bg-black/70 backdrop-blur-sm rounded-lg px-6 py-3 inline-block hologram-border hologram-text shadow-xl">
            Click nodes to explore • Say "Zoe, jump to [threshold name]" • Say "Zoe, tell me about [threshold]"
          </p>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 12px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: hsl(var(--background));
          border-radius: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--primary) / 0.5);
          border-radius: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--primary) / 0.7);
        }
      `}</style>

      {/* On-Screen Instructions - Enhanced for V2.00 - Minimizable */}
      {!selectedThreshold && (
        <>
          <motion.div
            initial={false}
            animate={{ 
              x: isInstructionsMinimized ? -480 : 0,
              opacity: isInstructionsMinimized ? 0 : 1
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute bottom-24 left-6 z-50 max-w-md pointer-events-auto"
          >
            <div className="bg-black/95 backdrop-blur-md border-2 border-cyan-500/50 rounded-lg p-3 shadow-2xl hologram-border hologram-effect">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="text-xs font-bold flex items-center gap-1.5 hologram-text text-cyan-300">
                  <Sparkles className="w-3 h-3 text-cyan-400 hologram-glow" />
                  Timeline V2.00 - AI Guardian
                </h4>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsInstructionsMinimized(true)}
                  className="h-6 w-6 rounded-full hover:bg-cyan-500/20 flex-shrink-0"
                >
                  <ChevronLeft className="w-4 h-4 hologram-glow" />
                </Button>
              </div>
              <ul className="text-[10px] space-y-0.5 text-cyan-300/70">
                <li>• <span className="text-cyan-200 font-medium hologram-text">Click nodes</span> explore 13.8B years</li>
                <li>• <span className="text-cyan-200 font-medium hologram-text">Zoom (+/−)</span> examine or overview</li>
                <li>• <span className="text-cyan-200 font-medium hologram-text">Scroll</span> navigate timeline</li>
                <li>• <span className="text-cyan-200 font-medium hologram-text">Architect Mode</span> AI create/edit</li>
                <li>• <span className="text-cyan-200 font-medium hologram-text">Voice</span>: "Jump to [era]", "Stop", "Play"</li>
                <li>• <span className="text-cyan-400 font-bold hologram-glow">AI Guardian</span> verifies all data</li>
              </ul>
            </div>
          </motion.div>

          {/* Minimized Instructions Button */}
          {isInstructionsMinimized && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => setIsInstructionsMinimized(false)}
              className="absolute bottom-24 left-0 z-50 p-3 rounded-r-lg bg-black/95 backdrop-blur-md border-2 border-l-0 border-cyan-500/50 shadow-2xl hover:bg-cyan-500/20 transition-colors pointer-events-auto hologram-border"
            >
              <ChevronRight className="w-5 h-5 text-cyan-400 hologram-glow" />
            </motion.button>
          )}
        </>
      )}

      {/* Architect Mode Panel */}
      {architectMode && !selectedThreshold && (
        <div className="absolute top-48 left-6 z-50 max-w-sm pointer-events-auto">
          <div className="bg-gradient-to-br from-purple-900/95 to-purple-950/95 backdrop-blur-md border-2 border-purple-400/70 rounded-lg p-4 shadow-2xl hologram-border hologram-effect">
            <h4 className="text-sm font-bold mb-2 flex items-center gap-2 hologram-text text-purple-300">
              <GraduationCap className="w-4 h-4 text-purple-400 hologram-glow" />
              AI Architect Mode Active
            </h4>
            <p className="text-xs text-purple-200/80 mb-3 hologram-text">
              As your timeline architect and guardian, I can now create, edit, and analyze timeline content with advanced neural intelligence. Select any threshold to begin.
            </p>
            <div className="text-xs space-y-1 text-purple-300/70">
              <li>✓ Generate new scientific insights</li>
              <li>✓ Validate historical accuracy</li>
              <li>✓ Connect past events to AI & space exploration</li>
              <li>✓ Create educational content for research</li>
            </div>
          </div>
        </div>
      )}

      {/* User Personal Timeline Modal */}
      <AnimatePresence>
        {showPersonalTimeline && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-background/95 backdrop-blur-xl overflow-y-auto"
          >
            <div className="min-h-screen p-6">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold flex items-center gap-3">
                    <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                    Your Cosmic Timeline
                  </h2>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowPersonalTimeline(false)}
                    className="rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <UserPersonalTimeline />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Share Modal */}
      <TimelineShareModal
        isOpen={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          setSelectedContentId(null);
        }}
        onShare={handleShareContent}
      />

      {/* Heliosphere Explorer Modal */}
      <AnimatePresence>
        {showHeliosphere && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black"
          >
            {/* Close Button - Top Left to avoid conflict with Solar controls on right */}
            <Button
              onClick={() => {
                setShowHeliosphere(false);
                speakAsZoe('Returning to Universal Timeline');
              }}
              className="absolute top-4 left-4 z-[110] bg-gradient-to-r from-cyan-900/90 to-purple-900/90 backdrop-blur-md border border-cyan-400/50 text-cyan-200 hover:from-cyan-800 hover:to-purple-800 rounded-lg shadow-lg shadow-cyan-500/30"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Timeline
            </Button>
            <Suspense fallback={
              <div className="flex items-center justify-center h-screen bg-black">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-cyan-400 hologram-text">Loading Heliosphere Explorer...</p>
                </div>
              </div>
            }>
              <SolarSystemExplorer />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zoe Dreams AI Modal */}
      <AnimatePresence>
        {showDreams && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black"
          >
            {/* Close Button - Top Left for consistency */}
            <Button
              onClick={() => {
                setShowDreams(false);
                speakAsZoe('Returning to Universal Timeline');
              }}
              className="absolute top-4 left-4 z-[110] bg-gradient-to-r from-cyan-900/90 to-purple-900/90 backdrop-blur-md border border-cyan-400/50 text-cyan-200 hover:from-cyan-800 hover:to-purple-800 rounded-lg shadow-lg shadow-cyan-500/30"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Timeline
            </Button>
            <Suspense fallback={
              <div className="flex items-center justify-center h-screen bg-black">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-cyan-400 hologram-text">Loading Zoe Dreams AI...</p>
                </div>
              </div>
            }>
              <ZoeDreamsAI />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
