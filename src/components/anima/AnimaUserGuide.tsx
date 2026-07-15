/**
 * ANIMA USER GUIDE - Comprehensive Manual & Interactive Tutorial
 * Soul Synergy • Zero-Swipe Matching • Destiny-Based Connections
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Heart,
  Sparkles,
  Shield,
  Eye,
  EyeOff,
  Users,
  Star,
  Zap,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Target,
  Fingerprint,
  Brain,
  Clock,
  Compass,
  Lock,
  Unlock,
  Hash,
  Lightbulb,
  ArrowRight,
  LayoutGrid,
  CircleDot
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMA DIAGRAM COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const SoulVectorDiagram: React.FC = () => (
  <div className="relative w-full max-w-sm mx-auto py-6">
    <motion.div
      className="relative"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Central Soul Core */}
      <div className="relative mx-auto w-48 h-48">
        {/* Outer ring - Behavioral */}
        <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-pulse">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2">
            <Badge className="bg-purple-500/20 text-purple-400 text-[9px] px-1">Behavioral</Badge>
          </div>
        </div>
        
        {/* Middle ring - Numerological */}
        <div className="absolute inset-4 rounded-full border-2 border-pink-500/40">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2">
            <Badge className="bg-pink-500/20 text-pink-400 text-[9px] px-1">Numerological</Badge>
          </div>
        </div>
        
        {/* Inner ring - Temporal */}
        <div className="absolute inset-8 rounded-full border-2 border-blue-500/40">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2">
            <Badge className="bg-blue-500/20 text-blue-400 text-[9px] px-1">Temporal</Badge>
          </div>
        </div>
        
        {/* Core - Karmic */}
        <div className="absolute inset-12 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/40 flex items-center justify-center border-2 border-pink-500 animate-gpu-pulse-scale-slow">
          <div className="text-center">
            <Heart className="w-6 h-6 text-pink-500 mx-auto" />
            <span className="text-[8px] text-pink-400 font-medium">SOUL</span>
          </div>
        </div>
        
        {/* Data points around */}
        <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center animate-gpu-float">
          <Brain className="w-4 h-4 text-purple-400" />
        </div>
        <div 
          className="absolute bottom-2 left-2 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center animate-gpu-float"
          style={{ animationDelay: '500ms' }}
        >
          <Clock className="w-4 h-4 text-blue-400" />
        </div>
        <div 
          className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center animate-gpu-float"
          style={{ animationDelay: '1000ms' }}
        >
          <Hash className="w-4 h-4 text-pink-400" />
        </div>
      </div>
    </motion.div>
    
    <p className="text-center text-xs text-muted-foreground mt-4">
      Your Soul Vector captures multiple dimensions of who you are
    </p>
  </div>
);

const ConnectionTypesDiagram: React.FC = () => {
  const connectionTypes = [
    { 
      type: 'Soulmate', 
      score: '90%+', 
      color: 'pink', 
      icon: Heart,
      description: 'Perfect harmony across all dimensions'
    },
    { 
      type: 'Karmic Partner', 
      score: '80%+', 
      color: 'purple', 
      icon: Zap,
      description: 'Intense lessons, transformative bond'
    },
    { 
      type: 'Mirror Soul', 
      score: '75%+', 
      color: 'blue', 
      icon: Eye,
      description: 'Reflects your true self back to you'
    },
    { 
      type: 'Growth Catalyst', 
      score: '70%+', 
      color: 'green', 
      icon: Star,
      description: 'Accelerates your personal evolution'
    },
    { 
      type: 'Companion', 
      score: '60%+', 
      color: 'slate', 
      icon: Users,
      description: 'Steady, supportive connection'
    },
  ];

  return (
    <div className="w-full py-4 space-y-2">
      {connectionTypes.map((conn, index) => (
        <motion.div
          key={conn.type}
          className={`flex items-center gap-3 p-3 rounded-lg border bg-${conn.color}-500/5 border-${conn.color}-500/30`}
          style={{ 
            backgroundColor: `hsl(var(--${conn.color === 'slate' ? 'muted' : conn.color === 'pink' ? 'primary' : conn.color}-500) / 0.05)`,
            borderColor: `hsl(var(--${conn.color === 'slate' ? 'border' : conn.color === 'pink' ? 'primary' : conn.color}-500) / 0.3)`
          }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center`} style={{
            backgroundColor: conn.color === 'pink' ? 'rgba(236, 72, 153, 0.2)' :
                           conn.color === 'purple' ? 'rgba(168, 85, 247, 0.2)' :
                           conn.color === 'blue' ? 'rgba(59, 130, 246, 0.2)' :
                           conn.color === 'green' ? 'rgba(34, 197, 94, 0.2)' :
                           'rgba(100, 116, 139, 0.2)'
          }}>
            <conn.icon className="w-5 h-5" style={{
              color: conn.color === 'pink' ? 'rgb(236, 72, 153)' :
                     conn.color === 'purple' ? 'rgb(168, 85, 247)' :
                     conn.color === 'blue' ? 'rgb(59, 130, 246)' :
                     conn.color === 'green' ? 'rgb(34, 197, 94)' :
                     'rgb(100, 116, 139)'
            }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{conn.type}</span>
              <Badge variant="outline" className="text-[10px]">{conn.score}</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">{conn.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

const PrivacyFlowDiagram: React.FC = () => (
  <div className="w-full py-6">
    <div className="flex items-center justify-between max-w-xs mx-auto">
      {/* Step 1 - Hidden */}
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
      >
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-2 border border-border">
          <EyeOff className="w-5 h-5 text-muted-foreground" />
        </div>
        <span className="text-[10px] text-muted-foreground">Anonymous</span>
      </motion.div>
      
      {/* Arrow */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
      </motion.div>
      
      {/* Step 2 - Matching */}
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center mx-auto mb-2 border border-pink-500/30 animate-pulse">
          <Sparkles className="w-5 h-5 text-pink-500" />
        </div>
        <span className="text-[10px] text-pink-400">Matching</span>
      </motion.div>
      
      {/* Arrow */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
      </motion.div>
      
      {/* Step 3 - Mutual Reveal */}
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2 border border-green-500/30">
          <Unlock className="w-5 h-5 text-green-500" />
        </div>
        <span className="text-[10px] text-green-400">Revealed</span>
      </motion.div>
    </div>
    
    <p className="text-center text-xs text-muted-foreground mt-4">
      Identities only revealed when <strong>both</strong> users accept the connection
    </p>
  </div>
);

const SynergyBreakdownDiagram: React.FC = () => {
  const dimensions = [
    { name: 'Numerological', value: 85, weight: '20%', desc: 'Core number harmony' },
    { name: 'Behavioral', value: 78, weight: '25%', desc: 'Personality compatibility' },
    { name: 'Temporal', value: 92, weight: '20%', desc: 'Life phase alignment' },
    { name: 'Karmic', value: 70, weight: '20%', desc: 'Shared lessons' },
    { name: 'Complementary', value: 88, weight: '15%', desc: 'Balance factor' },
  ];

  return (
    <div className="w-full py-4 space-y-3">
      {dimensions.map((dim, index) => (
        <motion.div
          key={dim.name}
          className="space-y-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium">{dim.name}</span>
              <Badge variant="outline" className="text-[8px] px-1">{dim.weight}</Badge>
            </div>
            <span className="text-muted-foreground">{dim.value}%</span>
          </div>
          <Progress value={dim.value} className="h-2" />
          <p className="text-[10px] text-muted-foreground">{dim.desc}</p>
        </motion.div>
      ))}
      
      <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Overall Resonance</span>
          <span className="text-xl font-bold text-primary">82.3%</span>
        </div>
      </div>
    </div>
  );
};

const NumerologyDiagram: React.FC = () => (
  <div className="w-full py-4">
    <div className="grid grid-cols-3 gap-4 text-center">
      <motion.div
        className="p-4 rounded-xl bg-gradient-to-br from-pink-500/10 to-pink-500/20 border border-pink-500/30"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0 }}
      >
        <div className="text-3xl font-bold text-pink-500">7</div>
        <div className="text-xs font-medium mt-1">Driver</div>
        <div className="text-[10px] text-muted-foreground mt-1">Birth Day</div>
      </motion.div>
      
      <motion.div
        className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/20 border border-purple-500/30"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="text-3xl font-bold text-purple-500">5</div>
        <div className="text-xs font-medium mt-1">Conductor</div>
        <div className="text-[10px] text-muted-foreground mt-1">Full Date</div>
      </motion.div>
      
      <motion.div
        className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/20 border border-blue-500/30"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="text-3xl font-bold text-blue-500">3</div>
        <div className="text-xs font-medium mt-1">Personal Year</div>
        <div className="text-[10px] text-muted-foreground mt-1">Current Cycle</div>
      </motion.div>
    </div>
    
    <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/30">
      <p className="text-xs text-muted-foreground text-center">
        These three numbers form the foundation of your Soul Vector and determine 
        numerological compatibility with potential connections.
      </p>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// GUIDE SECTION DATA
// ═══════════════════════════════════════════════════════════════════════════════

interface GuideSection {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  content: React.ReactNode;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN GUIDE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const AnimaUserGuide: React.FC = () => {
  const [currentSection, setCurrentSection] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const sections: GuideSection[] = [
    {
      id: 'intro',
      title: 'Welcome to Anima',
      subtitle: 'Zero-Swipe Soul Matching',
      icon: <Heart className="w-5 h-5" />,
      color: 'from-pink-500/20 to-purple-500/20',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Anima</strong> is a revolutionary matching system that 
            connects souls based on deep compatibility—not surface appearances.
          </p>
          
          <div className="p-4 rounded-xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-pink-500" />
              The Core Philosophy
            </h4>
            <p className="text-xs text-muted-foreground">
              "Don't match on looks. Match on timeline phase. If you're both in a Growth Phase, 
              you're a power couple. If one is Growing and one is Destroying, step away."
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="text-center p-4 rounded-lg bg-muted/30 border border-border/30">
              <EyeOff className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <span className="text-xs font-medium">Zero-Swipe</span>
              <p className="text-[10px] text-muted-foreground mt-1">No superficial swiping</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30 border border-border/30">
              <Shield className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <span className="text-xs font-medium">Zero-Knowledge</span>
              <p className="text-[10px] text-muted-foreground mt-1">Privacy-first matching</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'soul-vector',
      title: 'Your Soul Vector',
      subtitle: 'The Multi-Dimensional You',
      icon: <Fingerprint className="w-5 h-5" />,
      color: 'from-purple-500/20 to-blue-500/20',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your <strong>Soul Vector</strong> is a unique fingerprint of your essence, 
            capturing who you truly are across multiple dimensions.
          </p>
          
          <SoulVectorDiagram />
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">What's Captured:</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/20">
                <Hash className="w-4 h-4 text-pink-500 mb-1" />
                <span className="text-[10px] font-medium">Numerological</span>
                <p className="text-[9px] text-muted-foreground">Driver, Conductor, Vibration</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <Brain className="w-4 h-4 text-purple-500 mb-1" />
                <span className="text-[10px] font-medium">Behavioral</span>
                <p className="text-[9px] text-muted-foreground">Humor, Conflict, Decision styles</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Clock className="w-4 h-4 text-blue-500 mb-1" />
                <span className="text-[10px] font-medium">Temporal</span>
                <p className="text-[9px] text-muted-foreground">Life phase, Active cycles</p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <Compass className="w-4 h-4 text-green-500 mb-1" />
                <span className="text-[10px] font-medium">Karmic</span>
                <p className="text-[9px] text-muted-foreground">Life themes, Lessons</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'numerology',
      title: 'Numerological Harmony',
      subtitle: 'Your Core Numbers',
      icon: <Hash className="w-5 h-5" />,
      color: 'from-pink-500/20 to-red-500/20',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Three core numbers derived from your birth date determine 
            <strong> 20% of your compatibility score</strong>.
          </p>
          
          <NumerologyDiagram />
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">How Numbers Interact:</h4>
            <ul className="text-xs text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <CircleDot className="w-4 h-4 mt-0.5 text-pink-500 shrink-0" />
                <span><strong>Perfect pairs</strong> (1-5, 3-9, 4-8): Instant harmony, natural flow</span>
              </li>
              <li className="flex items-start gap-2">
                <CircleDot className="w-4 h-4 mt-0.5 text-purple-500 shrink-0" />
                <span><strong>Good pairs</strong>: Strong compatibility with minor adjustments</span>
              </li>
              <li className="flex items-start gap-2">
                <CircleDot className="w-4 h-4 mt-0.5 text-orange-500 shrink-0" />
                <span><strong>Challenging pairs</strong>: Requires conscious effort and patience</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'connection-types',
      title: 'Connection Types',
      subtitle: 'Five Soul Categories',
      icon: <Users className="w-5 h-5" />,
      color: 'from-blue-500/20 to-cyan-500/20',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Anima classifies connections into <strong>five categories</strong> based on 
            overall resonance and specific dimension strengths.
          </p>
          
          <ConnectionTypesDiagram />
          
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <h4 className="text-xs font-medium mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              Which is Best?
            </h4>
            <p className="text-[11px] text-muted-foreground">
              There's no "best" type. A <strong>Growth Catalyst</strong> may push you to evolve 
              faster than a <strong>Soulmate</strong>. A <strong>Mirror Soul</strong> shows you truths 
              about yourself. Each serves a purpose.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'synergy-breakdown',
      title: 'Synergy Breakdown',
      subtitle: 'Understanding Your Score',
      icon: <Target className="w-5 h-5" />,
      color: 'from-green-500/20 to-emerald-500/20',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Every connection receives a <strong>detailed synergy breakdown</strong> showing 
            exactly why you match (or don't).
          </p>
          
          <SynergyBreakdownDiagram />
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• <strong>Numerological (20%)</strong>: Core number compatibility</p>
            <p>• <strong>Behavioral (25%)</strong>: Personality & communication style</p>
            <p>• <strong>Temporal (20%)</strong>: Life phase & cycle alignment</p>
            <p>• <strong>Karmic (20%)</strong>: Shared lessons & growth themes</p>
            <p>• <strong>Complementary (15%)</strong>: How you balance each other</p>
          </div>
        </div>
      )
    },
    {
      id: 'privacy',
      title: 'Privacy & Consent',
      subtitle: 'Zero-Knowledge Architecture',
      icon: <Shield className="w-5 h-5" />,
      color: 'from-green-500/20 to-blue-500/20',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Anima uses <strong>Zero-Knowledge Privacy</strong>—your identity stays hidden until 
            both parties consent to connect.
          </p>
          
          <PrivacyFlowDiagram />
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Lock className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-medium mb-1">Before Match</h4>
                <p className="text-[10px] text-muted-foreground">
                  You see resonance scores and compatibility breakdown, but no names, 
                  photos, or identifying information.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Sparkles className="w-5 h-5 text-pink-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-medium mb-1">Destiny Notifications</h4>
                <p className="text-[10px] text-muted-foreground">
                  When someone accepts your connection, you receive a notification. 
                  You can then accept or decline.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Unlock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-medium mb-1">Mutual Reveal</h4>
                <p className="text-[10px] text-muted-foreground">
                  Only when both parties accept, identities are revealed and you can 
                  message each other.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'how-to-use',
      title: 'How to Use Anima',
      subtitle: 'Step-by-Step Guide',
      icon: <Compass className="w-5 h-5" />,
      color: 'from-orange-500/20 to-amber-500/20',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Follow these steps to start finding destiny connections:
          </p>
          
          <div className="space-y-3">
            <motion.div 
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0 }}
            >
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 text-xs font-bold text-primary-foreground">1</div>
              <div>
                <h4 className="text-xs font-medium mb-1">Enable Soul Synergy</h4>
                <p className="text-[10px] text-muted-foreground">
                  Toggle the search switch ON at the top of the Soul Synergy panel. 
                  This activates your profile for matching.
                </p>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 text-xs font-bold text-primary-foreground">2</div>
              <div>
                <h4 className="text-xs font-medium mb-1">Review Your Soul Vector</h4>
                <p className="text-[10px] text-muted-foreground">
                  Your Driver, Conductor, and Personal Year numbers appear at the top. 
                  These define your matching profile.
                </p>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 text-xs font-bold text-primary-foreground">3</div>
              <div>
                <h4 className="text-xs font-medium mb-1">Wait for Resonances</h4>
                <p className="text-[10px] text-muted-foreground">
                  High-resonance connections will appear in "Top Resonances" as Zoe 
                  scans compatible souls.
                </p>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 text-xs font-bold text-primary-foreground">4</div>
              <div>
                <h4 className="text-xs font-medium mb-1">Explore Connections</h4>
                <p className="text-[10px] text-muted-foreground">
                  Tap any connection to expand and see full synergy breakdown, 
                  match reasons, and destiny message.
                </p>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 text-xs font-bold text-primary-foreground">5</div>
              <div>
                <h4 className="text-xs font-medium mb-1">Accept or Pass</h4>
                <p className="text-[10px] text-muted-foreground">
                  If the synergy resonates with you, accept the connection. 
                  The other person will be notified.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      )
    },
    {
      id: 'tips',
      title: 'Pro Tips',
      subtitle: 'Maximize Your Matches',
      icon: <Star className="w-5 h-5" />,
      color: 'from-yellow-500/20 to-orange-500/20',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Advanced strategies to get the most from Anima:
          </p>
          
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-pink-500/10 border border-pink-500/30">
              <h4 className="text-xs font-medium text-pink-400 mb-1 flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Don't Chase 100%
              </h4>
              <p className="text-[10px] text-muted-foreground">
                An 85% match with complementary scores often works better than 
                95% with identical traits. Difference creates growth.
              </p>
            </div>
            
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <h4 className="text-xs font-medium text-purple-400 mb-1 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Respect Karmic Partners
              </h4>
              <p className="text-[10px] text-muted-foreground">
                Karmic connections are intense by design. They're here to teach, 
                not comfort. Embrace the transformation.
              </p>
            </div>
            
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <h4 className="text-xs font-medium text-blue-400 mb-1 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Check Temporal Scores
              </h4>
              <p className="text-[10px] text-muted-foreground">
                High temporal scores mean you're in aligned life phases. 
                Low scores don't mean incompatibility—just different timing.
              </p>
            </div>
            
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <h4 className="text-xs font-medium text-green-400 mb-1 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Trust the Privacy
              </h4>
              <p className="text-[10px] text-muted-foreground">
                No one can see who you are until you both consent. 
                Explore freely without social pressure.
              </p>
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
            <p className="text-xs text-center italic">
              "Anima doesn't find you a partner. It finds you a mirror, 
              a teacher, a companion for this part of your journey."
            </p>
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
            <BookOpen className="w-5 h-5 text-pink-500" />
            Anima User Guide
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
                  ? 'bg-pink-500 w-6' 
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

export default AnimaUserGuide;
