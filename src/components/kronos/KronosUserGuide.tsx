/**
 * KRONOS USER GUIDE - Comprehensive Manual & Interactive Tutorial
 * Rich design-centric experience for understanding temporal patterns
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  Sparkles,
  Moon,
  Sun,
  Star,
  Zap,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Target,
  Compass,
  Waves,
  RefreshCw,
  Calendar,
  TrendingUp,
  Heart,
  Shield,
  Eye,
  Lightbulb,
  ArrowUpRight,
  Download,
  LayoutGrid
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// GUIDE SECTIONS DATA
// ═══════════════════════════════════════════════════════════════════════════════

interface GuideSection {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  content: React.ReactNode;
}

const CycleDiagram: React.FC = () => (
  <div className="relative w-full max-w-md mx-auto py-8">
    {/* Central Hub */}
    <motion.div
      className="relative mx-auto w-48 h-48"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Outer Ring - 33-Year Metonic */}
      <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-spin-slow">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Badge className="bg-purple-500/20 text-purple-400 text-[10px] px-1.5">33yr</Badge>
        </div>
      </div>
      
      {/* Middle Ring - 18-Year Nodal */}
      <div className="absolute inset-4 rounded-full border-2 border-red-500/30" style={{ animation: 'spin 20s linear infinite reverse' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Badge className="bg-red-500/20 text-red-400 text-[10px] px-1.5">18yr</Badge>
        </div>
      </div>
      
      {/* Inner Ring - 12-Year Jupiter */}
      <div className="absolute inset-8 rounded-full border-2 border-yellow-500/30" style={{ animation: 'spin 15s linear infinite' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px] px-1.5">12yr</Badge>
        </div>
      </div>
      
      {/* Core - 8-Year Octennial */}
      <div className="absolute inset-12 rounded-full border-2 border-blue-500/30" style={{ animation: 'spin 10s linear infinite reverse' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Badge className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5">8yr</Badge>
        </div>
      </div>
      
      {/* Center */}
      <div 
        className="absolute inset-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center border border-primary animate-gpu-pulse-scale"
      >
        <span className="text-xs font-bold text-primary">YOU</span>
      </div>
    </motion.div>
    
    {/* Legend */}
    <div className="mt-6 grid grid-cols-2 gap-2 text-xs">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-purple-500/50" />
        <span className="text-muted-foreground">33-Year Metonic (Dark)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500/50" />
        <span className="text-muted-foreground">18-Year Nodal (Karmic)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
        <span className="text-muted-foreground">12-Year Jupiter (Growth)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-blue-500/50" />
        <span className="text-muted-foreground">8-Year Octennial (Shift)</span>
      </div>
    </div>
  </div>
);

const TriquetraDiagram: React.FC = () => (
  <div className="relative w-full max-w-sm mx-auto py-6">
    <svg viewBox="0 0 200 180" className="w-full h-auto">
      {/* Triquetra paths */}
      <defs>
        <linearGradient id="pastGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="presentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="futureGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      
      {/* Connecting arcs */}
      <motion.path
        d="M 40 130 Q 100 40 160 130"
        stroke="url(#presentGrad)"
        strokeWidth="2"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5 }}
      />
      <motion.path
        d="M 160 130 Q 190 90 100 20"
        stroke="url(#futureGrad)"
        strokeWidth="2"
        fill="none"
        strokeDasharray="4 2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, delay: 0.3 }}
      />
      <motion.path
        d="M 100 20 Q 10 90 40 130"
        stroke="url(#pastGrad)"
        strokeWidth="2"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, delay: 0.6 }}
      />
      
      {/* PAST Node */}
      <motion.g
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8 }}
      >
        <circle cx="40" cy="130" r="25" fill="hsl(var(--muted))" stroke="hsl(var(--muted-foreground))" strokeWidth="1" />
        <text x="40" y="125" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8" fontWeight="bold">PAST</text>
        <text x="40" y="137" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="7">-12 years</text>
      </motion.g>
      
      {/* PRESENT Node */}
      <motion.g
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
      >
        <circle cx="100" cy="90" r="30" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth="2" />
        <text x="100" y="85" textAnchor="middle" fill="hsl(var(--primary))" fontSize="9" fontWeight="bold">NOW</text>
        <text x="100" y="98" textAnchor="middle" fill="hsl(var(--primary))" fontSize="7">{new Date().getFullYear()}</text>
      </motion.g>
      
      {/* FUTURE Node */}
      <motion.g
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2 }}
      >
        <circle cx="160" cy="130" r="25" fill="rgba(245, 158, 11, 0.1)" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 2" />
        <text x="160" y="125" textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="bold">FUTURE</text>
        <text x="160" y="137" textAnchor="middle" fill="#f59e0b" fontSize="7">+12 years</text>
      </motion.g>
    </svg>
    
    <div className="text-center mt-4">
      <p className="text-xs text-muted-foreground">
        The Triquetra connects your past experiences to present moments and future possibilities
      </p>
    </div>
  </div>
);

const LifePhaseDiagram: React.FC = () => {
  const phases = [
    { name: 'Moon', ages: '0-7', theme: 'Foundation', color: 'bg-slate-400' },
    { name: 'Mercury', ages: '7-14', theme: 'Learning', color: 'bg-emerald-400' },
    { name: 'Venus', ages: '14-21', theme: 'Identity', color: 'bg-pink-400' },
    { name: 'Sun', ages: '21-28', theme: 'Authority', color: 'bg-yellow-400' },
    { name: 'Mars', ages: '28-35', theme: 'Action', color: 'bg-red-400' },
    { name: 'Jupiter', ages: '35-48', theme: 'Wisdom', color: 'bg-orange-400' },
    { name: 'Saturn', ages: '48-60', theme: 'Mastery', color: 'bg-indigo-400' },
    { name: 'Rahu', ages: '60-72', theme: 'Liberation', color: 'bg-violet-400' },
    { name: 'Ketu', ages: '72+', theme: 'Transcendence', color: 'bg-purple-400' },
  ];

  return (
    <div className="w-full py-4">
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-400 via-primary to-purple-400" />
        
        {/* Phase Items */}
        <div className="space-y-3">
          {phases.map((phase, index) => (
            <motion.div
              key={phase.name}
              className="flex items-center gap-3 pl-8 relative"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {/* Node */}
              <div className={`absolute left-2.5 w-3 h-3 rounded-full ${phase.color} border-2 border-background`} />
              
              {/* Content */}
              <div className="flex-1 flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/30 border border-border/30">
                <div>
                  <span className="text-xs font-medium">{phase.name} Phase</span>
                  <span className="text-[10px] text-muted-foreground ml-2">({phase.ages})</span>
                </div>
                <Badge variant="outline" className="text-[10px]">{phase.theme}</Badge>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN GUIDE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const KronosUserGuide: React.FC = () => {
  const [currentSection, setCurrentSection] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const sections: GuideSection[] = [
    {
      id: 'intro',
      title: 'Welcome to Kronos',
      subtitle: 'The Wormhole Warning System',
      icon: <Clock className="w-5 h-5" />,
      color: 'from-primary/20 to-purple-500/20',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Kronos</strong> is your personal temporal radar — 
            a fractal time engine that reveals the hidden patterns connecting your past, present, and future.
          </p>
          
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              The Core Insight
            </h4>
            <p className="text-xs text-muted-foreground">
              "Time is circular, not linear. What happened 12 years ago shapes today. 
              What happens today echoes in 12 years. Kronos tracks these loops."
            </p>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <Moon className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <span className="text-[10px] font-medium">Past Echoes</span>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/30">
              <Sun className="w-6 h-6 mx-auto mb-2 text-primary" />
              <span className="text-[10px] font-medium">Present Focus</span>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <Star className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <span className="text-[10px] font-medium">Future Seeds</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'cycles',
      title: 'The Four Cycles',
      subtitle: 'Understanding Time Loops',
      icon: <RefreshCw className="w-5 h-5" />,
      color: 'from-purple-500/20 to-blue-500/20',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Kronos tracks four major temporal cycles that create "echoes" across your timeline:
          </p>
          
          <CycleDiagram />
          
          <div className="space-y-3 mt-4">
            <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-sm font-medium text-purple-400">33-Year Metonic Cycle</span>
              </div>
              <p className="text-xs text-muted-foreground pl-5">
                The "Dark" pattern. Solar and lunar calendars sync every 33 years. 
                Major life restructuring events repeat.
              </p>
            </div>
            
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm font-medium text-red-400">18-Year Nodal Cycle</span>
              </div>
              <p className="text-xs text-muted-foreground pl-5">
                Karmic returns. Lunar nodes complete a full cycle, bringing destiny-shifting events.
              </p>
            </div>
            
            <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm font-medium text-yellow-400">12-Year Jupiter Cycle</span>
              </div>
              <p className="text-xs text-muted-foreground pl-5">
                Expansion and growth. Jupiter returns to your birth position, triggering opportunities.
              </p>
            </div>
            
            <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm font-medium text-blue-400">8-Year Octennial Cycle</span>
              </div>
              <p className="text-xs text-muted-foreground pl-5">
                Environmental shifts. Economic and personal patterns echo every 8 years.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'triquetra',
      title: 'The Triquetra View',
      subtitle: 'Past-Present-Future Navigation',
      icon: <Compass className="w-5 h-5" />,
      color: 'from-blue-500/20 to-cyan-500/20',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Temporal Radar displays your timeline as a <strong>Triquetra</strong> — 
            three interconnected nodes showing how your past, present, and future are linked.
          </p>
          
          <TriquetraDiagram />
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">How to Read the Triquetra:</h4>
            <ul className="text-xs text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <Moon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <span><strong>PAST Node:</strong> Shows events from 12 years ago that are echoing now. Review what happened then to understand current patterns.</span>
              </li>
              <li className="flex items-start gap-2">
                <Sun className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <span><strong>PRESENT Node:</strong> Your current position. Zoe analyzes active cycles and generates warnings for this moment.</span>
              </li>
              <li className="flex items-start gap-2">
                <Star className="w-4 h-4 mt-0.5 text-yellow-500 shrink-0" />
                <span><strong>FUTURE Node:</strong> Shows what themes will echo in 12 years. Current actions seed future experiences.</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'warnings',
      title: 'Warning System',
      subtitle: 'Understanding Alerts',
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'from-orange-500/20 to-red-500/20',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Kronos generates <strong>Wormhole Warnings</strong> when temporal patterns indicate 
            significant events approaching. Each warning level requires different action.
          </p>
          
          <div className="space-y-3">
            <div className="p-3 rounded-lg border-2 border-green-500/50 bg-green-500/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-500">CLEAR</span>
                <Badge className="bg-green-500/20 text-green-500">Stable</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                No active cycle convergence. Timeline is stable. Good time for new initiatives.
              </p>
            </div>
            
            <div className="p-3 rounded-lg border-2 border-yellow-500/50 bg-yellow-500/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-yellow-500">CAUTION</span>
                <Badge className="bg-yellow-500/20 text-yellow-500">Monitor</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Single cycle active. Pay attention to themes from past echoes. Proceed with awareness.
              </p>
            </div>
            
            <div className="p-3 rounded-lg border-2 border-orange-500/50 bg-orange-500/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-orange-500">WARNING</span>
                <Badge className="bg-orange-500/20 text-orange-500">Prepare</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Multiple cycles converging. Significant life changes likely. Prepare for transformation.
              </p>
            </div>
            
            <div className="p-3 rounded-lg border-2 border-red-500/50 bg-red-500/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-500">CRITICAL</span>
                <Badge className="bg-red-500/20 text-red-500">Act Now</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Major cycle convergence (Saturn Return, etc.). Life-defining period. Focus on foundations.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'phases',
      title: 'Life Phases',
      subtitle: 'Your Planetary Timeline',
      icon: <Calendar className="w-5 h-5" />,
      color: 'from-indigo-500/20 to-violet-500/20',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Kronos maps your life into <strong>nine planetary phases</strong>, each with unique themes and lessons.
            Understanding your current phase helps you align with natural life rhythms.
          </p>
          
          <LifePhaseDiagram />
          
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <h4 className="text-xs font-medium mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              How Phases Work
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Each phase is ruled by a planetary energy that shapes your focus. 
              When you're in a <strong>Mars Phase</strong> (28-35), action and achievement dominate. 
              In a <strong>Saturn Phase</strong> (48-60), mastery and legacy become central. 
              Zoe tracks your phase and adjusts guidance accordingly.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'timetravel',
      title: 'Time Travel Mode',
      subtitle: 'Exploring Past & Future',
      icon: <Waves className="w-5 h-5" />,
      color: 'from-amber-500/20 to-orange-500/20',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Kronos includes a <strong>Memory Mode</strong> that lets you explore your timeline 
            from any year between 1900-2100.
          </p>
          
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30">
            <h4 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              How to Time Travel
            </h4>
            <ol className="text-xs text-muted-foreground space-y-2 list-decimal pl-4">
              <li>Locate the <strong>Jump to year</strong> input at the top of the Temporal Radar</li>
              <li>Enter any year (e.g., 2014 to explore what was happening 12 years ago)</li>
              <li>Click <strong>Jump</strong> or press Enter</li>
              <li>The entire radar recalculates around that year</li>
              <li>Click <strong>Return to [current year]</strong> to come back</li>
            </ol>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <span className="text-2xl">🔙</span>
              <p className="text-[10px] mt-1 text-muted-foreground">Jump to past years to understand echo origins</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <span className="text-2xl">🔜</span>
              <p className="text-[10px] mt-1 text-muted-foreground">Jump to future years to preview upcoming patterns</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'actions',
      title: 'Taking Action',
      subtitle: 'Using Kronos Insights',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'from-green-500/20 to-emerald-500/20',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Kronos isn't just about knowing — it's about <strong>acting wisely</strong>. 
            Here's how to use temporal insights:
          </p>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Eye className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="text-xs font-medium mb-1">1. Observe Patterns</h4>
                <p className="text-[10px] text-muted-foreground">
                  When Zoe shows an echo, recall what happened in that past year. 
                  What themes dominated? What mistakes were made?
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="text-xs font-medium mb-1">2. Prepare Defenses</h4>
                <p className="text-[10px] text-muted-foreground">
                  If a warning is active, shore up the areas of life that were vulnerable before. 
                  Financial? Relationship? Health?
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Heart className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="text-xs font-medium mb-1">3. Seed Wisely</h4>
                <p className="text-[10px] text-muted-foreground">
                  Remember: today's actions echo in 12 years. 
                  Choose actions that your future self will thank you for.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="text-xs font-medium mb-1">4. Trust Zoe's Guidance</h4>
                <p className="text-[10px] text-muted-foreground">
                  Read the "Zoe Temporal Analysis" at the bottom of each reading. 
                  It synthesizes all patterns into actionable insight.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const nextSection = () => setCurrentSection((prev) => Math.min(prev + 1, sections.length - 1));
  const prevSection = () => setCurrentSection((prev) => Math.max(prev - 1, 0));
  const goToSection = (index: number) => setCurrentSection(index);

  const currentContent = sections[currentSection];

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-xl overflow-hidden">
      <CardHeader className="pb-2 border-b border-border/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Kronos User Guide
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
            <LayoutGrid className="w-3 h-3 ml-1" />
          </Button>
        </div>
        
        {/* Section Navigation Dots */}
        <div className="flex items-center justify-center gap-2 mt-3">
          {sections.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSection(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSection 
                  ? 'bg-primary w-6' 
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentContent.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Section Header */}
            <div className={`p-4 rounded-xl mb-4 bg-gradient-to-r ${currentContent.color} border border-border/20`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-background/50 flex items-center justify-center">
                  {currentContent.icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold">{currentContent.title}</h3>
                  <p className="text-xs text-muted-foreground">{currentContent.subtitle}</p>
                </div>
              </div>
            </div>

            {/* Section Content */}
            <ScrollArea className={isExpanded ? 'h-[500px]' : 'h-[350px]'}>
              <div className="pr-4">
                {currentContent.content}
              </div>
            </ScrollArea>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={prevSection}
            disabled={currentSection === 0}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          
          <span className="text-xs text-muted-foreground">
            {currentSection + 1} / {sections.length}
          </span>
          
          <Button
            variant={currentSection === sections.length - 1 ? 'default' : 'ghost'}
            size="sm"
            onClick={nextSection}
            disabled={currentSection === sections.length - 1}
            className="gap-1"
          >
            {currentSection === sections.length - 1 ? 'Complete' : 'Next'}
            {currentSection < sections.length - 1 && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default KronosUserGuide;
