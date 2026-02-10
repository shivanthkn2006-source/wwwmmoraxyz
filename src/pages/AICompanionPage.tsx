import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Video, VideoOff, Heart, Brain, Sparkles, Activity, Zap, Camera, Copy, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ZoeCompactChatInput } from '@/components/ZoeCompactChatInput';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  createSpeechRecognition, 
  stopSpeechRecognition, 
  isSpeechRecognitionSupported 
} from '@/utils/micPermissionManager';

// Circuit breaker for TTS
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private readonly threshold = 3;
  private readonly timeout = 30000;

  canAttempt(): boolean {
    if (this.failures < this.threshold) return true;
    if (Date.now() - this.lastFailTime > this.timeout) {
      this.failures = 0;
      return true;
    }
    return false;
  }

  recordSuccess() {
    this.failures = 0;
  }

  recordFailure() {
    this.failures++;
    this.lastFailTime = Date.now();
  }
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AICompanionPage() {
  // Soul Engine state
  const [intimacy, setIntimacy] = useState(50);
  const [selfHarmony, setSelfHarmony] = useState(75);
  const [loveEnergy, setLoveEnergy] = useState(60);

  // Visual state
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState<string>('Neutral');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Audio settings
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [voiceSettings, setVoiceSettings] = useState({
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8
  });

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [statusLabel, setStatusLabel] = useState('Idle');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Deep psyche
  const [patterns, setPatterns] = useState<string[]>([]);
  const [memories, setMemories] = useState<string[]>([]);
  const [copiedMessageIdx, setCopiedMessageIdx] = useState<number | null>(null);

  // Circuit breaker for audio
  const circuitBreaker = useMemo(() => new CircuitBreaker(), []);

  // Voice-to-text input using centralized manager
  const startVoiceInput = () => {
    if (!isSpeechRecognitionSupported()) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }

    const recognition = createSpeechRecognition({
      continuous: false,
      interimResults: false,
      keepAlive: false, // Single-shot mode
    });
    
    if (!recognition) {
      toast.error('Failed to initialize voice input');
      return;
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return;
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please enable it in browser settings.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      stopSpeechRecognition(recognitionRef.current);
      recognitionRef.current = null;
      setIsListening(false);
    }
  };

  // Vision System - Advanced AI Emotion Detection
  useEffect(() => {
    let interval: number;
    
    const captureAndAnalyze = async () => {
      if (!videoRef.current) return;
      
      // Capture frame from webcam
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      
      try {
        // Call AI Vision for emotion analysis
        const { data, error } = await supabase.functions.invoke('analyze-face-emotion', {
          body: { image: imageBase64 }
        });
        
        if (error) throw error;
        
        // Update detected emotion
        if (data?.emotion) {
          setDetectedEmotion(data.emotion);
          
          // Update Soul Engine based on real emotion
          const emotionImpact: Record<string, { intimacy: number; selfHarmony: number; loveEnergy: number }> = {
            'Happy': { intimacy: 3, selfHarmony: 2, loveEnergy: 5 },
            'Focused': { intimacy: 5, selfHarmony: 3, loveEnergy: 2 },
            'Neutral': { intimacy: 1, selfHarmony: 1, loveEnergy: 1 },
            'Contemplative': { intimacy: 2, selfHarmony: 4, loveEnergy: 2 },
            'Sad': { intimacy: 1, selfHarmony: -3, loveEnergy: -2 },
            'Anxious': { intimacy: 1, selfHarmony: -5, loveEnergy: -1 },
            'Angry': { intimacy: -2, selfHarmony: -4, loveEnergy: -3 },
            'Surprised': { intimacy: 2, selfHarmony: 1, loveEnergy: 3 },
          };
          
          const impact = emotionImpact[data.emotion] || { intimacy: 0, selfHarmony: 0, loveEnergy: 0 };
          setIntimacy(prev => Math.min(100, Math.max(0, prev + impact.intimacy)));
          setSelfHarmony(prev => Math.min(100, Math.max(0, prev + impact.selfHarmony)));
          setLoveEnergy(prev => Math.min(100, Math.max(0, prev + impact.loveEnergy)));
          
          // Add facial patterns to Deep Psyche
          if (data.patterns && data.patterns.length > 0) {
            setPatterns(prev => {
              const newPatterns = data.patterns.filter((p: string) => !prev.includes(p));
              return [...prev, ...newPatterns].slice(-10);
            });
          }
        }
      } catch (error) {
        console.error('Facial analysis error:', error);
      }
    };
    
    if (cameraEnabled) {
      interval = window.setInterval(captureAndAnalyze, 3000);
      captureAndAnalyze();
    }
    
    return () => clearInterval(interval);
  }, [cameraEnabled]);

  // Zoe theme gradient
  const bgColor = 'from-[hsl(var(--destructive))] via-[hsl(335,62%,40%)] to-[hsl(var(--background))]';

  const handleToggleCamera = async () => {
    if (cameraEnabled) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setCameraEnabled(false);
      setStatusLabel('Idle');
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraEnabled(true);
        setStatusLabel('Watching...');
        toast.success('Visual Cortex Active');
      } catch (error) {
        toast.error('Camera access denied');
      }
    }
  };

  // Keyword analysis for soul metrics
  const analyzeKeywords = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes('love') || lower.includes('care') || lower.includes('miss')) {
      setIntimacy(prev => Math.min(100, prev + 3));
      setLoveEnergy(prev => Math.min(100, prev + 2));
    }
    if (lower.includes('understand') || lower.includes('feel') || lower.includes('emotion')) {
      setIntimacy(prev => Math.min(100, prev + 2));
    }
    if (lower.includes('peace') || lower.includes('calm') || lower.includes('balance')) {
      setSelfHarmony(prev => Math.min(100, prev + 3));
    }
    if (lower.includes('happy') || lower.includes('joy') || lower.includes('excite')) {
      setLoveEnergy(prev => Math.min(100, prev + 2));
    }
  };

  // Parse deep psyche tags from AI response
  const parseDeepPsyche = (text: string) => {
    const patternRegex = /\[\[PATTERN:\s*([^\]]+)\]\]/g;
    const memoryRegex = /\[\[MEMORY:\s*([^\]]+)\]\]/g;
    
    const newPatterns: string[] = [];
    const newMemories: string[] = [];
    
    let match;
    while ((match = patternRegex.exec(text)) !== null) {
      newPatterns.push(match[1].trim());
    }
    while ((match = memoryRegex.exec(text)) !== null) {
      newMemories.push(match[1].trim());
    }
    
    const cleanText = text.replace(/\[\[PATTERN:[^\]]+\]\]/g, '').replace(/\[\[MEMORY:[^\]]+\]\]/g, '').trim();
    
    return { patterns: newPatterns, memories: newMemories, cleanText };
  };

  // Speech synthesis with Zoe's calm, soothing voice
  const speakText = async (text: string) => {
    if (!audioEnabled) return;
    
    setIsSpeaking(true);
    setStatusLabel('Voice Active');

    try {
      // Use browser TTS with Zoe's calm voice
      const { speakAsZoe } = await import('@/utils/zoeVoice');
      
      speakAsZoe(
        text,
        {
          rate: voiceSettings.rate,
          pitch: voiceSettings.pitch,
          volume: voiceSettings.volume
        },
        () => {
          setIsSpeaking(true);
          setStatusLabel('Voice Active');
        },
        () => {
          setIsSpeaking(false);
          setStatusLabel('Idle');
        },
        (error) => {
          console.error('Speech synthesis error:', error);
          setIsSpeaking(false);
          setStatusLabel('Idle');
        }
      );
    } catch (error) {
      console.error('Speech synthesis error:', error);
      setIsSpeaking(false);
      setStatusLabel('Idle');
    }
  };

  // Send message to AI
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setStatusLabel('Thinking...');

    analyzeKeywords(input);

    try {
      // Validate messages before sending
      const messagesToSend = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      if (!messagesToSend || messagesToSend.length === 0) {
        throw new Error('No messages to send');
      }

      const { data, error } = await supabase.functions.invoke('zoe-chat', {
        body: { 
          messages: messagesToSend,
          soulMetrics: { intimacy, selfHarmony, loveEnergy, detectedEmotion }
        }
      });

      if (error) throw error;

      const aiMessage = data.message;
      const { patterns: newPatterns, memories: newMemories, cleanText } = parseDeepPsyche(aiMessage);

      if (data.soulUpdates) {
        setIntimacy(prev => Math.min(100, Math.max(0, prev + (data.soulUpdates.intimacyDelta || 0))));
        setSelfHarmony(prev => Math.min(100, Math.max(0, prev + (data.soulUpdates.harmonyDelta || 0))));
        setLoveEnergy(prev => Math.min(100, Math.max(0, prev + (data.soulUpdates.loveEnergyDelta || 0))));
      }

      if (newPatterns.length > 0) setPatterns(prev => [...prev, ...newPatterns]);
      if (newMemories.length > 0) setMemories(prev => [...prev, ...newMemories]);

      const assistantMsg: Message = { role: 'assistant', content: cleanText };
      setMessages(prev => [...prev, assistantMsg]);

      await speakText(cleanText);
      
    } catch (error) {
      console.error('Zoe chat error:', error);
      toast.error('Failed to get AI response. Please try again.');
      setStatusLabel('Idle');
    } finally {
      setIsLoading(false);
    }
  };

  // Copy text to clipboard
  const handleCopyText = (content: string, idx: number) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedMessageIdx(idx);
    toast.success('Text copied to clipboard');
    setTimeout(() => setCopiedMessageIdx(null), 2000);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgColor} text-white font-['Quicksand'] relative overflow-hidden`}>
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-80 bg-card/20 backdrop-blur-xl border-r border-border p-6 overflow-y-auto">
        <h1 className="font-['Cinzel'] text-3xl mb-6 text-accent-foreground">Zoe AI</h1>
        
        {/* Soul Metrics */}
        <div className="mb-6 p-4 bg-card/50 backdrop-blur rounded-lg border border-border">
          <h2 className="font-['Cinzel'] text-lg mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4" /> Soul Engine
          </h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Intimacy</span>
                <span>{intimacy}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-[hsl(335,78%,62%)]" style={{ width: `${intimacy}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Self-Harmony</span>
                <span>{selfHarmony}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-[hsl(217,91%,60%)]" style={{ width: `${selfHarmony}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Love Energy</span>
                <span>{loveEnergy}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-[hsl(280,70%,65%)]" style={{ width: `${loveEnergy}%` }} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Vision System */}
        <div className="mb-6">
          <Button
            onClick={handleToggleCamera}
            variant={cameraEnabled ? 'default' : 'outline'}
            className="w-full mb-3"
          >
            <Camera className="w-4 h-4 mr-2" />
            {cameraEnabled ? 'Deactivate' : 'Activate'} Vision
          </Button>
          
          {cameraEnabled && (
            <div className="bg-card/50 backdrop-blur rounded-lg border border-border p-3">
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full rounded-lg mb-2"
              />
              <p className="text-sm text-center text-accent-foreground">
                Detected: <span className="font-bold">{detectedEmotion}</span>
              </p>
            </div>
          )}
        </div>
        
        {/* Audio Settings */}
        <div className="mb-6 p-4 bg-card/50 backdrop-blur rounded-lg border border-border">
          <div className="flex items-center justify-between mb-3">
            <Label>Audio</Label>
            <Switch checked={audioEnabled} onCheckedChange={setAudioEnabled} />
          </div>
          {audioEnabled && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Rate: {voiceSettings.rate.toFixed(1)}</Label>
                <Slider 
                  value={[voiceSettings.rate]} 
                  onValueChange={([v]) => setVoiceSettings(p => ({ ...p, rate: v }))} 
                  min={0.5} max={2} step={0.1} 
                />
              </div>
              <div>
                <Label className="text-xs">Pitch: {voiceSettings.pitch.toFixed(1)}</Label>
                <Slider 
                  value={[voiceSettings.pitch]} 
                  onValueChange={([v]) => setVoiceSettings(p => ({ ...p, pitch: v }))} 
                  min={0.5} max={2} step={0.1} 
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Deep Psyche */}
        <div className="mb-6 p-4 bg-card/50 backdrop-blur rounded-lg border border-border">
          <h2 className="font-['Cinzel'] text-lg mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4" /> Deep Psyche
          </h2>
          
          <div className="mb-3">
            <h3 className="text-sm font-bold mb-1 text-accent-foreground">Patterns</h3>
            <div className="space-y-1">
              {patterns.length === 0 ? (
                <p className="text-xs text-muted-foreground">None detected yet</p>
              ) : (
                patterns.map((p, i) => (
                  <p key={i} className="text-xs bg-accent/30 p-2 rounded">{p}</p>
                ))
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-bold mb-1 text-accent-foreground">Memories</h3>
            <div className="space-y-1">
              {memories.length === 0 ? (
                <p className="text-xs text-muted-foreground">None recorded yet</p>
              ) : (
                memories.map((m, i) => (
                  <p key={i} className="text-xs bg-accent/30 p-2 rounded">{m}</p>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="ml-80 flex flex-col items-center justify-center min-h-screen p-8">
        {/* Neural Orb */}
        <div className="flex flex-col items-center mb-8">
          <div
            className={`w-64 h-64 rounded-full bg-gradient-to-br from-[hsl(280,70%,65%)] to-[hsl(335,78%,62%)] flex items-center justify-center relative ${
              isLoading
                ? 'animate-pulse duration-500'
                : isSpeaking
                ? 'shadow-[0_0_80px_40px_hsl(280,70%,65%,0.6)]'
                : 'animate-pulse duration-[4s]'
            }`}
          >
            <Activity className="w-20 h-20 text-white" />
          </div>
          <p className="mt-4 text-lg font-['Cinzel'] text-accent-foreground">{statusLabel}</p>
        </div>
        
        {/* Chat Area */}
        <div className="w-full max-w-3xl bg-card/50 backdrop-blur-xl rounded-2xl border border-border p-6">
          <div className="h-96 overflow-y-auto mb-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg relative group ${
                  msg.role === 'user'
                    ? 'bg-accent/40 ml-auto max-w-[80%]'
                    : 'bg-[hsl(335,78%,62%,0.3)] mr-auto max-w-[80%]'
                }`}
              >
                <p className="text-sm pr-6">{msg.content}</p>
                {/* Copy button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background/30"
                        onClick={() => handleCopyText(msg.content, i)}
                      >
                        {copiedMessageIdx === i ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{copiedMessageIdx === i ? 'Copied!' : 'Copy text'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[hsl(335,78%,62%,0.3)] p-3 rounded-lg">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <ZoeCompactChatInput
            input={input}
            setInput={setInput}
            onSend={(text) => {
              setInput(text);
              handleSend();
            }}
            isLoading={isLoading}
            isListening={isListening}
            onToggleListening={isListening ? stopVoiceInput : startVoiceInput}
            placeholder="Speak to Zoe..."
            disabled={isSpeaking}
            messages={messages.map(m => ({
              role: m.role,
              content: m.content,
              created_at: new Date().toISOString()
            }))}
            userName="User"
            showExport={true}
            showAttach={true}
            showMic={true}
          />
        </div>
      </div>
    </div>
  );
}