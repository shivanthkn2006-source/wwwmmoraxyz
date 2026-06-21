import { useState, useCallback, lazy, Suspense, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import SmithOrb from '@/components/mmora/SmithOrb';
import GlassInput from '@/components/mmora/GlassInput';
import ResultCard from '@/components/mmora/ResultCard';
import SunriseBoot from '@/components/mmora/SunriseBoot';
import ONIFeed from '@/components/mmora/ONIFeed';
import { useGeminiTTS } from '@/hooks/useGeminiTTS';
import { useMmoraAgent, AgentFeature } from '@/hooks/useMmoraAgent';
import { useMmoraAudio } from '@/hooks/useMmoraAudio';
import { useContinuousDHFStream } from '@/hooks/useContinuousDHFStream';
import { useZoeDHFAuthorization } from '@/hooks/useZoeDHFAuthorization';
import { useAssistantName } from '@/hooks/useAssistantName';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useNeuroSymbolicGuard } from '@/hooks/useNeuroSymbolicGuard';

// Lazy load heavy components
const MapboxGlobe = lazy(() => import('@/components/mmora/MapboxGlobe'));
const TacticalMap = lazy(() => import('@/components/mmora/TacticalMap'));
const CosmicTimeline = lazy(() => import('@/components/mmora/CosmicTimeline'));
const AgentTicket = lazy(() => import('@/components/mmora/AgentTicket'));
const DemoMode = lazy(() => import('@/components/mmora/DemoMode'));

const FeatureLoader = () => (
  <div className="flex items-center justify-center py-8">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// Mood to orb color mapping
const moodColors: Record<string, string> = {
  analytical: '#00F0FF',  // Cyan
  curious: '#FFD700',     // Gold
  excited: '#FF0099',     // Magenta/Pink
  empathetic: '#8B5CF6',  // Violet
  warn: '#FF4444',        // Red
  melancholic: '#4B0082', // Indigo
  defiant: '#FF6600',     // Orange
  serene: '#00FFAA',      // Mint
};

function createSessionId() {
  try {
    const c: any = typeof crypto !== 'undefined' ? crypto : null;
    if (c?.randomUUID) return c.randomUUID();
  } catch {
    // ignore
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function Mmora() {
  const { user } = useAuth();
  const { assistantName, config: assistantConfig, extractMessage, detectAndSwitch } = useAssistantName();
  const [bootComplete, setBootComplete] = useState(() => {
    // Check if boot was shown this session
    return sessionStorage.getItem('mmoraBootShown') === 'true';
  });
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [currentMood, setCurrentMood] = useState('analytical');
  const [isLoading, setIsLoading] = useState(false);
  const [activeFeature, setActiveFeature] = useState<AgentFeature>('text');
  const [showONIFeed, setShowONIFeed] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedImagePrompt, setGeneratedImagePrompt] = useState<string | null>(null);
  const [mapSearchLocation, setMapSearchLocation] = useState<string | null>(null);
  const [demoModeActive, setDemoModeActive] = useState(false);
  const [useMapbox, setUseMapbox] = useState(true); // Use Mapbox premium globe
  const sessionIdRef = useRef<string>(createSessionId());
  
  const { isSpeaking, isListening, transcript, startListening, stopListening, speak } = useGeminiTTS();
  const { guard: guardResponse } = useNeuroSymbolicGuard('mmora');
  const { detectIntent, getMoodFromResponse } = useMmoraAgent();
  const { playHoverClick, playConfirm, playErrorGlitch } = useMmoraAudio();
  
  // DHF Core Integration
  const { 
    trackZoeInteraction, 
    trackECNState, 
    trackVoiceCommand,
    isStreaming: isDHFStreaming 
  } = useContinuousDHFStream();
  
  const { 
    isAuthorized: isDHFAuthorized, 
    requestAuthorization,
    performAutoFix 
  } = useZoeDHFAuthorization();

  // DHF authorization is now automatic - no popup needed

  const handleBootComplete = useCallback(() => {
    setBootComplete(true);
    sessionStorage.setItem('mmoraBootShown', 'true');
  }, []);

  // Toggle ONI Feed on orb area click
  const handleOrbAreaClick = useCallback(() => {
    if (!isCardOpen) {
      playHoverClick();
      setShowONIFeed(prev => !prev);
    }
  }, [isCardOpen, playHoverClick]);

  const handleShardClick = useCallback((shardId: string) => {
    toast.info(`${shardId.toUpperCase()} module accessed`, {
      description: 'Feature expansion coming soon, Envoy.'
    });
  }, []);

  // Save memory to Cortical Stack
  const saveMemory = useCallback(async (content: string, type: 'user' | 'zoe', emotionTag?: string) => {
    if (!user?.id) return;
    
    try {
      await supabase.from('mmora_memories').insert({
        user_id: user.id,
        content,
        type,
        emotion_tag: emotionTag,
        session_id: sessionIdRef.current
      });
    } catch (err) {
      console.error('Failed to save memory:', err);
    }
  }, [user?.id]);

  // Fetch recent memories for context
  const fetchRecentMemories = useCallback(async () => {
    if (!user?.id) return [];
    
    try {
      const { data, error } = await supabase
        .from('mmora_memories')
        .select('content, type, emotion_tag')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Failed to fetch memories:', err);
      return [];
    }
  }, [user?.id]);

  const handleSubmit = useCallback(async (text: string) => {
    const startTime = performance.now();
    setIsLoading(true);
    setIsCardOpen(true);
    setShowONIFeed(false);
    setResponseText('');
    setGeneratedImageUrl(null);
    setGeneratedImagePrompt(null);
    setMapSearchLocation(null);

    // Extract message (removes wake words like "Hey Zoe" or "Smith")
    const cleanMessage = extractMessage(text);

    // Detect and switch assistant based on wake word (Zoe or Smith)
    const activeAssistant = detectAndSwitch(text);
    // Active assistant: detected from wake word

    // Detect intent from input
    const intent = detectIntent(cleanMessage);
    setActiveFeature(intent.feature);

    // If map feature detected, extract and set location for map search
    if (intent.feature === 'map' && intent.extractedLocation) {
      setMapSearchLocation(intent.extractedLocation);
    } else if (intent.feature === 'map') {
      // Use the whole message as location search if no specific location extracted
      setMapSearchLocation(cleanMessage);
    }

    // Track user command in DHF stream (curiosity is valid ECN state)
    trackZoeInteraction('command', cleanMessage, undefined, 'curiosity');

    // Save user message to Cortical Stack
    await saveMemory(cleanMessage, 'user');

    try {
      // Fetch recent memories for RAG context
      const memories = await fetchRecentMemories();

      // Call the process-zoe-thought edge function with assistant name
      const { data, error } = await supabase.functions.invoke('process-zoe-thought', {
        body: { 
          message: cleanMessage,
          userId: user?.id,
          memories,
          assistantName: assistantConfig.title,
          context: {
            interface: 'mmora',
            timestamp: new Date().toISOString(),
            detectedFeature: intent.feature,
            dhfAuthorized: isDHFAuthorized,
            sessionId: sessionIdRef.current
          }
        }
      });

      if (error) {
        playErrorGlitch();
        // Try auto-fix if authorized
        if (isDHFAuthorized) {
          await performAutoFix('recognition-restart');
        }
        throw error;
      }

      const rawReply = data?.reply || "Spinning up local shards, Envoy...";
      const guardResult = guardResponse(rawReply, { skipTruthEngine: false });
      const reply = guardResult.safeResponse;
      const mood = data?.current_mood || getMoodFromResponse(reply);
      const latency = performance.now() - startTime;
      const imageUrl = data?.image_url || null;
      const imagePrompt = data?.image_prompt || null;

      setResponseText(reply);
      setCurrentMood(mood);
      setGeneratedImageUrl(imageUrl);
      setGeneratedImagePrompt(imagePrompt);
      speak(reply);
      playConfirm();

      // Track Zoe response in DHF stream with ECN state
      trackZoeInteraction('response', reply, latency, mood as any);
      
      // Track ECN emotional state change
      const valence = mood === 'warn' ? -0.5 : mood === 'excited' ? 0.8 : 0.3;
      const arousal = mood === 'excited' ? 0.9 : mood === 'serene' ? 0.2 : 0.5;
      trackECNState(
        mood === 'curious' ? 'curiosity' : mood === 'excited' ? 'excitement' : 'neutral',
        valence,
        arousal,
        intent.feature === 'text' ? 'seeking_information' : 'taking_action',
        `M'mora response: ${mood}`
      );

      // Save Zoe's response to Cortical Stack
      await saveMemory(reply, 'zoe', mood);

    } catch (err) {
      console.error('Mmora error:', err);
      // Handle errors gracefully without causing UI seizure
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const isTransientError = errorMessage.includes('Load failed') || 
                               errorMessage.includes('FunctionsFetchError') ||
                               errorMessage.includes('network');
      
      if (isTransientError) {
        // Silent retry for transient errors - close card and show toast
        toast.warning('Connection interrupted. Retrying...', { duration: 2000 });
        setIsCardOpen(false);
        setIsLoading(false);
        return; // Don't auto-retry to prevent loops
      }
      
      // For other errors, show a calm response
      const fallbackResponse = "I'm processing your request.";
      setResponseText(fallbackResponse);
      setCurrentMood('serene'); // Use calmer mood instead of 'warn'
      speak(fallbackResponse);
    } finally {
      setIsLoading(false);
    }
  }, [speak, detectIntent, getMoodFromResponse, user?.id, saveMemory, fetchRecentMemories, playConfirm, playErrorGlitch, trackZoeInteraction, trackECNState, isDHFAuthorized, performAutoFix, extractMessage, assistantConfig.title]);

  const handleMicToggle = useCallback(async () => {
    playHoverClick();
    if (isListening) {
      stopListening();
      // Track voice command end
      if (transcript) {
        trackVoiceCommand(transcript, { confidence: 0.85 }, 'curiosity');
      }
    } else {
      // Request mic permission first
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        startListening();
        trackZoeInteraction('wake_word', 'Voice input started', undefined, 'neutral');
        toast.success('🎤 Listening...', { duration: 2000 });
      } catch (err) {
        console.error('[Mmora] Mic permission denied:', err);
        toast.error('Microphone access required. Please allow in browser settings.');
      }
    }
  }, [isListening, startListening, stopListening, playHoverClick, transcript, trackVoiceCommand, trackZoeInteraction]);

  const handleCardClose = useCallback(() => {
    setIsCardOpen(false);
    setResponseText('');
    setActiveFeature('text');
  }, []);

  const handleAgentConfirm = useCallback(() => {
    playConfirm();
    toast.success('Protocol confirmed, Envoy. Agent dispatched.');
    handleCardClose();
  }, [handleCardClose, playConfirm]);

  const handleAgentCancel = useCallback(() => {
    toast.info('Protocol aborted.');
    handleCardClose();
  }, [handleCardClose]);

  // Render feature-specific content
  const renderFeatureContent = () => {
    switch (activeFeature) {
      case 'map':
        return (
          <Suspense fallback={<FeatureLoader />}>
            {useMapbox ? (
              <MapboxGlobe 
                searchLocation={mapSearchLocation || undefined}
                onLocationFound={() => {}}
              />
            ) : (
              <TacticalMap 
                searchLocation={mapSearchLocation || undefined}
                onLocationFound={() => {}}
              />
            )}
          </Suspense>
        );
      case 'timeline':
        return (
          <Suspense fallback={<FeatureLoader />}>
            <CosmicTimeline />
          </Suspense>
        );
      case 'cab':
        return (
          <Suspense fallback={<FeatureLoader />}>
            <AgentTicket 
              type="cab" 
              onConfirm={handleAgentConfirm}
              onCancel={handleAgentCancel}
            />
          </Suspense>
        );
      case 'food':
        return (
          <Suspense fallback={<FeatureLoader />}>
            <AgentTicket 
              type="food" 
              onConfirm={handleAgentConfirm}
              onCancel={handleAgentCancel}
            />
          </Suspense>
        );
      default:
        return null;
    }
  };

  // Get dynamic orb color based on mood
  const orbMoodColor = moodColors[currentMood] || moodColors.analytical;

  // Show boot sequence first
  if (!bootComplete) {
    return <SunriseBoot onComplete={handleBootComplete} assistantName={assistantConfig.title} />;
  }

  return (
    <>
      <Helmet>
        <title>M'mora 2120 | Zero-UI Interface</title>
        <meta name="description" content="M'mora 2120 - A Zero-UI interface powered by the Smith AI Orb" />
        <link 
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap" 
          rel="stylesheet" 
        />
      </Helmet>

      {/* Deep Black Canvas */}
      <div className="fixed inset-0 bg-black overflow-hidden">
        {/* Clickable Orb Area (for ONI Feed toggle) */}
        <div 
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={handleOrbAreaClick}
          style={{ pointerEvents: isCardOpen ? 'none' : 'auto' }}
        />

        {/* 3D Orb with mood-reactive colors */}
        <SmithOrb 
          isSpeaking={isSpeaking} 
          floatUp={isCardOpen} 
          moodColor={orbMoodColor}
        />

        {/* ONI Feed (Holographic Menu Shards) */}
        <ONIFeed 
          isVisible={showONIFeed && !isCardOpen}
          onShardClick={handleShardClick}
        />

        {/* Result Card with Agentic Features */}
        <ResultCard
          isOpen={isCardOpen}
          content={responseText}
          mood={currentMood}
          onClose={handleCardClose}
          imageUrl={generatedImageUrl}
          imagePrompt={generatedImagePrompt}
        >
          {renderFeatureContent()}
        </ResultCard>

        {/* Glass Input */}
        <GlassInput
          onSubmit={handleSubmit}
          isListening={isListening}
          onMicToggle={handleMicToggle}
          disabled={isLoading}
          transcript={transcript}
        />

        {/* Scan Lines Overlay */}
        <div className="fixed inset-0 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,240,255,0.015)_2px,rgba(0,240,255,0.015)_4px)]" />

        {/* Subtle Vignette */}
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
        
        {/* Mood Indicator Glow */}
        <div 
          className="fixed inset-0 pointer-events-none transition-opacity duration-1000"
          style={{ 
            background: `radial-gradient(ellipse at center, ${orbMoodColor}10 0%, transparent 50%)`,
            opacity: isCardOpen ? 0.5 : 0.2
          }}
        />

        {/* Corner HUD Brackets */}
        <div className="fixed top-6 left-6 w-10 h-10 border-l-2 border-t-2 border-cyan-500/40 pointer-events-none z-[90]" />
        <div className="fixed top-6 right-6 w-10 h-10 border-r-2 border-t-2 border-cyan-500/40 pointer-events-none z-[90]" />
        <div className="fixed bottom-20 left-6 w-10 h-10 border-l-2 border-b-2 border-cyan-500/40 pointer-events-none z-[90]" />
        <div className="fixed bottom-20 right-6 w-10 h-10 border-r-2 border-b-2 border-cyan-500/40 pointer-events-none z-[90]" />

        {/* Version text - top right corner */}
        <div className="fixed top-3 right-6 pointer-events-none z-[90] text-right">
          <p className="text-[9px] font-mono text-cyan-500/50 tracking-[0.08em]">
            {assistantConfig.title} DHF v2120.1
          </p>
        </div>

        {/* Elevated Status - tiny */}
        <div className="fixed top-3 right-48 z-[100]">
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-black/40 rounded">
            <div className={`w-1.5 h-1.5 rounded-full ${isDHFStreaming ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="text-[9px] font-mono text-amber-400/70">Elevated</span>
          </div>
        </div>

        {/* Demo Mode Toggle Button - tiny */}
        <button
          onClick={() => setDemoModeActive(true)}
          className="fixed top-3 right-32 z-[100] px-1.5 py-0.5 bg-black/40 rounded text-[9px] font-mono text-cyan-400/70 hover:text-cyan-400 transition-all"
        >
          DEMO
        </button>

        {/* Demo Mode Overlay */}
        <Suspense fallback={null}>
          <DemoMode
            isActive={demoModeActive}
            onClose={() => setDemoModeActive(false)}
            onRunCommand={handleSubmit}
          />
        </Suspense>
      </div>
    </>
  );
}
