// ═══════════════════════════════════════════════════════════════════════════════
// AGASTHYA VISION - NADI TRUTH & OCCULT SCAN INTERFACE
// Altered Carbon Style - Ancient Tamil meets Hyper-Futuristic
// Protocol designed for User @moksh50 (Admin) - Module 6000.1
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  Shield, 
  AlertTriangle, 
  Heart, 
  Calendar,
  Sparkles,
  Zap,
  Moon,
  Sun,
  Skull,
  Lock,
  Unlock,
  RefreshCw,
  ChevronRight,
  Search,
  Fingerprint
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  NadiPredictor,
  type LieDetectionResult,
  type RelationshipReunionResult,
  type PastLifeKarma,
  type NadiPrediction
} from '@/core/quantum/AgasthyaNadiEngine';
import { AgasthyaScanner } from './AgasthyaScanner';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface ShatruDoshaGaugeProps {
  result: LieDetectionResult;
}

const ShatruDoshaGauge: React.FC<ShatruDoshaGaugeProps> = ({ result }) => {
  const { shatruDosha, truthProbability, deceptionScore } = result;
  
  const getGaugeColor = (level: string) => {
    switch (level) {
      case 'NONE': return 'from-emerald-500 to-green-400';
      case 'MINOR': return 'from-yellow-500 to-amber-400';
      case 'MODERATE': return 'from-orange-500 to-amber-500';
      case 'SEVERE': return 'from-red-500 to-orange-500';
      case 'CRITICAL': return 'from-purple-600 to-red-600';
      default: return 'from-gray-500 to-gray-400';
    }
  };
  
  const getStatusIcon = (level: string) => {
    switch (level) {
      case 'NONE': return <Shield className="w-8 h-8 text-emerald-400" />;
      case 'MINOR': return <Eye className="w-8 h-8 text-yellow-400" />;
      case 'MODERATE': return <AlertTriangle className="w-8 h-8 text-orange-400" />;
      case 'SEVERE': return <Skull className="w-8 h-8 text-red-400" />;
      case 'CRITICAL': return <Zap className="w-8 h-8 text-purple-400 animate-pulse" />;
      default: return <Eye className="w-8 h-8 text-gray-400" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative"
    >
      <Card className="bg-black/60 backdrop-blur-xl border border-red-500/30 p-6 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-transparent to-purple-900/20" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_black_100%)]" />
          {/* Tamil script overlay effect */}
          <div className="absolute inset-0 text-red-500/10 text-xs overflow-hidden whitespace-nowrap animate-pulse">
            சத்ரு தோஷம் • शत्रु दोष • SHATRU DOSHA • சத்ரு தோஷம் • शत्रु दोष
          </div>
        </div>
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {getStatusIcon(shatruDosha.level)}
              <div>
                <h3 className="text-xl font-bold text-red-400 tracking-wide">
                  SHATRU DOSHA LEVEL
                </h3>
                <p className="text-xs text-red-300/60 font-mono">
                  KANDAM 6 • SHADOW ANALYSIS
                </p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${getGaugeColor(shatruDosha.level)} text-black font-bold text-sm`}>
              {shatruDosha.level}
            </div>
          </div>
          
          {/* Main Gauge */}
          <div className="relative h-8 bg-black/60 rounded-full overflow-hidden border border-red-500/30 mb-6">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${deceptionScore}%` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getGaugeColor(shatruDosha.level)}`}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold text-lg drop-shadow-lg">
                {deceptionScore}% DECEPTION DETECTED
              </span>
            </div>
          </div>
          
          {/* Truth vs Deception */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-emerald-900/30 rounded-lg p-4 border border-emerald-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Unlock className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">TRUTH</span>
              </div>
              <div className="text-3xl font-bold text-emerald-300">{truthProbability}%</div>
            </div>
            <div className="bg-red-900/30 rounded-lg p-4 border border-red-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-red-400" />
                <span className="text-red-400 font-semibold">DECEPTION</span>
              </div>
              <div className="text-3xl font-bold text-red-300">{deceptionScore}%</div>
            </div>
          </div>
          
          {/* Deception Indicators */}
          {shatruDosha.deceptionIndicators.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                DECEPTION INDICATORS
              </h4>
              <div className="space-y-2">
                {shatruDosha.deceptionIndicators.map((indicator, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-2 text-sm text-red-300/80 bg-red-900/20 rounded px-3 py-2"
                  >
                    <ChevronRight className="w-4 h-4 text-red-500" />
                    {indicator}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          
          {/* Hidden Enemies */}
          {result.hiddenMotiveActive && (
            <div className="mb-6 p-4 bg-purple-900/30 rounded-lg border border-purple-500/30">
              <h4 className="text-sm font-semibold text-purple-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                HIDDEN MOTIVE ACTIVE
              </h4>
              <p className="text-purple-300/80 text-sm">
                {result.analysis}
              </p>
            </div>
          )}
          
          {/* Recommendation */}
          <div className="p-4 bg-gradient-to-r from-red-900/40 to-purple-900/40 rounded-lg border border-red-500/20">
            <h4 className="text-sm font-semibold text-amber-400 mb-2">RECOMMENDATION</h4>
            <p className="text-amber-300/80 text-sm">{result.recommendation}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

interface OccultScannerProps {
  result: LieDetectionResult;
}

const OccultScanner: React.FC<OccultScannerProps> = ({ result }) => {
  const { shatruDosha } = result;
  const { occultInterference } = shatruDosha;
  
  const getAuraColor = () => {
    if (!occultInterference.detected) return 'from-emerald-500/30 to-cyan-500/30';
    switch (occultInterference.type) {
      case 'DRISHTI': return 'from-yellow-500/50 to-orange-500/50';
      case 'ABHICHARA': return 'from-purple-600/60 to-red-600/60';
      case 'PRETA_BADHA': return 'from-gray-500/50 to-purple-500/50';
      case 'ANCESTRAL': return 'from-blue-600/50 to-indigo-600/50';
      default: return 'from-gray-500/30 to-gray-500/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-black/60 backdrop-blur-xl border border-purple-500/30 p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-indigo-900/20" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="relative">
              <Moon className="w-8 h-8 text-purple-400" />
              {occultInterference.detected && (
                <div
                  className="absolute inset-0 bg-red-500/50 rounded-full blur-md animate-gpu-pulse-scale"
                />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-purple-400">
                OCCULT / BLACK MAGIC SCANNER
              </h3>
              <p className="text-xs text-purple-300/60 font-mono">
                ENERGETIC INTERFERENCE DETECTION
              </p>
            </div>
          </div>
          
          {/* Aura Visualization */}
          <div className="relative h-48 mb-6 flex items-center justify-center">
            {/* Outer aura rings */}
            {[1, 2, 3, 4].map((ring) => (
              <div
                key={ring}
                className={`absolute rounded-full bg-gradient-to-r ${getAuraColor()} animate-gpu-pulse-scale-slow`}
                style={{
                  width: `${ring * 40 + 40}px`,
                  height: `${ring * 40 + 40}px`,
                  animationDelay: `${ring * 0.3}s`
                }}
              />
            ))}
            
            {/* Center body silhouette */}
            <div className="relative z-10 w-16 h-24 bg-gradient-to-b from-purple-400 to-purple-600 rounded-t-full opacity-80" />
            
            {/* Status indicator */}
            <div
              className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold animate-gpu-pulse-opacity ${
                occultInterference.detected 
                  ? 'bg-red-500/80 text-white' 
                  : 'bg-emerald-500/80 text-white'
              }`}
            >
              {occultInterference.detected ? '⚠️ INTERFERENCE DETECTED' : '✓ FIELD CLEAR'}
            </div>
          </div>
          
          {/* Detection Results */}
          {occultInterference.detected ? (
            <div className="space-y-4">
              <div className="p-4 bg-red-900/40 rounded-lg border border-red-500/40">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-red-400 font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    DETECTED: {occultInterference.type}
                  </span>
                  <span className="text-red-300 font-bold">{occultInterference.severity}% Severity</span>
                </div>
                <Progress value={occultInterference.severity} className="h-2 bg-red-900/50" />
                <p className="text-sm text-red-300/80 mt-3">
                  Source: {occultInterference.source}
                </p>
              </div>
              
              {/* Remedies */}
              <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-500/30">
                <h4 className="text-purple-400 font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  KARMIC REMEDIATION (PARIHARAM)
                </h4>
                <div className="space-y-2">
                  {shatruDosha.remedies.map((remedy, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-purple-300/80">
                      <Zap className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      {remedy}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-emerald-900/30 rounded-lg border border-emerald-500/30 text-center">
              <Shield className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h4 className="text-emerald-400 font-semibold text-lg">
                NO EXTERNAL ENERGETIC INTERFERENCE DETECTED
              </h4>
              <p className="text-emerald-300/70 text-sm mt-2">
                Your aura field is clear. Maintain regular spiritual practices for protection.
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

interface ReunionTimelineProps {
  result: RelationshipReunionResult;
}

const ReunionTimelineView: React.FC<ReunionTimelineProps> = ({ result }) => {
  const { reunionTimeline, combinedDestinyScore, kandam7Analysis, kandam12Analysis } = result;
  
  const phases = ['SEPARATION', 'COOLING', 'REFLECTION', 'RECONCILIATION', 'REUNION'];
  const currentPhaseIndex = phases.indexOf(reunionTimeline.currentPhase);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-black/60 backdrop-blur-xl border border-pink-500/30 p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-900/20 via-transparent to-rose-900/20" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <Heart className="w-8 h-8 text-pink-400" />
            <div>
              <h3 className="text-xl font-bold text-pink-400">
                RELATIONSHIP REUNION TIMELINE
              </h3>
              <p className="text-xs text-pink-300/60 font-mono">
                KANDAM 7 + 12 • DESTINY PROBABILITY
              </p>
            </div>
          </div>
          
          {/* Main Probability Display */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.8 }}
              className="inline-block"
            >
              <div className="text-7xl font-bold bg-gradient-to-r from-pink-400 to-rose-500 bg-clip-text text-transparent">
                {combinedDestinyScore.toFixed(1)}%
              </div>
              <div className="text-pink-300/70 text-sm mt-2">REUNION PROBABILITY</div>
            </motion.div>
          </div>
          
          {/* Phase Timeline */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-pink-400 mb-4">CURRENT PHASE</h4>
            <div className="relative">
              <div className="absolute top-4 left-0 right-0 h-1 bg-pink-900/50" />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((currentPhaseIndex + 1) / phases.length) * 100}%` }}
                transition={{ duration: 1.5 }}
                className="absolute top-4 left-0 h-1 bg-gradient-to-r from-pink-500 to-rose-500"
              />
              <div className="relative flex justify-between">
                {phases.map((phase, i) => (
                  <div key={phase} className="flex flex-col items-center">
                    <motion.div
                      animate={{
                        scale: i === currentPhaseIndex ? [1, 1.2, 1] : 1,
                        opacity: i <= currentPhaseIndex ? 1 : 0.3
                      }}
                      transition={{ duration: 1, repeat: i === currentPhaseIndex ? Infinity : 0 }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        i <= currentPhaseIndex 
                          ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white' 
                          : 'bg-pink-900/50 text-pink-500/50'
                      }`}
                    >
                      {i + 1}
                    </motion.div>
                    <span className={`text-xs mt-2 ${
                      i === currentPhaseIndex ? 'text-pink-400 font-bold' : 'text-pink-500/50'
                    }`}>
                      {phase}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Prediction Window */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-pink-900/30 rounded-lg p-4 border border-pink-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-pink-400" />
                <span className="text-pink-400 font-semibold text-sm">REUNION WINDOW</span>
              </div>
              <div className="text-lg font-bold text-pink-300">
                {reunionTimeline.predictedReunionWindow.startMonth} - {reunionTimeline.predictedReunionWindow.endMonth}
              </div>
              <div className="text-2xl font-bold text-white">
                {reunionTimeline.predictedReunionWindow.year}
              </div>
            </div>
            <div className="bg-rose-900/30 rounded-lg p-4 border border-rose-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Sun className="w-5 h-5 text-rose-400" />
                <span className="text-rose-400 font-semibold text-sm">PEAK DATE</span>
              </div>
              <div className="text-lg font-bold text-rose-300">
                {reunionTimeline.predictedReunionWindow.peakProbabilityDate}
              </div>
            </div>
          </div>
          
          {/* Transits */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <h5 className="text-emerald-400 text-sm font-semibold flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                FAVORABLE TRANSITS
              </h5>
              {reunionTimeline.transitInfluence.favorableTransits.map((transit, i) => (
                <div key={i} className="text-xs text-emerald-300/80 bg-emerald-900/20 rounded px-2 py-1">
                  {transit}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <h5 className="text-amber-400 text-sm font-semibold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                CHALLENGES
              </h5>
              {reunionTimeline.transitInfluence.challengingTransits.map((transit, i) => (
                <div key={i} className="text-xs text-amber-300/80 bg-amber-900/20 rounded px-2 py-1">
                  {transit}
                </div>
              ))}
            </div>
          </div>
          
          {/* Actions Required */}
          <div className="p-4 bg-gradient-to-r from-pink-900/40 to-rose-900/40 rounded-lg border border-pink-500/20">
            <h4 className="text-sm font-semibold text-pink-400 mb-3">ACTIONS REQUIRED</h4>
            <div className="space-y-2">
              {reunionTimeline.actionRequired.map((action, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-pink-300/80">
                  <Heart className="w-4 h-4 text-pink-500 mt-0.5 flex-shrink-0" />
                  {action}
                </div>
              ))}
            </div>
          </div>
          
          {/* Verdict */}
          <div className="mt-6 p-4 bg-black/40 rounded-lg border border-pink-500/40">
            <p className="text-pink-300 font-mono text-sm whitespace-pre-line">
              {result.verdict}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const AgasthyaVision: React.FC = () => {
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prediction, setPrediction] = useState<NadiPrediction | null>(null);
  const [activeTab, setActiveTab] = useState('truth');
  
  const runAnalysis = async () => {
    if (!name || !dateOfBirth) {
      toast.error('Please enter name and date of birth');
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      // Simulate processing delay for effect
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const dob = new Date(dateOfBirth);
      const predictor = new NadiPredictor(name, dob);
      const result = predictor.analyze(['KANDAM_6', 'KANDAM_7', 'KANDAM_12', 'KANDAM_13']);
      
      setPrediction(result);
      toast.success('Agasthya Nadi Analysis Complete');
    } catch (error) {
      console.error('Nadi analysis error:', error);
      toast.error('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 p-4 md:p-8">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-red-900/10 to-transparent" />
        {/* Animated grid */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]" />
        </div>
      </div>
      
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent mb-2">
            AGASTHYA VISION
          </h1>
          <p className="text-purple-300/60 font-mono text-sm">
            அகஸ்த்ய நாடி • NADI QUANTUM PREDICTOR • MODULE 6000.1
          </p>
          <div className="mt-2 text-xs text-purple-400/40">
            Truth Detection • Occult Scanning • Reunion Timeline • Karmic Analysis
          </div>
        </motion.div>
        
        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-black/60 backdrop-blur-xl border border-purple-500/30 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-purple-400 text-sm font-semibold mb-2 block">
                  SUBJECT NAME
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name..."
                  className="bg-purple-900/20 border-purple-500/30 text-white placeholder:text-purple-500/50"
                />
              </div>
              <div>
                <label className="text-purple-400 text-sm font-semibold mb-2 block">
                  DATE OF BIRTH
                </label>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="bg-purple-900/20 border-purple-500/30 text-white"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={runAnalysis}
                  disabled={isAnalyzing}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold h-10"
                >
                  {isAnalyzing ? (
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Search className="w-5 h-5 mr-2" />
                  )}
                  {isAnalyzing ? 'SCANNING NADI LEAVES...' : 'INITIATE NADI SCAN'}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
        
        {/* Loading State */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="w-24 h-24 border-4 border-purple-500/30 border-t-purple-500 rounded-full mx-auto mb-6 animate-gpu-spin-3s" />
                <div className="text-2xl font-bold text-purple-400 mb-2">
                  Accessing Agasthya Archive...
                </div>
                <div className="text-purple-300/60 text-sm font-mono">
                  Scanning palm leaf index {Math.floor(Math.random() * 108)}/108
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Results */}
        {prediction && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Destiny Score */}
            <div className="text-center mb-8">
              <div className="inline-block bg-black/60 backdrop-blur-xl border border-purple-500/30 rounded-full px-8 py-4">
                <div className="text-sm text-purple-400 mb-1">NADI DESTINY CERTAINTY</div>
                <div className="text-4xl font-bold text-white">
                  {prediction.destinyCertaintyScore.toFixed(1)}%
                </div>
              </div>
            </div>
            
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-5 bg-black/60 border border-purple-500/30 p-1">
                <TabsTrigger 
                  value="biometric" 
                  className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
                >
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Scan
                </TabsTrigger>
                <TabsTrigger 
                  value="truth" 
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Truth/Lie
                </TabsTrigger>
                <TabsTrigger 
                  value="occult"
                  className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                >
                  <Moon className="w-4 h-4 mr-2" />
                  Occult
                </TabsTrigger>
                <TabsTrigger 
                  value="reunion"
                  className="data-[state=active]:bg-pink-600 data-[state=active]:text-white"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Reunion
                </TabsTrigger>
                <TabsTrigger 
                  value="karma"
                  className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Karma
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="biometric">
                <AgasthyaScanner />
              </TabsContent>
              
              <TabsContent value="truth">
                {prediction.kandam6Result && (
                  <ShatruDoshaGauge result={prediction.kandam6Result} />
                )}
              </TabsContent>
              
              <TabsContent value="occult">
                {prediction.kandam6Result && (
                  <OccultScanner result={prediction.kandam6Result} />
                )}
              </TabsContent>
              
              <TabsContent value="reunion">
                {prediction.kandam7_12Result && (
                  <ReunionTimelineView result={prediction.kandam7_12Result} />
                )}
              </TabsContent>
              
              <TabsContent value="karma">
                {prediction.kandam13Result && (
                  <KarmaAnalysis result={prediction.kandam13Result} />
                )}
              </TabsContent>
            </Tabs>
            
            {/* Overall Verdict */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8"
            >
              <Card className="bg-black/60 backdrop-blur-xl border border-amber-500/30 p-6">
                <h3 className="text-lg font-bold text-amber-400 mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  NADI VERDICT
                </h3>
                <p className="text-amber-300/80 font-mono text-sm leading-relaxed">
                  {prediction.overallVerdict}
                </p>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Karma Analysis Component
interface KarmaAnalysisProps {
  result: PastLifeKarma;
}

const KarmaAnalysis: React.FC<KarmaAnalysisProps> = ({ result }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-black/60 backdrop-blur-xl border border-indigo-500/30 p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-transparent to-blue-900/20" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-8 h-8 text-indigo-400" />
            <div>
              <h3 className="text-xl font-bold text-indigo-400">
                SHANTI KANDAM - KARMIC ANALYSIS
              </h3>
              <p className="text-xs text-indigo-300/60 font-mono">
                KANDAM 13 • PAST LIFE & REMEDIATION
              </p>
            </div>
          </div>
          
          {/* Primary Karmic Debt */}
          <div className="mb-6 p-4 bg-indigo-900/30 rounded-lg border border-indigo-500/30">
            <h4 className="text-indigo-400 font-semibold mb-2">PRIMARY KARMIC DEBT</h4>
            <p className="text-indigo-300/80">{result.primaryKarmicDebt}</p>
          </div>
          
          {/* Secondary Karma */}
          {result.secondaryKarma.length > 0 && (
            <div className="mb-6">
              <h4 className="text-indigo-400 font-semibold mb-3">SECONDARY KARMA</h4>
              <div className="space-y-2">
                {result.secondaryKarma.map((karma, i) => (
                  <div key={i} className="text-sm text-indigo-300/70 bg-indigo-900/20 rounded px-3 py-2">
                    {karma}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Ancestral Curse */}
          {result.ancestralCurse.detected && (
            <div className="mb-6 p-4 bg-red-900/30 rounded-lg border border-red-500/30">
              <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                ANCESTRAL CURSE DETECTED
              </h4>
              <div className="text-sm text-red-300/80 space-y-1">
                <p>Type: {result.ancestralCurse.type}</p>
                <p>Origin: {result.ancestralCurse.origin}</p>
                <p>Generations Affected: {result.ancestralCurse.generationsAffected}</p>
              </div>
            </div>
          )}
          
          {/* Pariharams */}
          <div className="mb-6">
            <h4 className="text-indigo-400 font-semibold mb-3">RECOMMENDED PARIHARAMS</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.pariharams.map((pariharam, i) => (
                <div key={i} className="bg-indigo-900/20 rounded-lg p-4 border border-indigo-500/20">
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-semibold text-indigo-300">{pariharam.name}</h5>
                    <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded">
                      {pariharam.effectiveness}% Effective
                    </span>
                  </div>
                  <p className="text-xs text-indigo-300/60 mb-2">{pariharam.description}</p>
                  <p className="text-xs text-indigo-300/80">Timing: {pariharam.timing}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Temple Remedies */}
          <div className="mb-6">
            <h4 className="text-indigo-400 font-semibold mb-3">TEMPLE REMEDIES</h4>
            <div className="space-y-3">
              {result.templeRemedies.slice(0, 2).map((temple, i) => (
                <div key={i} className="bg-indigo-900/20 rounded-lg p-4 border border-indigo-500/20">
                  <h5 className="font-semibold text-indigo-300 mb-1">{temple.templeName}</h5>
                  <p className="text-xs text-indigo-300/60">Deity: {temple.deity}</p>
                  <p className="text-xs text-indigo-300/80 mt-1">Benefit: {temple.benefit}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Mantras */}
          <div className="p-4 bg-gradient-to-r from-indigo-900/40 to-blue-900/40 rounded-lg border border-indigo-500/20">
            <h4 className="text-sm font-semibold text-indigo-400 mb-3">PRESCRIBED MANTRAS</h4>
            <div className="space-y-2">
              {result.mantras.map((mantra, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-indigo-300/80">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  {mantra}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default AgasthyaVision;
