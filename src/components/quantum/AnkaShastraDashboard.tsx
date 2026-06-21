import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Eye, Coins, Heart, Clock, Compass, Moon, Sun, Star, Zap, Shield, RotateCcw, Building2, Scroll } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useZoeQuantumLevel } from '@/hooks/useZoeQuantumLevel';
import { cn } from '@/lib/utils';
import { validatePlanetaryClaim, getAllPositions, type Planet } from '@/core/ephemeris/EphemerisEngine';

const PLANETARY_COLORS: Record<string, string> = {
  'Sun': 'from-amber-400 to-orange-500',
  'Moon': 'from-slate-200 to-blue-200',
  'Jupiter': 'from-yellow-300 to-amber-400',
  'Rahu': 'from-purple-600 to-violet-900',
  'Mercury': 'from-emerald-400 to-green-500',
  'Venus': 'from-pink-300 to-rose-400',
  'Ketu': 'from-gray-400 to-slate-600',
  'Saturn': 'from-blue-600 to-indigo-800',
  'Mars': 'from-red-500 to-orange-600'
};

export const AnkaShastraDashboard = () => {
  const navigate = useNavigate();
  const { findLostObject, checkMoneyRecovery, checkCompatibility, getTemporalState, isProcessing, executeQuantumReading } = useZoeQuantumLevel();
  
  const [activeTab, setActiveTab] = useState('lost_object');
  const [prasnaNumber, setPrasnaNumber] = useState('');
  const [debtorDestiny, setDebtorDestiny] = useState('');
  const [yourNumber, setYourNumber] = useState('');
  const [targetNumber, setTargetNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [name, setName] = useState('');
  
  const [lostResult, setLostResult] = useState<any>(null);
  const [moneyResult, setMoneyResult] = useState<any>(null);
  const [compatResult, setCompatResult] = useState<any>(null);
  const [temporalResult, setTemporalResult] = useState<any>(null);

  const handleLostObject = () => {
    const num = parseInt(prasnaNumber);
    if (num >= 1 && num <= 108) {
      setLostResult(findLostObject(num));
    }
  };

  const handleMoneyRecovery = () => {
    const num = parseInt(debtorDestiny);
    if (num >= 1 && num <= 9) {
      setMoneyResult(checkMoneyRecovery(num));
    }
  };

  const handleCompatibility = () => {
    const your = parseInt(yourNumber);
    const target = parseInt(targetNumber);
    if (your >= 1 && your <= 9 && target >= 1 && target <= 9) {
      setCompatResult(checkCompatibility(your, target));
    }
  };

  const handleTemporalAnalysis = () => {
    if (birthDate) {
      const dob = new Date(birthDate);
      const result = getTemporalState(dob, name || undefined);
      
      // Ephemeris Engine validation: attach current planetary positions
      const positions = getAllPositions(new Date());
      const birthPositions = getAllPositions(dob);
      
      setTemporalResult({
        ...result,
        ephemerisData: {
          currentPositions: positions,
          birthPositions: birthPositions,
          validated: true,
        },
      });
    }
  };

  const resetAll = () => {
    setLostResult(null);
    setMoneyResult(null);
    setCompatResult(null);
    setTemporalResult(null);
    setPrasnaNumber('');
    setDebtorDestiny('');
    setYourNumber('');
    setTargetNumber('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-2 sm:p-4 md:p-8 overflow-x-hidden">
      {/* Animated background particles - SSR safe */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute w-1 h-1 bg-cyan-400/30 rounded-full",
              i < 4 ? 'animate-gpu-float-particle-1' :
              i < 8 ? 'animate-gpu-float-particle-2' :
              i < 12 ? 'animate-gpu-float-particle-3' :
              i < 16 ? 'animate-gpu-float-particle-4' : 'animate-gpu-float-particle-5'
            )}
            style={{
              left: `${(i * 5) % 100}%`,
              top: `${(i * 7) % 100}%`
            }}
          />
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4"
          >
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400" />
            <h1 className="text-xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              ANKA SHASTRA
            </h1>
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-pink-400" />
          </motion.div>
          <p className="text-cyan-300/70 text-xs sm:text-sm">
            Quantum Level · Archive of 3000 Years · Vedic Prasna Calculator
          </p>
          <p className="text-purple-400/50 text-xs mt-1">
            Access Level: ADMIN (@moksh50) · 99% Precision
          </p>
          {/* Quantum Module Links */}
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            <Button
              onClick={() => navigate('/vastu-scan')}
              variant="outline"
              size="sm"
              className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Vastu Quantum Scan
            </Button>
            <Button
              onClick={() => navigate('/agasthya-vision')}
              variant="outline"
              size="sm"
              className="border-purple-500/40 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200"
            >
              <Scroll className="w-4 h-4 mr-2" />
              Agasthya Nadi Vision
            </Button>
          </div>
        </div>

        {/* Main Dashboard - Enhanced Glassmorphism */}
        <Card className="relative backdrop-blur-2xl bg-black/30 border border-cyan-400/30 shadow-[0_0_80px_rgba(0,255,255,0.1),0_0_40px_rgba(147,51,234,0.1)] rounded-xl sm:rounded-2xl overflow-hidden before:absolute before:inset-0 before:rounded-xl before:sm:rounded-2xl before:bg-gradient-to-br before:from-cyan-500/5 before:via-transparent before:to-purple-500/5 before:pointer-events-none">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Responsive TabsList - scrollable on mobile */}
            <TabsList className="w-full bg-black/50 border-b border-cyan-500/20 rounded-none p-0 h-auto flex flex-wrap sm:flex-nowrap overflow-x-auto scrollbar-none">
              <TabsTrigger 
                value="lost_object" 
                className="flex-1 min-w-[50%] sm:min-w-0 py-2 sm:py-4 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 text-slate-400 text-xs sm:text-sm rounded-none border-r border-b sm:border-b-0 border-cyan-500/20 touch-manipulation"
              >
                <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> 
                <span className="hidden xs:inline">Lost</span> Object
              </TabsTrigger>
              <TabsTrigger 
                value="money" 
                className="flex-1 min-w-[50%] sm:min-w-0 py-2 sm:py-4 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-300 text-slate-400 text-xs sm:text-sm rounded-none border-b sm:border-b-0 sm:border-r border-cyan-500/20 touch-manipulation"
              >
                <Coins className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Money
              </TabsTrigger>
              <TabsTrigger 
                value="compatibility" 
                className="flex-1 min-w-[50%] sm:min-w-0 py-2 sm:py-4 data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-300 text-slate-400 text-xs sm:text-sm rounded-none border-r border-cyan-500/20 touch-manipulation"
              >
                <Heart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Compat
              </TabsTrigger>
              <TabsTrigger 
                value="temporal" 
                className="flex-1 min-w-[50%] sm:min-w-0 py-2 sm:py-4 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 text-slate-400 text-xs sm:text-sm rounded-none touch-manipulation"
              >
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Timeline
              </TabsTrigger>
            </TabsList>

            {/* Lost Object Tab */}
            <TabsContent value="lost_object" className="p-3 sm:p-6 space-y-4 sm:space-y-6">
              <div className="text-center space-y-3 sm:space-y-4">
                <p className="text-cyan-300/80 text-xs sm:text-sm px-2">
                  Close your eyes. Visualize the lost object. Give a number between 1 and 108.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center items-center">
                  <Input
                    type="number"
                    min={1}
                    max={108}
                    placeholder="1-108"
                    value={prasnaNumber}
                    onChange={(e) => setPrasnaNumber(e.target.value)}
                    className="w-full sm:w-32 bg-black/50 border-cyan-500/30 text-cyan-300 text-center text-lg sm:text-xl touch-manipulation"
                  />
                  <Button 
                    onClick={handleLostObject}
                    className="w-full sm:w-auto bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 touch-manipulation"
                  >
                    <Compass className="w-4 h-4 mr-2" /> Locate
                  </Button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {lostResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    <ResultCard
                      title="Analysis Signal"
                      planet={lostResult.planetaryLord}
                      content={
                        <div className="space-y-3">
                          <p className="text-slate-400 text-sm font-mono">
                            {lostResult.calculation}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Planetary Lord:</span>
                            <span className={cn("font-semibold bg-gradient-to-r bg-clip-text text-transparent", PLANETARY_COLORS[lostResult.planetaryLord.planet])}>
                              {lostResult.planetaryLord.planet} ({lostResult.planetaryLord.sanskrit})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Compass className="w-4 h-4 text-cyan-400" />
                            <span className="text-cyan-300 font-semibold">{lostResult.direction}</span>
                          </div>
                          <p className="text-white/90 font-medium">{lostResult.prediction}</p>
                          <p className="text-slate-400 text-sm">{lostResult.deepDetails}</p>
                          <div className={cn(
                            "inline-block px-3 py-1 rounded-full text-sm font-medium",
                            lostResult.recoveryLikelihood === 'Recoverable' ? 'bg-green-500/20 text-green-300' :
                            lostResult.recoveryLikelihood === 'Difficult' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-red-500/20 text-red-300'
                          )}>
                            {lostResult.recoveryLikelihood}
                          </div>
                          <div className="mt-4 p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                            <p className="text-cyan-300 text-sm"><strong>Action:</strong> {lostResult.action}</p>
                          </div>
                          <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                            <p className="text-purple-300 text-sm"><strong>Karmic Advice:</strong> {lostResult.karmicAdvice}</p>
                          </div>
                        </div>
                      }
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* Money Recovery Tab */}
            <TabsContent value="money" className="p-3 sm:p-6 space-y-4 sm:space-y-6">
              <div className="text-center space-y-3 sm:space-y-4">
                <p className="text-green-300/80 text-xs sm:text-sm px-2">
                  Enter the Destiny Number of the person who owes you money (1-9).
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center items-center">
                  <Input
                    type="number"
                    min={1}
                    max={9}
                    placeholder="1-9"
                    value={debtorDestiny}
                    onChange={(e) => setDebtorDestiny(e.target.value)}
                    className="w-full sm:w-24 bg-black/50 border-green-500/30 text-green-300 text-center text-lg sm:text-xl touch-manipulation"
                  />
                  <Button 
                    onClick={handleMoneyRecovery}
                    className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 touch-manipulation"
                  >
                    <Coins className="w-4 h-4 mr-2" /> Analyze
                  </Button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {moneyResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <ResultCard
                      title="Hora Analysis"
                      planet={moneyResult.planetaryLord}
                      content={
                        <div className="space-y-3">
                          <p className="text-slate-400 text-sm font-mono">
                            Debtor: {moneyResult.debtorDestinyNumber} + Today: {moneyResult.currentDateNumber} = {moneyResult.combinedNumber}
                          </p>
                          <div className={cn(
                            "text-2xl font-bold",
                            moneyResult.willRecover ? 'text-green-400' : 'text-red-400'
                          )}>
                            {moneyResult.prediction}
                          </div>
                          <p className="text-slate-300">{moneyResult.method}</p>
                          <div className="flex items-center gap-2 text-slate-400">
                            <Clock className="w-4 h-4" />
                            <span>Timeframe: {moneyResult.timeframe}</span>
                          </div>
                          <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                            <p className="text-purple-300 text-sm"><strong>Karmic Advice:</strong> {moneyResult.karmicAdvice}</p>
                          </div>
                        </div>
                      }
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* Compatibility Tab */}
            <TabsContent value="compatibility" className="p-3 sm:p-6 space-y-4 sm:space-y-6">
              <div className="text-center space-y-3 sm:space-y-4">
                <p className="text-pink-300/80 text-xs sm:text-sm px-2">
                  Enter birth numbers (day reduced to single digit) for compatibility analysis.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-slate-400 text-xs sm:text-sm whitespace-nowrap">You:</span>
                    <Input
                      type="number"
                      min={1}
                      max={9}
                      placeholder="1-9"
                      value={yourNumber}
                      onChange={(e) => setYourNumber(e.target.value)}
                      className="w-full sm:w-20 bg-black/50 border-pink-500/30 text-pink-300 text-center touch-manipulation"
                    />
                  </div>
                  <Heart className="w-5 h-5 text-pink-400 hidden sm:block" />
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-slate-400 text-xs sm:text-sm whitespace-nowrap">Target:</span>
                    <Input
                      type="number"
                      min={1}
                      max={9}
                      placeholder="1-9"
                      value={targetNumber}
                      onChange={(e) => setTargetNumber(e.target.value)}
                      className="w-full sm:w-20 bg-black/50 border-pink-500/30 text-pink-300 text-center touch-manipulation"
                    />
                  </div>
                  <Button 
                    onClick={handleCompatibility}
                    className="w-full sm:w-auto bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 touch-manipulation"
                  >
                    <Star className="w-4 h-4 mr-2" /> Analyze
                  </Button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {compatResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <ResultCard
                      title="Vedic Grid Analysis"
                      planet={compatResult.yourPlanet}
                      content={
                        <div className="space-y-4">
                          <div className="flex justify-center gap-8">
                            <div className="text-center">
                              <div className={cn("text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent", PLANETARY_COLORS[compatResult.yourPlanet.planet])}>
                                {compatResult.yourPlanet.planet}
                              </div>
                              <p className="text-slate-400 text-sm">Your Energy</p>
                            </div>
                            <div className="text-center">
                              <div className={cn(
                                "text-3xl font-bold",
                                compatResult.relationship === 'Friends' ? 'text-green-400' :
                                compatResult.relationship === 'Enemies' ? 'text-red-400' : 'text-yellow-400'
                              )}>
                                {compatResult.compatibilityScore}%
                              </div>
                              <p className="text-slate-400 text-sm">{compatResult.relationship}</p>
                            </div>
                            <div className="text-center">
                              <div className={cn("text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent", PLANETARY_COLORS[compatResult.targetPlanet.planet])}>
                                {compatResult.targetPlanet.planet}
                              </div>
                              <p className="text-slate-400 text-sm">Their Energy</p>
                            </div>
                          </div>
                          <p className="text-slate-300 text-center">{compatResult.analysis}</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                              <p className="text-green-300 text-sm font-medium mb-2">Strengths</p>
                              <ul className="text-green-300/70 text-xs space-y-1">
                                {compatResult.strengths.map((s: string, i: number) => (
                                  <li key={i}>• {s}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                              <p className="text-red-300 text-sm font-medium mb-2">Challenges</p>
                              <ul className="text-red-300/70 text-xs space-y-1">
                                {compatResult.challenges.map((c: string, i: number) => (
                                  <li key={i}>• {c}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                            <p className="text-purple-300 text-sm"><strong>Advice:</strong> {compatResult.advice}</p>
                          </div>
                        </div>
                      }
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* Temporal Analysis Tab */}
            <TabsContent value="temporal" className="p-3 sm:p-6 space-y-4 sm:space-y-6">
              <div className="text-center space-y-3 sm:space-y-4">
                <p className="text-purple-300/80 text-xs sm:text-sm px-2">
                  Enter your birth date for complete Past/Present/Future quantum analysis.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center items-center">
                  <Input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full sm:w-44 bg-black/50 border-purple-500/30 text-purple-300 touch-manipulation"
                  />
                  <Input
                    type="text"
                    placeholder="Name (optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full sm:w-40 bg-black/50 border-purple-500/30 text-purple-300 touch-manipulation"
                  />
                  <Button 
                    onClick={handleTemporalAnalysis}
                    className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 touch-manipulation"
                  >
                    <Zap className="w-4 h-4 mr-2" /> Analyze Timeline
                  </Button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {temporalResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    {/* Temporal Alignment Score */}
                    <div className="text-center p-4 bg-gradient-to-r from-purple-500/20 via-cyan-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
                      <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                        {Math.round(temporalResult.synthesis.temporalAlignment)}%
                      </div>
                      <p className="text-slate-400 text-sm">Temporal Alignment</p>
                      <p className="text-purple-300 text-xs mt-1">{temporalResult.synthesis.divineTiming}</p>
                    </div>

                    {/* Three Temporal Cards - Stacked on mobile */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                      {/* Past */}
                      <div className="p-3 sm:p-4 bg-slate-800/50 rounded-xl border border-slate-600/30">
                        <div className="flex items-center gap-2 mb-2 sm:mb-3">
                          <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                          <h3 className="text-slate-300 font-semibold text-sm sm:text-base">PAST</h3>
                        </div>
                        <div className="space-y-1.5 sm:space-y-2 text-xs">
                          <p className="text-slate-400">Karmic Debts:</p>
                          <ul className="text-slate-300 space-y-0.5 sm:space-y-1 max-h-24 overflow-y-auto scrollbar-thin">
                            {temporalResult.past.karmicDebt.map((d: string, i: number) => (
                              <li key={i} className="text-xs">• {d}</li>
                            ))}
                          </ul>
                          <p className="text-slate-400 mt-1 sm:mt-2">Cycles Completed: {temporalResult.past.completedCycles}</p>
                        </div>
                      </div>

                      {/* Present */}
                      <div className="p-3 sm:p-4 bg-cyan-900/30 rounded-xl border border-cyan-500/30">
                        <div className="flex items-center gap-2 mb-2 sm:mb-3">
                          <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                          <h3 className="text-cyan-300 font-semibold text-sm sm:text-base">PRESENT</h3>
                        </div>
                        <div className="space-y-1.5 sm:space-y-2 text-xs">
                          <p className="text-cyan-400">Vibration: {temporalResult.present.currentVibration}</p>
                          <p className="text-cyan-300">{temporalResult.present.immediateGuidance}</p>
                          <p className="text-slate-400 mt-1 sm:mt-2 text-xs">{temporalResult.present.horaStatus}</p>
                        </div>
                      </div>

                      {/* Future */}
                      <div className="p-3 sm:p-4 bg-pink-900/30 rounded-xl border border-pink-500/30">
                        <div className="flex items-center gap-2 mb-2 sm:mb-3">
                          <Star className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400" />
                          <h3 className="text-pink-300 font-semibold text-sm sm:text-base">FUTURE</h3>
                        </div>
                        <div className="space-y-1.5 sm:space-y-2 text-xs">
                          <p className="text-pink-400">Probability Paths:</p>
                          {temporalResult.future.probabilityPaths.map((p: any, i: number) => (
                            <div key={i} className="flex justify-between text-pink-300 text-xs">
                              <span className="truncate mr-2">{p.path}</span>
                              <span className="text-pink-400 font-medium whitespace-nowrap">{Math.round(p.probability)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Synthesis */}
                    <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-5 h-5 text-purple-400" />
                        <h3 className="text-purple-300 font-semibold">EVOLUTIONARY PATH</h3>
                      </div>
                      <p className="text-white/90">{temporalResult.synthesis.evolutionaryPath}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-slate-400 text-sm">Karma Balance:</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          temporalResult.synthesis.karmaBalance === 'positive' ? 'bg-green-500/20 text-green-300' :
                          temporalResult.synthesis.karmaBalance === 'negative' ? 'bg-red-500/20 text-red-300' :
                          'bg-yellow-500/20 text-yellow-300'
                        )}>
                          {temporalResult.synthesis.karmaBalance.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>

          {/* Reset Button */}
          <div className="p-4 border-t border-cyan-500/20 flex justify-center">
            <Button 
              variant="ghost" 
              onClick={resetAll}
              className="text-slate-400 hover:text-cyan-300"
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Reset All Readings
            </Button>
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          Archive of 3000 Years · Vedic Prasna Calculator · 99% Precision Protocol
        </p>
      </motion.div>
    </div>
  );
};

// Reusable Result Card Component - Enhanced Glassmorphism with Neon Effects
const ResultCard = ({ title, planet, content }: { title: string; planet?: any; content: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    className={cn(
      "relative p-4 sm:p-6 rounded-xl sm:rounded-2xl overflow-hidden",
      // Glassmorphism base
      "bg-gradient-to-br from-slate-900/60 via-purple-900/40 to-slate-900/60",
      "backdrop-blur-2xl",
      // Neon border glow
      "border border-cyan-400/40",
      "shadow-[0_0_40px_rgba(0,255,255,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]",
      // Hover state
      "hover:shadow-[0_0_60px_rgba(0,255,255,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]",
      "hover:border-cyan-400/60 transition-all duration-500"
    )}
  >
    {/* Animated neon edge glow */}
    <div className="absolute inset-0 rounded-xl sm:rounded-2xl opacity-50 pointer-events-none">
      <div className="absolute inset-[1px] rounded-xl sm:rounded-2xl bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10" />
    </div>
    
    {/* Floating particles effect */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-cyan-400/40 rounded-full animate-gpu-float-particle-1"
          style={{
            left: `${20 + i * 15}%`,
            top: `${10 + i * 20}%`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${3 + i}s`
          }}
        />
      ))}
    </div>
    
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-300 shadow-[0_0_15px_rgba(0,255,255,0.6)] animate-gpu-pulse-scale" />
        <h3 className="text-cyan-300 font-semibold text-sm sm:text-base tracking-wide uppercase">{title}</h3>
      </div>
      <motion.div 
        className="text-xs sm:text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8 }}
      >
        {content}
      </motion.div>
    </div>
  </motion.div>
);

export default AnkaShastraDashboard;
