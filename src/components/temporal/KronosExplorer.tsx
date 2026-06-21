// ═══════════════════════════════════════════════════════════════════════════════
// KRONOS EXPLORER - Check Others' Timelines (Mirror Mode)
// Generates shareable "Kronos Identity Card" for any person
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  User,
  Calendar,
  Clock,
  Sparkles,
  Download,
  Share2,
  AlertTriangle,
  Star,
  Moon,
  Sun,
  Zap,
  Eye,
  Heart,
  Briefcase,
  Home
} from 'lucide-react';
import { 
  generateDarkCycleReading, 
  getCurrentDasha,
  type DarkCycleReading 
} from '@/core/quantum/DarkCycleEngine';
import { toast } from 'sonner';

interface ExplorerInput {
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  // Optional checkbox data for enhanced readings
  includeRelationship: boolean;
  includeCareer: boolean;
  includeHealth: boolean;
  includeSpiritual: boolean;
}

// Cosmic Archetypes based on numerology
const COSMIC_ARCHETYPES: Record<number, { name: string; emoji: string; description: string }> = {
  1: { name: 'The Pioneer', emoji: '🔥', description: 'Born to lead and create new paths' },
  2: { name: 'The Diplomat', emoji: '🌙', description: 'Master of harmony and partnerships' },
  3: { name: 'The Creator', emoji: '✨', description: 'Expressive artist and communicator' },
  4: { name: 'The Architect', emoji: '🏛️', description: 'Builder of lasting foundations' },
  5: { name: 'The Explorer', emoji: '🌀', description: 'Freedom-seeker and change catalyst' },
  6: { name: 'The Nurturer', emoji: '💎', description: 'Guardian of love and responsibility' },
  7: { name: 'The Mystic', emoji: '🔮', description: 'Seeker of hidden truths' },
  8: { name: 'The Powerhouse', emoji: '♾️', description: 'Master of material and spiritual realms' },
  9: { name: 'The Humanitarian', emoji: '🌍', description: 'Born to serve and complete cycles' },
};

const calculateLifePath = (dob: Date): number => {
  const dateStr = `${dob.getFullYear()}${String(dob.getMonth() + 1).padStart(2, '0')}${String(dob.getDate()).padStart(2, '0')}`;
  let sum = dateStr.split('').reduce((acc, digit) => acc + parseInt(digit, 10), 0);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = String(sum).split('').reduce((acc, digit) => acc + parseInt(digit, 10), 0);
  }
  return sum > 9 ? sum % 9 || 9 : sum;
};

// Calculate key turning points (Jupiter returns every 12 years)
const calculateKeyTurningPoints = (birthYear: number): number[] => {
  const currentYear = new Date().getFullYear();
  const points: number[] = [];
  for (let year = birthYear; year <= currentYear + 24; year += 12) {
    if (year > birthYear) points.push(year);
  }
  return points.slice(0, 4); // Return up to 4 key points
};

// Get energy phase for a given year
const getEnergyPhase = (year: number, birthYear: number): { phase: string; type: string } => {
  const age = year - birthYear;
  const jupiterCycle = Math.floor(age / 12);
  const nodalPosition = age % 18.6;
  
  if (nodalPosition < 2 || nodalPosition > 16.6) {
    return { phase: 'Nodal Shift', type: 'Karmic Crossroads - Major life direction changes' };
  }
  if (jupiterCycle % 2 === 0) {
    return { phase: 'Sun Phase', type: 'Public Recognition - Visibility and achievement' };
  }
  return { phase: 'Moon Phase', type: 'Emotional Growth - Inner development and intuition' };
};

const KronosExplorer: React.FC = () => {
  const [input, setInput] = useState<ExplorerInput>({ 
    name: '', 
    dateOfBirth: '', 
    timeOfBirth: '',
    includeRelationship: false,
    includeCareer: false,
    includeHealth: false,
    includeSpiritual: false
  });
  const [reading, setReading] = useState<DarkCycleReading | null>(null);
  const [cosmicId, setCosmicId] = useState<{ name: string; emoji: string; description: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!input.name || !input.dateOfBirth) {
      toast.error('Please enter name and date of birth');
      return;
    }

    setIsGenerating(true);
    setIsFlipped(false); // Reset flip state
    
    // Simulate processing delay for effect
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      const dob = new Date(input.dateOfBirth);
      const tempUserId = `explorer_${Date.now()}`;
      
      // Generate reading using existing engine (temporary, not saved)
      const generatedReading = generateDarkCycleReading(tempUserId, dob);
      
      // Calculate cosmic archetype
      const lifePath = calculateLifePath(dob);
      const archetype = COSMIC_ARCHETYPES[lifePath] || COSMIC_ARCHETYPES[1];
      
      setReading(generatedReading);
      setCosmicId(archetype);
      
      toast.success(`Timeline scan complete for ${input.name}`);
    } catch (error) {
      toast.error('Failed to generate reading');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    
    try {
      // Use native share if available
      if (navigator.share) {
        await navigator.share({
          title: `${input.name}'s Kronos Identity Card`,
          text: `Discover ${input.name}'s cosmic timeline. Generated by Mmora/Zoe.`,
          url: window.location.href
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(
          `${input.name}'s Kronos Identity: ${cosmicId?.name || 'Unknown'}\nCurrent Cycle: ${reading?.presentNode.emotionalSignature || 'N/A'}\nGenerated by Mmora/Zoe`
        );
        toast.success('Card details copied to clipboard!');
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleReset = () => {
    setInput({ 
      name: '', 
      dateOfBirth: '', 
      timeOfBirth: '',
      includeRelationship: false,
      includeCareer: false,
      includeHealth: false,
      includeSpiritual: false
    });
    setReading(null);
    setCosmicId(null);
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {!reading ? (
          // Input Form
          <motion.div
            key="input-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-card/60 to-amber-900/20 backdrop-blur-xl">
              <CardContent className="pt-6 space-y-5">
                <div className="text-center mb-6">
                  <Eye className="w-10 h-10 mx-auto text-amber-400 mb-3" />
                  <h3 className="text-lg font-semibold text-amber-100">Kronos Explorer</h3>
                  <p className="text-xs text-amber-300/70">Check anyone's timeline without affecting yours</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-amber-200 text-sm">Full Name</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/50" />
                      <Input
                        id="name"
                        placeholder="Enter person's name"
                        value={input.name}
                        onChange={(e) => setInput(prev => ({ ...prev, name: e.target.value }))}
                        className="pl-10 bg-amber-950/30 border-amber-500/30 text-amber-100 placeholder:text-amber-400/40"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="dob" className="text-amber-200 text-sm">Date of Birth</Label>
                    <div className="relative mt-1">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/50" />
                      <Input
                        id="dob"
                        type="date"
                        value={input.dateOfBirth}
                        onChange={(e) => setInput(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                        className="pl-10 bg-amber-950/30 border-amber-500/30 text-amber-100"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="time" className="text-amber-200 text-sm">Time of Birth (Optional)</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/50" />
                      <Input
                        id="time"
                        type="time"
                        value={input.timeOfBirth}
                        onChange={(e) => setInput(prev => ({ ...prev, timeOfBirth: e.target.value }))}
                        className="pl-10 bg-amber-950/30 border-amber-500/30 text-amber-100"
                      />
                    </div>
                  </div>
                  
                  {/* Optional Analysis Checkboxes */}
                  <div className="pt-3 border-t border-amber-500/20">
                    <Label className="text-amber-200 text-sm mb-3 block">Include Analysis For (Optional)</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-relationship"
                          checked={input.includeRelationship}
                          onCheckedChange={(checked) => 
                            setInput(prev => ({ ...prev, includeRelationship: !!checked }))
                          }
                          className="border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                        <label 
                          htmlFor="include-relationship" 
                          className="text-xs text-amber-300/80 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Heart className="w-3.5 h-3.5" />
                          Relationships
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-career"
                          checked={input.includeCareer}
                          onCheckedChange={(checked) => 
                            setInput(prev => ({ ...prev, includeCareer: !!checked }))
                          }
                          className="border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                        <label 
                          htmlFor="include-career" 
                          className="text-xs text-amber-300/80 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Briefcase className="w-3.5 h-3.5" />
                          Career
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-health"
                          checked={input.includeHealth}
                          onCheckedChange={(checked) => 
                            setInput(prev => ({ ...prev, includeHealth: !!checked }))
                          }
                          className="border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                        <label 
                          htmlFor="include-health" 
                          className="text-xs text-amber-300/80 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Home className="w-3.5 h-3.5" />
                          Health/Home
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-spiritual"
                          checked={input.includeSpiritual}
                          onCheckedChange={(checked) => 
                            setInput(prev => ({ ...prev, includeSpiritual: !!checked }))
                          }
                          className="border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                        <label 
                          htmlFor="include-spiritual" 
                          className="text-xs text-amber-300/80 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Spiritual
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-amber-950 font-semibold"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      Scanning Timeline...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Generate Kronos Card
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          // Kronos Identity Card with Flip Feature
          <motion.div
            key="identity-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            {/* Flip Card Container */}
            <div 
              className="relative cursor-pointer perspective-1000"
              style={{ aspectRatio: '9/16', maxHeight: '85vh' }}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {/* Flip instruction */}
              <div
                className="absolute -top-8 left-0 right-0 text-center z-10 animate-gpu-pulse-opacity"
              >
                <span className="text-xs text-amber-400/80 flex items-center justify-center gap-1">
                  <Eye className="w-3 h-3" />
                  Tap card to {isFlipped ? 'see Triquetra' : 'reveal Karmic Report'}
                </span>
              </div>

              <motion.div
                ref={cardRef}
                className="relative w-full h-full overflow-hidden rounded-2xl"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* FRONT SIDE - Triquetra Visualization */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                <div 
                  className="absolute inset-0 backface-hidden"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  {/* Glassmorphism Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-amber-950/80" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.15),transparent_50%)]" />
                  <div className="absolute inset-0 backdrop-blur-3xl" />
                  
                  {/* Border Glow */}
                  <div className="absolute inset-0 rounded-2xl border border-amber-500/40 shadow-[0_0_60px_-10px_rgba(251,191,36,0.3)]" />

                  {/* Content */}
                  <div className="relative h-full flex flex-col p-5">
                    {/* Header */}
                    <div className="text-center mb-4">
                      <motion.div 
                        className="text-4xl mb-2 animate-gpu-wiggle"
                        style={{ animationDuration: '5s' }}
                      >
                        {cosmicId?.emoji || '✨'}
                      </motion.div>
                      <h2 className="text-2xl font-bold text-amber-100 tracking-wide">
                        {input.name.toUpperCase()}
                      </h2>
                      <Badge className="mt-2 bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold">
                        {cosmicId?.name || 'Cosmic Being'}
                      </Badge>
                      <p className="text-xs text-amber-400/70 mt-1">{cosmicId?.description}</p>
                    </div>

                    {/* Triquetra Visualization */}
                    <div className="flex-1 flex items-center justify-center py-4">
                      <div className="relative w-full max-w-[280px] aspect-square">
                        {/* Central Node - Present */}
                        <div
                          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 border-amber-400 bg-amber-500/20 flex flex-col items-center justify-center shadow-lg shadow-amber-500/30 animate-gpu-glow-amber"
                        >
                          <Sun className="w-6 h-6 text-amber-400" />
                          <span className="text-xs font-bold text-amber-200">
                            {new Date().getFullYear()}
                          </span>
                        </div>

                        {/* Past Node */}
                        <div className="absolute top-2 left-2 w-16 h-16 rounded-full border border-gray-500/50 bg-gray-800/50 flex flex-col items-center justify-center">
                          <Moon className="w-5 h-5 text-gray-400" />
                          <span className="text-[10px] text-gray-400">
                            {new Date().getFullYear() - 12}
                          </span>
                        </div>

                        {/* Future Node */}
                        <div className="absolute top-2 right-2 w-16 h-16 rounded-full border border-amber-500/50 bg-amber-500/10 flex flex-col items-center justify-center">
                          <Star className="w-5 h-5 text-amber-400" />
                          <span className="text-[10px] text-amber-300">
                            {new Date().getFullYear() + 12}
                          </span>
                        </div>

                        {/* Connecting Lines SVG */}
                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 280">
                          <defs>
                            <linearGradient id="lineGradientFront" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="rgba(251,191,36,0.3)" />
                              <stop offset="100%" stopColor="rgba(251,191,36,0.6)" />
                            </linearGradient>
                          </defs>
                          <motion.path
                            d="M 60 60 Q 140 100 140 140"
                            stroke="url(#lineGradientFront)"
                            strokeWidth="1.5"
                            fill="none"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1 }}
                          />
                          <motion.path
                            d="M 140 140 Q 140 100 220 60"
                            stroke="url(#lineGradientFront)"
                            strokeWidth="1.5"
                            fill="none"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1, delay: 0.3 }}
                          />
                          <motion.path
                            d="M 220 60 Q 140 20 60 60"
                            stroke="rgba(251,191,36,0.2)"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                            fill="none"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1, delay: 0.6 }}
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Bottom Info Grid */}
                    <div className="grid grid-cols-2 gap-3 mt-auto">
                      {/* Current Dasha/Cycle */}
                      <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-700/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="w-4 h-4 text-amber-400" />
                          <span className="text-[10px] uppercase tracking-wider text-gray-400">Current Cycle</span>
                        </div>
                        <p className="text-sm font-semibold text-amber-100">
                          {(() => {
                            const dasha = getCurrentDasha(reading.currentAge);
                            return `${dasha.name} Dasha`;
                          })()}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {getCurrentDasha(reading.currentAge).theme}
                        </p>
                      </div>

                      {/* Key Prediction/Warning */}
                      <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-700/50">
                        <div className="flex items-center gap-2 mb-1">
                          {reading.currentWarning ? (
                            <AlertTriangle className="w-4 h-4 text-orange-400" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-green-400" />
                          )}
                          <span className="text-[10px] uppercase tracking-wider text-gray-400">Insight</span>
                        </div>
                        <p className="text-sm font-semibold text-amber-100 line-clamp-2">
                          {reading.currentWarning?.title || 'Stable Alignment'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Age: {reading.currentAge}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-4 pt-3 border-t border-gray-700/30">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-gray-900">M</span>
                        </div>
                        <span className="text-xs text-gray-400">Generated by <span className="text-amber-400 font-medium">Mmora/Zoe</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* BACK SIDE - Karmic Report */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                <div 
                  className="absolute inset-0 backface-hidden"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  {/* Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-gray-900 to-indigo-950" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.2),transparent_60%)]" />
                  
                  {/* Border */}
                  <div className="absolute inset-0 rounded-2xl border border-purple-500/40 shadow-[0_0_60px_-10px_rgba(139,92,246,0.4)]" />

                  {/* Content */}
                  <div className="relative h-full flex flex-col p-5 overflow-y-auto">
                    {/* Header */}
                    <div className="text-center mb-4">
                      <div className="text-3xl mb-2">📜</div>
                      <h2 className="text-xl font-bold text-purple-100 tracking-wide">
                        KARMIC REPORT
                      </h2>
                      <p className="text-xs text-purple-300/70 mt-1">{input.name}</p>
                    </div>

                    {/* Key Turning Points */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <h3 className="text-sm font-semibold text-purple-200">Key Turning Points</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {calculateKeyTurningPoints(new Date(input.dateOfBirth).getFullYear()).map((year) => (
                          <Badge 
                            key={year}
                            className="bg-yellow-500/20 text-yellow-300 border-yellow-500/40"
                          >
                            {year}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Energy Phases for Key Years */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-purple-400" />
                        <h3 className="text-sm font-semibold text-purple-200">Cycle Energies</h3>
                      </div>
                      
                      {calculateKeyTurningPoints(new Date(input.dateOfBirth).getFullYear()).slice(0, 3).map((year) => {
                        const birthYear = new Date(input.dateOfBirth).getFullYear();
                        const energy = getEnergyPhase(year, birthYear);
                        const isPast = year < new Date().getFullYear();
                        const isCurrent = year === new Date().getFullYear();
                        
                        return (
                          <motion.div 
                            key={year}
                            className={`p-3 rounded-lg border ${
                              isCurrent 
                                ? 'bg-purple-500/20 border-purple-400/50' 
                                : isPast 
                                  ? 'bg-gray-800/40 border-gray-600/30' 
                                  : 'bg-indigo-900/30 border-indigo-500/30'
                            }`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * (year % 10) }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-bold text-purple-100">{year}</span>
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] ${
                                  energy.phase === 'Sun Phase' 
                                    ? 'text-yellow-400 border-yellow-500/40' 
                                    : energy.phase === 'Moon Phase'
                                      ? 'text-blue-400 border-blue-500/40'
                                      : 'text-red-400 border-red-500/40'
                                }`}
                              >
                                {energy.phase}
                              </Badge>
                            </div>
                            <p className="text-[10px] text-gray-400">{energy.type}</p>
                            {isCurrent && (
                              <div className="mt-2 pt-2 border-t border-purple-500/30">
                                <p className="text-[10px] text-purple-300 italic">
                                  ✨ You are in this cycle now
                                </p>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Dasha Summary */}
                    <div className="mt-4 p-3 rounded-lg bg-purple-900/30 border border-purple-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Moon className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-medium text-purple-200">Current Dasha Period</span>
                      </div>
                      <p className="text-sm font-semibold text-purple-100">
                        {getCurrentDasha(reading.currentAge).name} ({getCurrentDasha(reading.currentAge).startAge}-{getCurrentDasha(reading.currentAge).endAge} years)
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Theme: {getCurrentDasha(reading.currentAge).theme}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-4 pt-3 border-t border-purple-700/30">
                      <p className="text-[10px] text-purple-400">Tap to flip back</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Check Another
              </Button>
              <Button
                onClick={handleShare}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-amber-950 font-semibold"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Card
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default KronosExplorer;
