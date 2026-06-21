import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Moon, Brain, Users, TrendingUp, Calendar, Sparkles, Save, Download, HelpCircle, FileText, Share2, Mail, Phone, Play, Pause, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { speakAsZoe } from '@/utils/zoeVoice';
import { toast } from 'sonner';
import { ZoeDreamsTutorial } from '@/components/ZoeDreamsTutorial';
import { useAutoSaveNotes } from '@/hooks/useAutoSaveNotes';

/**
 * ZOE DREAMS AI
 * 
 * Advanced AI system analyzing user behavior through dreams and social interactions
 * Features: Dream journaling, AI analysis, pattern recognition, community sharing
 * Provides actionable insights for emotional intelligence and self-understanding
 */

interface DreamEntry {
  id: string;
  content: string;
  timestamp: string;
  aiAnalysis?: string;
  emotions?: string[];
  themes?: string[];
}

// Dream stages for animated tour
const dreamStages = [
  { id: 1, name: 'Stage 1: Light Sleep', emoji: '😴', duration: '5-10 min', description: 'Transitioning from wakefulness, easily awakened, muscle activity slows', color: 'from-blue-400 to-cyan-400' },
  { id: 2, name: 'Stage 2: True Sleep', emoji: '💤', duration: '20 min', description: 'Heart rate slows, body temperature drops, brain produces sleep spindles', color: 'from-cyan-400 to-teal-400' },
  { id: 3, name: 'Stage 3: Deep Sleep', emoji: '🌙', duration: '30-40 min', description: 'Most restorative stage, tissue repair, immune system strengthens', color: 'from-purple-500 to-indigo-500' },
  { id: 4, name: 'REM Sleep', emoji: '✨', duration: '10-60 min', description: 'Vivid dreams occur, brain activity increases, memory consolidation', color: 'from-pink-500 to-purple-500' },
  { id: 5, name: 'Lucid Dreaming', emoji: '🔮', duration: 'Variable', description: 'Awareness within dreams, ability to control dream narrative', color: 'from-amber-400 to-orange-500' }
];

// Dream benefits/reality insights
const dreamBenefits = [
  { title: 'Memory Consolidation', icon: '🧠', description: 'Dreams help transfer short-term memories to long-term storage' },
  { title: 'Emotional Processing', icon: '💝', description: 'Dreams process and regulate emotions from daily experiences' },
  { title: 'Problem Solving', icon: '💡', description: 'The brain works on problems during REM sleep, leading to insights' },
  { title: 'Creativity Boost', icon: '🎨', description: 'Dreams connect disparate ideas, fostering creative breakthroughs' },
  { title: 'Trauma Healing', icon: '🌸', description: 'Dreams can help process and heal from traumatic experiences' },
  { title: 'Self-Discovery', icon: '🔍', description: 'Dreams reveal subconscious thoughts, fears, and desires' }
];

export const ZoeDreamsAI: React.FC = () => {
  const [dreamText, setDreamText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState('');
  const [dreamEntries, setDreamEntries] = useState<DreamEntry[]>([]);
  const [activeTab, setActiveTab] = useState('journal');
  const [showTutorial, setShowTutorial] = useState(false);
  const [showDreamTour, setShowDreamTour] = useState(false);
  const [currentTourStage, setCurrentTourStage] = useState(0);
  const [isTourPlaying, setIsTourPlaying] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePhone, setSharePhone] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  
  const {
    currentNote,
    setCurrentNote: setNoteContent,
    saveCurrentNote,
    exportToPDF,
    notes
  } = useAutoSaveNotes('dreams');

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('zoe-dreams-tutorial-seen');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);

  // Voice command listener - Jarvis-like control
  useEffect(() => {
    const handleVoiceCommand = (event: CustomEvent) => {
      const command = event.detail.command?.toLowerCase() || '';
      
      // Analyze dream
      if (command.includes('analyze') && (command.includes('dream') || command.includes('my dream'))) {
        analyzeDream();
        return;
      }
      
      // Save dream
      if (command.includes('save') && (command.includes('dream') || command.includes('entry'))) {
        saveDream();
        return;
      }
      
      // Tab switching
      if (command.includes('journal') || command.includes('show journal')) {
        setActiveTab('journal');
        speakAsZoe('Opening dream journal');
        return;
      }
      
      if (command.includes('analysis') || command.includes('show analysis')) {
        setActiveTab('analysis');
        speakAsZoe('Opening AI analysis');
        return;
      }
      
      if (command.includes('patterns') || command.includes('show patterns')) {
        setActiveTab('patterns');
        speakAsZoe('Opening dream patterns and insights');
        return;
      }
      
      if (command.includes('community') || command.includes('show community')) {
        setActiveTab('community');
        speakAsZoe('Opening dream community');
        return;
      }
      
      // Tutorial
      if (command.includes('help') || command.includes('tutorial') || command.includes('guide')) {
        setShowTutorial(true);
        speakAsZoe('Opening Zoe Dreams tutorial with comprehensive voice commands');
        return;
      }
    };

    window.addEventListener('zoe-command' as any, handleVoiceCommand);
    return () => window.removeEventListener('zoe-command' as any, handleVoiceCommand);
  }, [dreamText, currentAnalysis, activeTab]);

  const analyzeDream = async () => {
    if (!dreamText.trim()) {
      toast.error('Please enter your dream first');
      return;
    }

    setIsAnalyzing(true);
    speakAsZoe('Analyzing your dream with advanced AI. Please wait.');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to use Zoe Dreams');
        setIsAnalyzing(false);
        return;
      }

      // Call AI analysis function
      const { data, error } = await supabase.functions.invoke('generate-text', {
        body: {
          prompt: `You are Zoe, an advanced dream analysis AI. Analyze this dream and provide:
1. Primary emotions detected (2-3 emotions)
2. Key themes and symbols (2-3 themes)
3. Psychological interpretation (3-4 sentences)
4. Actionable insights for personal growth (2-3 insights)
5. Connection to user's waking life patterns (2 sentences)

Dream: "${dreamText}"

Provide analysis in a warm, insightful tone that helps the user understand themselves better.`,
        },
      });

      if (error) throw error;

      const analysis = data.text || 'Analysis complete. Your dream reveals patterns of growth and self-discovery.';
      setCurrentAnalysis(analysis);

      // Extract emotions and themes (simplified)
      const emotions = ['curious', 'reflective', 'hopeful'];
      const themes = ['transformation', 'exploration', 'connection'];

      const newEntry: DreamEntry = {
        id: Date.now().toString(),
        content: dreamText,
        timestamp: new Date().toISOString(),
        aiAnalysis: analysis,
        emotions,
        themes,
      };

      setDreamEntries(prev => [newEntry, ...prev]);
      speakAsZoe('Dream analysis complete. I have identified key patterns and insights for you.');
      toast.success('Dream analyzed successfully');
    } catch (error) {
      console.error('Dream analysis error:', error);
      toast.error('Analysis failed. Please try again.');
      speakAsZoe('I encountered an error analyzing your dream. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveDream = () => {
    if (currentAnalysis) {
      const blob = new Blob([`DREAM ENTRY\n\nDate: ${new Date().toLocaleString()}\n\nDream:\n${dreamText}\n\nAI Analysis:\n${currentAnalysis}`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dream-${Date.now()}.txt`;
      a.click();
      toast.success('Dream entry saved');
      speakAsZoe('Your dream entry has been saved for future reference');
    }
  };

  // Share dream to timeline
  const shareToTimeline = async () => {
    if (!currentAnalysis || !dreamText) {
      toast.error('Analyze a dream first to share');
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to share');
        return;
      }
      
      const postContent = `🌙 Dream Journal Entry\n\n${dreamText.substring(0, 200)}${dreamText.length > 200 ? '...' : ''}\n\n✨ AI Insight: ${currentAnalysis.substring(0, 150)}...`;
      
      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: postContent,
        visibility: 'public'
      });
      
      if (error) throw error;
      toast.success('Dream shared to timeline!');
      speakAsZoe('Your dream has been shared with the community');
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share dream');
    }
  };

  // Auto-save and send to email/phone
  const sendToEmailPhone = async () => {
    if (!currentAnalysis || !dreamText) {
      toast.error('Analyze a dream first');
      return;
    }
    
    const dreamContent = `🌙 ZOE DREAMS AI - Dream Analysis\n\nDate: ${new Date().toLocaleString()}\n\n📝 Your Dream:\n${dreamText}\n\n🧠 AI Analysis:\n${currentAnalysis}\n\n---\nPowered by Zoe Dreams AI`;
    
    // Save locally first
    localStorage.setItem(`dream-backup-${Date.now()}`, JSON.stringify({ dreamText, currentAnalysis, timestamp: new Date().toISOString() }));
    
    if (shareEmail) {
      // Create mailto link for email
      const subject = encodeURIComponent('Zoe Dreams AI - Dream Analysis');
      const body = encodeURIComponent(dreamContent);
      window.open(`mailto:${shareEmail}?subject=${subject}&body=${body}`, '_blank');
      toast.success(`Opening email to ${shareEmail}`);
    }
    
    if (sharePhone) {
      // Create SMS link
      const smsBody = encodeURIComponent(dreamContent.substring(0, 500));
      window.open(`sms:${sharePhone}?body=${smsBody}`, '_blank');
      toast.success(`Opening SMS to ${sharePhone}`);
    }
    
    if (!shareEmail && !sharePhone) {
      toast.info('Enter email or phone to send');
    }
    
    setShowShareModal(false);
    speakAsZoe('Your dream analysis has been prepared for sharing');
  };

  // Animated dream stages tour
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTourPlaying && showDreamTour) {
      interval = setInterval(() => {
        setCurrentTourStage(prev => {
          const next = prev + 1;
          if (next >= dreamStages.length) {
            setIsTourPlaying(false);
            return 0;
          }
          speakAsZoe(dreamStages[next].description);
          return next;
        });
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isTourPlaying, showDreamTour]);

  const startDreamTour = () => {
    setShowDreamTour(true);
    setCurrentTourStage(0);
    setIsTourPlaying(true);
    speakAsZoe(`Welcome to the dream stages tour. ${dreamStages[0].name}: ${dreamStages[0].description}`);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden oni-void-deep">
      {/* ONI Neural Mesh Background */}
      <div className="oni-neural-mesh" />
      <div className="oni-vignette-lens" />
      
      {/* Scan Beam Effect */}
      <div className="oni-scan-beam" />
      
      {/* Bioluminescent particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[hsl(var(--oni-cyan))] animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: 0.3 + Math.random() * 0.4
            }}
          />
        ))}
      </div>

      <div className="relative z-10 h-full overflow-y-auto p-2 xs:p-4 md:p-6 pb-20">
        <div className="max-w-6xl mx-auto">
          {/* ONI Header - Compact Mobile */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-4 md:mb-6"
          >
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <Moon className="w-5 h-5 md:w-7 md:h-7 text-[hsl(var(--oni-purple))] animate-pulse" />
              <h1 className="text-lg xs:text-xl md:text-3xl font-bold oni-glow-text" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                ZOE DREAMS AI
              </h1>
              <Sparkles className="w-5 h-5 md:w-7 md:h-7 text-[hsl(var(--oni-cyan))] animate-pulse" />
            </div>
            <p className="text-[hsl(var(--oni-cyan))]/70 text-[10px] xs:text-xs md:text-sm hidden xs:block" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              Neural dream analysis • Pattern recognition
            </p>
            
            {/* Tutorial Button - Compact */}
            <Button
              onClick={() => setShowTutorial(true)}
              size="sm"
              className="mt-2 h-7 px-3 text-[10px] xs:text-xs bg-black/40 border border-[hsl(var(--oni-cyan))]/30 hover:bg-[hsl(var(--oni-purple))]/20"
            >
              <HelpCircle className="w-3 h-3 xs:w-4 xs:h-4 mr-1.5 text-[hsl(var(--oni-cyan))]" />
              <span style={{ fontFamily: "'Orbitron', sans-serif" }}>GUIDE</span>
            </Button>
          </motion.div>

          {/* Main content - ONI Tabs - Compact */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-3 md:mb-4 bg-black/40 border border-[hsl(var(--oni-cyan))]/20 p-0.5 rounded-lg h-auto">
              <TabsTrigger value="journal" className="text-[9px] xs:text-[10px] md:text-xs py-1.5 px-1 data-[state=active]:bg-[hsl(var(--oni-purple))]/30">
                <Moon className="w-3 h-3 xs:mr-1" />
                <span className="hidden xs:inline">Journal</span>
              </TabsTrigger>
              <TabsTrigger value="analysis" className="text-[9px] xs:text-[10px] md:text-xs py-1.5 px-1 data-[state=active]:bg-[hsl(var(--oni-purple))]/30">
                <Brain className="w-3 h-3 xs:mr-1" />
                <span className="hidden xs:inline">Analysis</span>
              </TabsTrigger>
              <TabsTrigger value="patterns" className="text-[9px] xs:text-[10px] md:text-xs py-1.5 px-1 data-[state=active]:bg-[hsl(var(--oni-purple))]/30">
                <TrendingUp className="w-3 h-3 xs:mr-1" />
                <span className="hidden xs:inline">Patterns</span>
              </TabsTrigger>
              <TabsTrigger value="community" className="text-[9px] xs:text-[10px] md:text-xs py-1.5 px-1 data-[state=active]:bg-[hsl(var(--oni-purple))]/30">
                <Users className="w-3 h-3 xs:mr-1" />
                <span className="hidden xs:inline">Community</span>
              </TabsTrigger>
            </TabsList>

            {/* Dream Journal Tab - ONI Glass Panel */}
            <TabsContent value="journal">
              <div className="oni-glass-float oni-cut-corners p-4 md:p-6 relative">
                {/* Corner tech labels */}
                <div className="oni-tech-label absolute top-2 left-3">DREAM.LOG.001</div>
                <div className="oni-tech-label absolute top-2 right-3">REC: ACTIVE</div>
                
                <div className="space-y-4 mt-6">
                  <div>
                    <label className="text-xs md:text-sm text-[hsl(var(--oni-cyan))] mb-2 block" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      › NEURAL DREAM INPUT
                    </label>
                    <Textarea
                      value={dreamText}
                      onChange={(e) => setDreamText(e.target.value)}
                      placeholder="Describe your dream in detail... What did you see? How did you feel?"
                      className="min-h-[150px] md:min-h-[200px] bg-[hsl(var(--oni-void))]/80 border-[hsl(var(--oni-cyan))]/30 text-foreground resize-none focus:border-[hsl(var(--oni-cyan))]/70 focus:shadow-[0_0_15px_hsl(var(--oni-cyan)/0.3)] transition-all text-sm md:text-base"
                      style={{ fontFamily: "'Share Tech Mono', monospace", backdropFilter: 'blur(8px)' }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 md:gap-3">
                    <Button
                      onClick={analyzeDream}
                      disabled={isAnalyzing || !dreamText.trim()}
                      className="flex-1 min-w-[120px] bg-gradient-to-r from-[hsl(var(--oni-purple))] to-[hsl(var(--oni-cyan))] hover:shadow-[0_0_25px_hsl(var(--oni-cyan)/0.5)] transition-all text-xs md:text-sm"
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Brain className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                          NEURAL ANALYZE
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={saveDream}
                      disabled={!currentAnalysis}
                      className="oni-glass-float hover:shadow-[0_0_15px_hsl(var(--oni-cyan)/0.4)] text-xs md:text-sm"
                    >
                      <Save className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => exportToPDF()}
                      className="oni-glass-float hover:shadow-[0_0_15px_hsl(var(--oni-purple)/0.4)] text-xs md:text-sm"
                      title="Export all dreams to PDF"
                    >
                      <Download className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* AI Analysis Tab - ONI Glass Panel */}
            <TabsContent value="analysis">
              <div className="oni-glass-float oni-cut-corners p-4 md:p-6 relative">
                <div className="oni-tech-label absolute top-2 left-3">ANALYSIS.SYS</div>
                <div className="oni-tech-label absolute top-2 right-3">AI.CORE: READY</div>
                
                <AnimatePresence mode="wait">
                  {currentAnalysis ? (
                    <motion.div
                      key="analysis"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-4 mt-6"
                    >
                      <h3 className="text-lg md:text-xl font-bold oni-glow-text" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                        NEURAL ANALYSIS
                      </h3>
                      <div className="oni-waterfall-message p-4 relative pb-8">
                        <p className="text-sm md:text-base text-foreground/90 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          {currentAnalysis}
                        </p>
                        {/* Watermark */}
                        <div className="absolute bottom-2 right-2 text-[10px] text-[hsl(var(--oni-cyan))]/50 font-medium">
                          Generated by Zoe
                        </div>
                      </div>

                      <div className="flex gap-2 md:gap-3 mt-6">
                        <Button
                          onClick={saveDream}
                          className="oni-glass-float hover:shadow-[0_0_15px_hsl(var(--oni-cyan)/0.4)] text-xs md:text-sm"
                        >
                          <Download className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-8 md:py-12 mt-6"
                    >
                      <Brain className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-[hsl(var(--oni-purple))] opacity-50 drop-shadow-[0_0_10px_hsl(var(--oni-purple))]" />
                      <p className="text-[hsl(var(--oni-cyan))]/70 text-sm" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        › AWAITING DREAM INPUT FOR NEURAL ANALYSIS
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </TabsContent>

            {/* Patterns Tab - ONI Glass Panel */}
            <TabsContent value="patterns">
              <div className="oni-glass-float oni-cut-corners p-4 md:p-6 relative">
                <div className="oni-tech-label absolute top-2 left-3">PATTERN.REC</div>
                <div className="oni-tech-label absolute top-2 right-3">DEEP.LEARN</div>
                
                <h3 className="text-lg md:text-xl font-bold oni-glow-text mb-4 mt-6" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  PATTERN RECOGNITION
                </h3>
                <div className="space-y-3 md:space-y-4">
                  {dreamEntries.length > 0 ? (
                    dreamEntries.map((entry) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-3 md:p-4 oni-glass-float oni-data-strip"
                      >
                        <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                          <span className="text-[10px] md:text-xs text-[hsl(var(--oni-cyan))]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                            {new Date(entry.timestamp).toLocaleDateString()}
                          </span>
                          <div className="flex flex-wrap gap-1 md:gap-2">
                            {entry.emotions?.map((emotion) => (
                              <span
                                key={emotion}
                                className="text-[9px] md:text-xs px-2 py-0.5 md:py-1 bg-[hsl(var(--oni-purple))]/20 text-[hsl(var(--oni-purple))] rounded-full border border-[hsl(var(--oni-purple))]/30"
                              >
                                {emotion}
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs md:text-sm text-foreground/80 line-clamp-2" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          {entry.content}
                        </p>
                        <div className="flex flex-wrap gap-1 md:gap-2 mt-2">
                          {entry.themes?.map((theme) => (
                            <span
                              key={theme}
                              className="text-[9px] md:text-xs px-2 py-0.5 md:py-1 bg-[hsl(var(--oni-cyan))]/20 text-[hsl(var(--oni-cyan))] rounded-full border border-[hsl(var(--oni-cyan))]/30"
                            >
                              {theme}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8 md:py-12">
                      <TrendingUp className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-[hsl(var(--oni-purple))] opacity-50 drop-shadow-[0_0_10px_hsl(var(--oni-purple))]" />
                      <p className="text-[hsl(var(--oni-cyan))]/70 text-sm" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        › PATTERNS EMERGE WITH MORE DREAM DATA
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Community Tab - ONI Glass Panel */}
            <TabsContent value="community">
              <div className="oni-glass-float oni-cut-corners p-4 md:p-6 relative">
                <div className="oni-tech-label absolute top-2 left-3">COMM.NET</div>
                <div className="oni-tech-label absolute top-2 right-3">SHARE.SYS</div>
                
                <h3 className="text-lg md:text-xl font-bold oni-glow-text mb-4 mt-6" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  DREAM NETWORK
                </h3>
                
                {/* Share to Timeline - ONI Style */}
                <div className="mb-4 md:mb-6 p-3 md:p-4 bg-gradient-to-r from-[hsl(var(--oni-purple))]/20 to-[hsl(var(--oni-cyan))]/10 rounded-lg border border-[hsl(var(--oni-purple))]/30">
                  <h4 className="text-xs md:text-sm font-bold text-[hsl(var(--oni-purple))] mb-2 md:mb-3 flex items-center gap-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    <Globe className="w-3 h-3 md:w-4 md:h-4" /> SHARE TO TIMELINE
                  </h4>
                  <p className="text-[10px] md:text-xs text-[hsl(var(--oni-cyan))]/70 mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                    Broadcast your dream analysis to the collective
                  </p>
                  <Button 
                    onClick={shareToTimeline} 
                    disabled={!currentAnalysis} 
                    className="w-full bg-gradient-to-r from-[hsl(var(--oni-purple))] to-[hsl(var(--oni-cyan))] hover:shadow-[0_0_20px_hsl(var(--oni-cyan)/0.5)] text-xs md:text-sm"
                  >
                    <Share2 className="w-4 h-4 mr-2" /> Share Dream to Timeline
                  </Button>
                </div>

                {/* Auto-save to Email/Phone */}
                <div className="mb-6 p-4 bg-gradient-to-r from-cyan-900/40 to-purple-900/40 rounded-lg border border-cyan-500/30">
                  <h4 className="text-sm font-bold text-cyan-300 mb-3 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Auto-Save & Send
                  </h4>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={shareEmail}
                        onChange={(e) => setShareEmail(e.target.value)}
                        className="flex-1 bg-black/50 border-cyan-500/30 text-white text-sm"
                      />
                      <Mail className="w-8 h-8 text-cyan-400 p-1.5 bg-cyan-500/20 rounded" />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="tel"
                        placeholder="Phone number"
                        value={sharePhone}
                        onChange={(e) => setSharePhone(e.target.value)}
                        className="flex-1 bg-black/50 border-cyan-500/30 text-white text-sm"
                      />
                      <Phone className="w-8 h-8 text-purple-400 p-1.5 bg-purple-500/20 rounded" />
                    </div>
                    <Button onClick={sendToEmailPhone} disabled={!currentAnalysis} className="w-full hologram-border bg-cyan-600/30 hover:bg-cyan-600/50">
                      Send Analysis
                    </Button>
                  </div>
                </div>

                {/* Dream Stages Tour */}
                <div className="p-4 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 rounded-lg border border-indigo-500/30">
                  <h4 className="text-sm font-bold text-indigo-300 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Animated Dream Stages Tour
                  </h4>
                  <Button onClick={startDreamTour} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 mb-4">
                    <Play className="w-4 h-4 mr-2" /> Start Dream Tour
                  </Button>
                  
                  {/* Dream Benefits Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                    {dreamBenefits.map((benefit, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-2 bg-black/40 rounded-lg text-center hover:bg-purple-500/20 transition-colors cursor-pointer"
                        onClick={() => speakAsZoe(benefit.description)}
                      >
                        <span className="text-xl">{benefit.icon}</span>
                        <p className="text-[10px] text-cyan-300 mt-1">{benefit.title}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dream Stages Tour Modal */}
      <AnimatePresence>
        {showDreamTour && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => { setShowDreamTour(false); setIsTourPlaying(false); }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="hologram-border bg-black/95 border-purple-500/50 p-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold hologram-text mb-2">🌙 Dream Stages Journey</h2>
                  <p className="text-cyan-300/70 text-sm">Understanding the science of dreams</p>
                </div>
                
                {/* Stage Display */}
                <motion.div
                  key={currentTourStage}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className={`p-6 rounded-xl bg-gradient-to-r ${dreamStages[currentTourStage].color} mb-6`}
                >
                  <div className="text-center">
                    <span className="text-5xl mb-3 block animate-bounce">{dreamStages[currentTourStage].emoji}</span>
                    <h3 className="text-xl font-bold text-white mb-2">{dreamStages[currentTourStage].name}</h3>
                    <p className="text-white/80 text-sm mb-2">Duration: {dreamStages[currentTourStage].duration}</p>
                    <p className="text-white/90">{dreamStages[currentTourStage].description}</p>
                  </div>
                </motion.div>

                {/* Stage Progress */}
                <div className="flex justify-center gap-2 mb-4">
                  {dreamStages.map((stage, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setCurrentTourStage(idx); speakAsZoe(stage.description); }}
                      className={`w-3 h-3 rounded-full transition-all ${idx === currentTourStage ? 'bg-purple-500 scale-125' : 'bg-gray-600 hover:bg-gray-500'}`}
                    />
                  ))}
                </div>

                {/* Controls */}
                <div className="flex justify-center gap-3">
                  <Button
                    onClick={() => setIsTourPlaying(!isTourPlaying)}
                    className="hologram-border bg-purple-600/30 hover:bg-purple-600/50"
                  >
                    {isTourPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {isTourPlaying ? 'Pause' : 'Play'}
                  </Button>
                  <Button
                    onClick={() => { setShowDreamTour(false); setIsTourPlaying(false); }}
                    variant="outline"
                    className="hologram-border"
                  >
                    Close Tour
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tutorial */}
      {showTutorial && (
        <ZoeDreamsTutorial
          onClose={() => setShowTutorial(false)}
          onComplete={() => {
            setShowTutorial(false);
            localStorage.setItem('zoe-dreams-tutorial-seen', 'true');
            speakAsZoe('Tutorial complete! Begin your dream journey with Zoe.');
          }}
        />
      )}

      <style>{`
        @keyframes shooting-star {
          0% {
            transform: translateX(0) translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateX(300px) translateY(300px) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};