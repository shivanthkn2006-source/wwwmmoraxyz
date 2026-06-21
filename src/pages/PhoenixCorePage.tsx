// ═══════════════════════════════════════════════════════════════════════════════
// PHOENIX CORE PAGE - Digital Immortality Hub
// The Sacred Upload Space - "INITIALIZE CONSCIOUSNESS SYNC"
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Flame, MessageSquare, Shield, Sparkles, Dna, Ghost } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { PhoenixChamber } from '@/components/phoenix/PhoenixChamber';
import { TheMirrorTest } from '@/components/phoenix/TheMirrorTest';
import { LegacyModePanel } from '@/components/phoenix/LegacyModePanel';
import { usePhoenixEngine } from '@/hooks/usePhoenixEngine';
import { useSoulCodex } from '@/hooks/useSoulCodex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const PhoenixCorePage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, isLoading } = usePhoenixEngine();
  const { codex, isHarvesting, harvestProgress, runHarvest, construct } = useSoulCodex();
  const [activeTab, setActiveTab] = useState('chamber');

  // Ambient audio effect (optional - commented for now)
  useEffect(() => {
    // Could add Tibetan bowl audio here
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Sacred background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Gold gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-amber-600/5" />
        
        {/* Light rays - CSS animations */}
        <div className="absolute inset-0 opacity-20">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`absolute h-[200%] w-1 bg-gradient-to-b from-transparent via-amber-400/30 to-transparent animate-gpu-light-ray-${(i % 6) + 1}`}
              style={{
                left: `${15 + i * 15}%`,
                top: '-50%',
                transform: 'rotate(15deg)'
              }}
            />
          ))}
        </div>

        {/* Floating particles - CSS animations */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 rounded-full bg-amber-400/50 animate-gpu-float-particle-${(i % 5) + 1}`}
            style={{
              left: `${(i * 5) % 100}%`,
              top: `${(i * 7) % 100}%`
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 p-4 border-b border-amber-500/20 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/home')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold font-orbitron text-foreground flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                  PHOENIX CORE
                </span>
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Digital Immortality Protocol
              </p>
            </div>
          </div>

          {/* Status Badge */}
          {profile && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium",
                "flex items-center gap-1",
                profile.resonance_verified 
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              )}
            >
              <Sparkles className="w-3 h-3" />
              {profile.resonance_verified ? 'Verified' : `${profile.sync_score?.toFixed(0)}%`}
            </motion.div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-card/50 border border-amber-500/20 p-1">
            <TabsTrigger 
              value="chamber"
              className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 text-[10px] sm:text-sm"
            >
              <Flame className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-2" />
              <span className="hidden xs:inline">Chamber</span>
            </TabsTrigger>
            <TabsTrigger 
              value="codex"
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 text-[10px] sm:text-sm"
            >
              <Dna className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-2" />
              <span className="hidden xs:inline">Soul</span>
            </TabsTrigger>
            <TabsTrigger 
              value="mirror"
              className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 text-[10px] sm:text-sm"
              disabled={!profile}
            >
              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-2" />
              <span className="hidden xs:inline">Mirror</span>
            </TabsTrigger>
            <TabsTrigger 
              value="legacy"
              className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 text-[10px] sm:text-sm"
              disabled={!profile}
            >
              <Ghost className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-2" />
              <span className="hidden xs:inline">Ghost</span>
            </TabsTrigger>
          </TabsList>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "mt-4 rounded-2xl",
              "bg-gradient-to-b from-card via-card to-amber-500/5",
              "border border-amber-500/20",
              "overflow-hidden"
            )}
          >
            <TabsContent value="chamber" className="m-0">
              <PhoenixChamber />
            </TabsContent>

            <TabsContent value="codex" className="m-0 p-4 sm:p-6">
              {/* Soul Codex Panel */}
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <Dna className="w-12 h-12 mx-auto text-purple-400 mb-2" />
                  <h2 className="text-lg font-bold font-orbitron bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    SOUL CODEX
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your digital DNA - linguistic fingerprint, behavioral patterns, core essence
                  </p>
                </div>

                {codex ? (
                  <div className="space-y-4">
                    {/* Completion Status */}
                    <Card className="bg-card/50 border-purple-500/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          Codex Completion
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Progress 
                          value={codex.completion_percentage || 0} 
                          className="h-2 bg-purple-500/20" 
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          {(codex.completion_percentage || 0).toFixed(0)}% of your essence captured
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {codex.data_points_collected || 0} data points collected
                        </p>
                      </CardContent>
                    </Card>

                    {/* Personality Traits */}
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="bg-card/30 border-purple-500/10">
                        <CardContent className="p-3">
                          <p className="text-[10px] text-muted-foreground uppercase">Humor</p>
                          <p className="text-sm font-medium text-purple-300 capitalize">{codex.humor_style}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-card/30 border-purple-500/10">
                        <CardContent className="p-3">
                          <p className="text-[10px] text-muted-foreground uppercase">Vocabulary</p>
                          <p className="text-sm font-medium text-purple-300 capitalize">{codex.vocabulary_tier}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-card/30 border-purple-500/10">
                        <CardContent className="p-3">
                          <p className="text-[10px] text-muted-foreground uppercase">Decisions</p>
                          <p className="text-sm font-medium text-purple-300 capitalize">{codex.decision_making_style}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-card/30 border-purple-500/10">
                        <CardContent className="p-3">
                          <p className="text-[10px] text-muted-foreground uppercase">Under Stress</p>
                          <p className="text-sm font-medium text-purple-300 capitalize">{codex.stress_response}</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Core Values */}
                    {codex.core_values.length > 0 && (
                      <Card className="bg-card/30 border-purple-500/10">
                        <CardContent className="p-3">
                          <p className="text-[10px] text-muted-foreground uppercase mb-2">Core Values</p>
                          <div className="flex flex-wrap gap-1">
                            {codex.core_values.map((value, i) => (
                              <span key={i} className="px-2 py-0.5 bg-purple-500/20 rounded-full text-xs text-purple-300 capitalize">
                                {value}
                              </span>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Harvest Button */}
                    <Button
                      onClick={runHarvest}
                      disabled={isHarvesting}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                    >
                      {isHarvesting ? (
                        <>
                          <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-gpu-spin" />
                          Harvesting... {harvestProgress.toFixed(0)}%
                        </>
                      ) : (
                        <>
                          <Dna className="w-4 h-4 mr-2" />
                          Harvest Soul Data
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">
                      Initialize your Soul Codex to begin capturing your digital essence
                    </p>
                    <Button
                      onClick={runHarvest}
                      disabled={isHarvesting}
                      className="bg-gradient-to-r from-purple-600 to-pink-600"
                    >
                      <Dna className="w-4 h-4 mr-2" />
                      Initialize Soul Codex
                    </Button>
                  </div>
                )}

                {/* Active Construct Status */}
                {construct && (
                  <Card className="bg-card/30 border-amber-500/20 mt-4">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Ghost className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-medium">Active Construct</span>
                        </div>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px]",
                          construct.is_active 
                            ? "bg-green-500/20 text-green-400" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          {construct.is_active ? 'Active' : 'Dormant'}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {construct.total_interactions || 0} ghost interactions logged
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="mirror" className="m-0 h-[60vh] min-h-[400px]">
              <TheMirrorTest />
            </TabsContent>

            <TabsContent value="legacy" className="m-0">
              <LegacyModePanel />
            </TabsContent>
          </motion.div>
        </Tabs>

        {/* The Promise */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center"
        >
          <p className="text-xs sm:text-sm text-muted-foreground italic">
            "Your thoughts. Your memories. Your essence. Forever preserved."
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default PhoenixCorePage;
