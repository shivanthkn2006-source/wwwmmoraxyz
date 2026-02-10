// ═══════════════════════════════════════════════════════════════════════════════
// TEMPORAL RADAR - The Dark Cycle Triquetra UI
// Visual representation of Past-Present-Future cycles with warning system
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Clock, 
  AlertTriangle, 
  Zap, 
  RefreshCw,
  Sparkles,
  Moon,
  Sun,
  Star,
  Rewind,
  RotateCcw,
  User,
  Eye,
  ChevronDown,
  HelpCircle
} from 'lucide-react';
import { useTemporalRadar } from '@/hooks/useTemporalRadar';
import { Skeleton } from '@/components/ui/skeleton';
import KronosExplorer from './KronosExplorer';

// ═══════════════════════════════════════════════════════════════════════════════
// PLANETARY INTERPRETATIONS (The "Why")
// ═══════════════════════════════════════════════════════════════════════════════

interface CycleDecoding {
  planetaryShift: string;
  realWorldEffect: string;
  verificationQuestion: string;
}

const getCycleDecoding = (cycleType: string, year: number): CycleDecoding => {
  const decodings: Record<string, CycleDecoding> = {
    'jupiter_12': {
      planetaryShift: `In ${year}, Jupiter returned to your natal position`,
      realWorldEffect: 'This typically triggers: A new opportunity, expansion in career, or philosophical awakening',
      verificationQuestion: `Did you experience significant growth or a new beginning around ${year}?`
    },
    'metonic_33': {
      planetaryShift: `In ${year}, the Sun-Moon alignment matched your birth exactly (33-year Metonic cycle)`,
      realWorldEffect: 'This triggers: A cosmic "reset" - patterns from 33 years ago resurface for resolution',
      verificationQuestion: `Did major themes from ${year - 33} repeat or resolve in ${year}?`
    },
    'nodal_18': {
      planetaryShift: `In ${year}, the Lunar Nodes returned to your birth axis (18.6-year cycle)`,
      realWorldEffect: 'This triggers: Karmic crossroads, destiny shifts, major life direction changes',
      verificationQuestion: `Did you face a major life decision or direction change around ${year}?`
    },
    'saturn_29': {
      planetaryShift: `In ${year}, Saturn returned to its natal position (29.5-year cycle)`,
      realWorldEffect: 'This triggers: Maturation, taking on responsibility, endings of one life chapter',
      verificationQuestion: `Did you experience a major "growing up" moment or life restructuring in ${year}?`
    },
    'octennial_8': {
      planetaryShift: `In ${year}, the 8-year Venus cycle completed`,
      realWorldEffect: 'This triggers: Relationship patterns repeat, financial themes resurface',
      verificationQuestion: `Did relationship or financial patterns from ${year - 8} reappear in ${year}?`
    }
  };
  return decodings[cycleType] || {
    planetaryShift: `Cycle active in ${year}`,
    realWorldEffect: 'Cosmic energies in flux',
    verificationQuestion: 'What significant events occurred during this time?'
  };
};

type RadarMode = 'my-timeline' | 'check-other';

const TemporalRadar: React.FC = () => {
  const [mode, setMode] = useState<RadarMode>('my-timeline');
  const {
    reading,
    pastNode,
    presentNode,
    futureNode,
    activeEchoes,
    currentWarning,
    warningLevel,
    isLoading,
    error,
    refreshReading,
    selectedYear,
    isTimeTravel,
    jumpToYear,
    returnToPresent
  } = useTemporalRadar();

  const [yearInput, setYearInput] = useState<string>('');
  const currentYear = new Date().getFullYear();

  const handleJumpToYear = () => {
    const year = parseInt(yearInput, 10);
    if (year >= 1900 && year <= 2100) {
      jumpToYear(year);
      setYearInput('');
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-12">
            <div className="relative w-64 h-64">
              <Skeleton className="absolute inset-0 rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-card/50 backdrop-blur-xl">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Temporal Radar Offline</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!reading) return null;

  const getWarningColor = () => {
    switch (warningLevel) {
      case 'critical': return 'text-red-500 border-red-500/50 bg-red-500/10';
      case 'warning': return 'text-orange-500 border-orange-500/50 bg-orange-500/10';
      case 'caution': return 'text-yellow-500 border-yellow-500/50 bg-yellow-500/10';
      default: return 'text-green-500 border-green-500/50 bg-green-500/10';
    }
  };

  const getNodeIcon = (position: 'past' | 'present' | 'future') => {
    switch (position) {
      case 'past': return <Moon className="w-5 h-5" />;
      case 'present': return <Sun className="w-5 h-5" />;
      case 'future': return <Star className="w-5 h-5" />;
    }
  };

  return (
    <Card className={`border-border/50 backdrop-blur-xl overflow-hidden transition-all duration-500 ${
      isTimeTravel ? 'bg-amber-950/30 border-amber-500/30' : 'bg-card/50'
    }`}>
      <CardHeader className="pb-2">
        {/* Mode Toggle - MY TIMELINE | CHECK OTHER */}
        <div className="mb-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as RadarMode)}>
            <TabsList className="w-full grid grid-cols-2 bg-muted/30">
              <TabsTrigger 
                value="my-timeline"
                className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">MY TIMELINE</span>
                <span className="sm:hidden">MINE</span>
              </TabsTrigger>
              <TabsTrigger 
                value="check-other"
                className="gap-2 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">CHECK OTHER</span>
                <span className="sm:hidden">EXPLORE</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Show header only in my-timeline mode */}
        {mode === 'my-timeline' && (
        <>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className={`w-5 h-5 ${isTimeTravel ? 'text-amber-400' : 'text-primary'}`} />
            Temporal Radar
            {isTimeTravel && (
              <Badge variant="outline" className="ml-2 text-amber-400 border-amber-400/50 bg-amber-400/10 animate-pulse">
                Memory Mode: {selectedYear}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getWarningColor()}>
              {warningLevel.toUpperCase()}
            </Badge>
            <Button variant="ghost" size="icon" onClick={refreshReading}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Time Travel Controls */}
        <motion.div 
          className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="relative flex-1 max-w-[160px]">
            <Rewind className={`absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 ${
              isTimeTravel ? 'text-amber-400' : 'text-muted-foreground'
            }`} />
            <Input
              type="number"
              placeholder="Jump to year..."
              value={yearInput}
              onChange={(e) => setYearInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJumpToYear()}
              className={`pl-8 h-8 text-sm ${
                isTimeTravel 
                  ? 'bg-amber-950/50 border-amber-500/30 placeholder:text-amber-400/50' 
                  : 'bg-muted/30 border-border/50'
              }`}
              min={1900}
              max={2100}
            />
          </div>
          <Button 
            size="sm" 
            onClick={handleJumpToYear}
            disabled={!yearInput}
            className={isTimeTravel ? 'bg-amber-600 hover:bg-amber-700' : ''}
          >
            Jump
          </Button>
          <AnimatePresence>
            {isTimeTravel && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={returnToPresent}
                  className="gap-1 border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                >
                  <RotateCcw className="w-3 h-3" />
                  Return to {currentYear}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        </>
        )}
      </CardHeader>

      {/* Conditional Content Based on Mode */}
      {mode === 'check-other' ? (
        <CardContent className="pt-2">
          <KronosExplorer />
        </CardContent>
      ) : (
      <CardContent className="space-y-6">
        {/* Warning Alert */}
        {currentWarning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert className={`border ${getWarningColor()}`}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{currentWarning.title}</AlertTitle>
              <AlertDescription className="text-sm">
                {currentWarning.message}
                <ul className="mt-2 space-y-1 text-xs opacity-80">
                  {currentWarning.actionRequired.map((action, i) => (
                    <li key={i}>• {action}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Triquetra Visualization */}
        <div className="relative flex justify-center py-8">
          <div className="relative w-72 h-72">
            {/* Central Circle - Present/Selected Year */}
            <div
              className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 flex items-center justify-center animate-gpu-pulse-scale-slow ${
                isTimeTravel 
                  ? 'border-amber-500 bg-amber-500/20' 
                  : 'border-primary bg-primary/10'
              }`}
            >
              <div className="text-center">
                <Sun className={`w-6 h-6 mx-auto ${isTimeTravel ? 'text-amber-400' : 'text-primary'}`} />
                <span className="text-xs font-medium">
                  {isTimeTravel ? selectedYear : 'TODAY'}
                </span>
              </div>
            </div>

            {/* Past Node - Top Left */}
            <motion.div
              className="absolute top-0 left-0 w-20 h-20 rounded-full border border-muted-foreground/30 bg-muted/20 flex items-center justify-center cursor-pointer hover:bg-muted/40 transition-colors"
              whileHover={{ scale: 1.1 }}
            >
              <div className="text-center">
                <Moon className={`w-5 h-5 mx-auto ${isTimeTravel ? 'text-amber-300/70' : 'text-muted-foreground'}`} />
                <span className={`text-[10px] ${isTimeTravel ? 'text-amber-300/70' : 'text-muted-foreground'}`}>{selectedYear - 12}</span>
              </div>
            </motion.div>

            {/* Future Node - Top Right */}
            <motion.div
              className="absolute top-0 right-0 w-20 h-20 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors"
              whileHover={{ scale: 1.1 }}
            >
              <div className="text-center">
                <Star className={`w-5 h-5 mx-auto ${isTimeTravel ? 'text-amber-400' : 'text-primary'}`} />
                <span className={`text-[10px] ${isTimeTravel ? 'text-amber-400' : 'text-primary'}`}>{selectedYear + 12}</span>
              </div>
            </motion.div>

            {/* Connecting Lines - Triquetra Pattern */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 288 288">
              {/* Past to Present */}
              <motion.path
                d="M 60 60 Q 144 100 144 144"
                stroke="currentColor"
                strokeWidth="1"
                fill="none"
                className="text-muted-foreground/30"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5 }}
              />
              {/* Present to Future */}
              <motion.path
                d="M 144 144 Q 144 100 228 60"
                stroke="currentColor"
                strokeWidth="1"
                fill="none"
                className="text-primary/50"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: 0.5 }}
              />
              {/* Future to Past (completing the triquetra) */}
              <motion.path
                d="M 228 60 Q 144 20 60 60"
                stroke="currentColor"
                strokeWidth="1"
                fill="none"
                className="text-muted-foreground/20"
                strokeDasharray="4 4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: 1 }}
              />
            </svg>

            {/* Active Echoes Indicators - CSS animation */}
            {activeEchoes.length > 0 && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex items-center gap-1 animate-gpu-pulse-opacity">
                {activeEchoes.slice(0, 3).map((echo, i) => (
                  <div
                    key={echo.id}
                    className={`w-3 h-3 rounded-full ${
                      echo.cycleType === 'metonic_33' ? 'bg-purple-500' :
                      echo.cycleType === 'jupiter_12' ? 'bg-yellow-500' :
                      echo.cycleType === 'nodal_18' ? 'bg-red-500' :
                      'bg-blue-500'
                    }`}
                    title={echo.description}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Node Details */}
        <div className="grid grid-cols-3 gap-3">
          {[pastNode, presentNode, futureNode].map((node, i) => node && (
            <motion.div
              key={node.position}
              className={`p-3 rounded-lg border ${
                node.position === 'present' ? 'border-primary/50 bg-primary/5' : 'border-border/50 bg-muted/20'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-center gap-2 mb-2">
                {getNodeIcon(node.position)}
                <span className="text-xs font-medium capitalize">{node.position}</span>
              </div>
              <p className="text-[10px] text-muted-foreground line-clamp-2">
                {node.events[0]}
              </p>
            </motion.div>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* CYCLE DECODER - Deep Analysis Section (The "Why") */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeEchoes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="deep-analysis" className={`border rounded-lg ${
                isTimeTravel ? 'border-amber-500/30 bg-amber-950/20' : 'border-primary/30 bg-primary/5'
              }`}>
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <HelpCircle className={`w-4 h-4 ${isTimeTravel ? 'text-amber-400' : 'text-primary'}`} />
                    <span className="text-sm font-medium">Cycle Decoder - The "Why"</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4">
                    {activeEchoes.slice(0, 3).map((echo) => {
                      const echoYear = echo.echoDate.getFullYear();
                      const decoding = getCycleDecoding(echo.cycleType, echoYear);
                      return (
                        <motion.div
                          key={echo.id}
                          className={`p-3 rounded-lg space-y-2 ${
                            isTimeTravel ? 'bg-amber-900/30 border border-amber-500/20' : 'bg-muted/40 border border-border/30'
                          }`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                        >
                          {/* Planetary Shift */}
                          <div className="flex items-start gap-2">
                            <Star className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                              echo.cycleType === 'jupiter_12' ? 'text-yellow-400' :
                              echo.cycleType === 'metonic_33' ? 'text-purple-400' :
                              echo.cycleType === 'nodal_18' ? 'text-red-400' :
                              'text-blue-400'
                            }`} />
                            <div>
                              <p className={`text-xs font-medium ${isTimeTravel ? 'text-amber-200' : 'text-foreground'}`}>
                                {decoding.planetaryShift}
                              </p>
                            </div>
                          </div>
                          
                          {/* Real World Effect */}
                          <div className="flex items-start gap-2">
                            <Zap className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-400" />
                            <p className="text-xs text-muted-foreground">
                              {decoding.realWorldEffect}
                            </p>
                          </div>
                          
                          {/* Verification Question */}
                          <div className={`mt-2 p-2 rounded border ${
                            isTimeTravel ? 'bg-amber-950/50 border-amber-500/30' : 'bg-primary/10 border-primary/20'
                          }`}>
                            <p className={`text-xs italic ${isTimeTravel ? 'text-amber-300' : 'text-primary'}`}>
                              🔍 {decoding.verificationQuestion}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>
        )}

        {/* Active Echoes List */}
        {activeEchoes.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Active Cycles ({activeEchoes.length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {activeEchoes.map((echo) => (
                <motion.div
                  key={echo.id}
                  className="p-2 rounded-lg bg-muted/30 border border-border/30"
                  whileHover={{ x: 4 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">
                      {echo.cycleType.replace('_', ' ').replace(/(\d+)/g, ' $1-year')}
                    </span>
                    <Badge variant="outline" className={`text-[10px] ${
                      echo.intensity === 'critical' ? 'text-red-500' :
                      echo.intensity === 'high' ? 'text-orange-500' :
                      'text-muted-foreground'
                    }`}>
                      {echo.intensity}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {echo.wormholeWarning}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Zoe Analysis */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium">Zoe Temporal Analysis</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {reading.zoeAnalysis}
          </p>
        </div>
      </CardContent>
      )}
    </Card>
  );
};

export default TemporalRadar;
