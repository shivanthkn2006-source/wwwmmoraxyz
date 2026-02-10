// ═══════════════════════════════════════════════════════════════════════════════
// KRONOS ANIMA PAGE - Temporal Radar + Soul Synergy Hub + User Guides
// Dark Cycle 33-Year Engine + Soulmate Kronos Matching + Comprehensive Manuals
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Heart, Sparkles, ArrowLeft, BookOpen, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import TemporalRadar from '@/components/temporal/TemporalRadar';
import SoulSynergyPanel from '@/components/temporal/SoulSynergyPanel';
import KronosUserGuide from '@/components/kronos/KronosUserGuide';
import AnimaUserGuide from '@/components/anima/AnimaUserGuide';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const KronosAnimaPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('temporal');
  const [guideMode, setGuideMode] = useState<'kronos' | 'anima'>('kronos');

  return (
    <HelmetProvider>
      <Helmet>
        <title>Kronos & Anima | Zoe DHF</title>
        <meta name="description" content="Temporal Radar & Soul Synergy - 33-Year Dark Cycle Pattern Recognition & Destiny-Based Soulmate Matching" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50"
        >
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Kronos & Anima
                </h1>
                <p className="text-xs text-muted-foreground">
                  Temporal Radar • Soul Synergy • User Guides
                </p>
              </div>
            </div>
            
            {/* Quick Help Toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                      if (activeTab === 'temporal') {
                        setGuideMode('kronos');
                      } else if (activeTab === 'synergy') {
                        setGuideMode('anima');
                      }
                      setActiveTab('guide');
                    }}
                    className={activeTab === 'guide' ? 'bg-primary/10' : ''}
                  >
                    <HelpCircle className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View User Guide</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="temporal" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Temporal Radar</span>
                <span className="sm:hidden">Kronos</span>
              </TabsTrigger>
              <TabsTrigger value="synergy" className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline">Soul Synergy</span>
                <span className="sm:hidden">Anima</span>
              </TabsTrigger>
              <TabsTrigger value="guide" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">User Guides</span>
                <span className="sm:hidden">Guides</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="temporal">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-primary/20">
                  <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    The Wormhole Warning System
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Time is circular. The 33-year Metonic cycle, 12-year Jupiter returns, and 18-year Nodal flips 
                    create echoes across your timeline. What happened in {new Date().getFullYear() - 12} shapes {new Date().getFullYear()}. 
                    What happens now echoes in {new Date().getFullYear() + 12}.
                  </p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="text-xs p-0 h-auto mt-2"
                    onClick={() => {
                      setGuideMode('kronos');
                      setActiveTab('guide');
                    }}
                  >
                    Learn how to use Kronos →
                  </Button>
                </div>
                <TemporalRadar />
              </motion.div>
            </TabsContent>

            <TabsContent value="synergy">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20">
                  <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-500" />
                    Zero-Swipe Destiny Matching
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Don't match on looks. Match on timeline phase. If you're both in a Growth Phase, 
                    you're a power couple. If one is Growing and one is Destroying, step away. 
                    Zoe scans Soul Codex vectors for 91%+ compatibility.
                  </p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="text-xs p-0 h-auto mt-2 text-pink-500"
                    onClick={() => {
                      setGuideMode('anima');
                      setActiveTab('guide');
                    }}
                  >
                    Learn how to use Anima →
                  </Button>
                </div>
                <SoulSynergyPanel />
              </motion.div>
            </TabsContent>

            <TabsContent value="guide">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Guide Mode Toggle */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Button
                    variant={guideMode === 'kronos' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGuideMode('kronos')}
                    className="gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    Kronos Guide
                  </Button>
                  <Button
                    variant={guideMode === 'anima' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGuideMode('anima')}
                    className={`gap-2 ${guideMode === 'anima' ? 'bg-pink-500 hover:bg-pink-600' : ''}`}
                  >
                    <Heart className="w-4 h-4" />
                    Anima Guide
                  </Button>
                </div>

                {/* Render Selected Guide */}
                {guideMode === 'kronos' ? <KronosUserGuide /> : <AnimaUserGuide />}
              </motion.div>
            </TabsContent>
          </Tabs>

          {/* Info Cards - Only show when not on guide tab */}
          {activeTab !== 'guide' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
                <h3 className="text-sm font-medium mb-2">The Tri-Cycle Math</h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>33-Year:</strong> Solar/Lunar sync (Dark series pattern)</li>
                  <li>• <strong>12-Year:</strong> Jupiter Return (expansion cycle)</li>
                  <li>• <strong>18-Year:</strong> Nodal Return (karmic reset)</li>
                  <li>• <strong>8-Year:</strong> Octennial (environmental pattern)</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
                <h3 className="text-sm font-medium mb-2">Soul Synergy Logic</h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Numerological:</strong> Driver/Conductor harmony</li>
                  <li>• <strong>Behavioral:</strong> Conflict & humor style match</li>
                  <li>• <strong>Temporal:</strong> Life phase alignment</li>
                  <li>• <strong>Karmic:</strong> Complementary growth themes</li>
                </ul>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </HelmetProvider>
  );
};

export default KronosAnimaPage;
