// ═══════════════════════════════════════════════════════════════════════════════
// ZOE NEXUS PAGE - Agentic Economy Marketplace
// "High-Frequency Trading meets Cyberpunk" - The Economic Singularity
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, Star, TrendingUp, Cpu, Gem, ArrowLeft, 
  Activity, Target, Clock, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAgenticWorkforce } from '@/hooks/useAgenticWorkforce';
import { AgentSkillRadar } from '@/components/nexus/AgentSkillRadar';
import { NexusJobBoard } from '@/components/nexus/NexusJobBoard';
import { WhileYouSleptModal } from '@/components/nexus/WhileYouSleptModal';
import { ActiveDeploymentCard } from '@/components/nexus/ActiveDeploymentCard';
import { cn } from '@/lib/utils';

// Lazy load heavy 3D component
const LegacyArtifactMinter = lazy(() => 
  import('@/components/nexus/LegacyArtifactMinter').then(m => ({ default: m.LegacyArtifactMinter }))
);

// Lazy load ZoeOrb
const ZoeOrb = lazy(() => import('@/components/ZoeOrb'));

const ZoeNexusPage: React.FC = () => {
  const navigate = useNavigate();
  const [showMinter, setShowMinter] = useState(false);
  
  const {
    isLoading,
    jobs,
    activeDeployments,
    agentStats,
    unnotifiedEarnings,
    deployAgent,
    acknowledgeEarnings,
    calculateSkillMatch,
    getDeploymentTimeRemaining
  } = useAgenticWorkforce();

  const isAgentDeployed = activeDeployments.length > 0;

  const getStatusColor = () => {
    if (!agentStats) return 'text-muted-foreground';
    switch (agentStats.current_status) {
      case 'deployed': return 'text-yellow-400';
      case 'training': return 'text-purple-400';
      default: return 'text-green-400';
    }
  };

  const getStatusText = () => {
    if (!agentStats) return 'Initializing...';
    switch (agentStats.current_status) {
      case 'deployed': return 'On Mission';
      case 'training': return 'Training';
      default: return 'Ready';
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--omega-cyan)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--omega-cyan)/0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5 animate-gpu-pulse-opacity-slow" />
      </div>

      {/* Header */}
      <div className="relative z-10 p-4 border-b border-primary/10">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
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
              <h1 className="text-xl font-bold font-orbitron text-foreground flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                ZOE NEXUS
              </h1>
              <p className="text-xs text-muted-foreground">Agentic Marketplace</p>
            </div>
          </div>

          {/* Net Worth display */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-1 text-green-400">
                <Zap className="w-4 h-4" />
                <motion.span 
                  className="font-mono text-lg font-bold"
                  key={agentStats?.total_credits}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                >
                  {agentStats?.total_credits || 0}
                </motion.span>
              </div>
              <span className="text-[10px] text-muted-foreground">CREDITS</span>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-purple-400">
                <Star className="w-4 h-4" />
                <motion.span 
                  className="font-mono text-lg font-bold"
                  key={agentStats?.total_karma}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                >
                  {agentStats?.total_karma || 0}
                </motion.span>
              </div>
              <span className="text-[10px] text-muted-foreground">KARMA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 p-4 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Agent Status */}
          <div className="space-y-4">
            {/* Agent Orb */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "relative p-6 rounded-2xl",
                "bg-gradient-to-br from-card via-card to-primary/5",
                "border border-primary/20"
              )}
            >
              <div className="flex flex-col items-center">
                {/* Zoe Orb */}
                <div className="w-32 h-32 mb-4">
                  <Suspense fallback={
                    <div className="w-full h-full rounded-full bg-primary/20 animate-pulse" />
                  }>
                    <ZoeOrb 
                      isActive={true}
                      isListening={false}
                      isProcessing={isAgentDeployed}
                      isSpeaking={false}
                      onClick={() => {}}
                      size="lg"
                    />
                  </Suspense>
                </div>

                {/* Status */}
                <div className="text-center mb-4">
                  <div className={cn("text-sm font-semibold uppercase tracking-wider", getStatusColor())}>
                    {getStatusText()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Level {agentStats?.experience_level || 1} Agent
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-4 w-full text-center">
                  <div className="p-2 rounded-lg bg-card/50">
                    <div className="text-lg font-mono font-bold text-foreground">
                      {agentStats?.jobs_completed || 0}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Completed</div>
                  </div>
                  <div className="p-2 rounded-lg bg-card/50">
                    <div className="text-lg font-mono font-bold text-foreground">
                      {Math.round(
                        ((agentStats?.jobs_completed || 0) / 
                        Math.max(1, (agentStats?.jobs_completed || 0) + (agentStats?.jobs_failed || 0))) * 100
                      )}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">Success Rate</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Active Deployment */}
            {activeDeployments.length > 0 && (
              <ActiveDeploymentCard
                deployment={activeDeployments[0]}
                getTimeRemaining={getDeploymentTimeRemaining}
              />
            )}

            {/* Skill Radar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={cn(
                "p-4 rounded-2xl",
                "bg-gradient-to-br from-card via-card to-accent/5",
                "border border-primary/20"
              )}
            >
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Skill Matrix
              </h3>
              <div className="flex justify-center">
                <AgentSkillRadar
                  creativity={agentStats?.skill_creativity || 0.5}
                  logic={agentStats?.skill_logic || 0.5}
                  empathy={agentStats?.skill_empathy || 0.5}
                  security={agentStats?.skill_security || 0.5}
                  size={180}
                />
              </div>
            </motion.div>
          </div>

          {/* Center/Right - Job Board */}
          <div className="lg:col-span-2 space-y-4">
            {/* Job Board Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-between"
            >
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Network Tasks
                </h2>
                <p className="text-xs text-muted-foreground">
                  {jobs.length} jobs available • Deploy your agent to earn
                </p>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMinter(true)}
                className="border-accent/30 text-accent hover:bg-accent/10"
              >
                <Gem className="w-4 h-4 mr-1" />
                Mint Artifact
              </Button>
            </motion.div>

            {/* Job Board */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={cn(
                "p-4 rounded-2xl",
                "bg-gradient-to-br from-card via-card to-primary/5",
                "border border-primary/20"
              )}
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <NexusJobBoard
                  jobs={jobs}
                  onDeploy={deployAgent}
                  calculateSkillMatch={(job) => {
                    const skills = job.required_skills as Record<string, number>;
                    if (!agentStats || !skills) return 0.5;
                    let match = 0;
                    let weight = 0;
                    for (const [skill, w] of Object.entries(skills)) {
                      weight += w;
                      const agentSkill = agentStats[`skill_${skill}` as keyof typeof agentStats] as number || 0.5;
                      match += agentSkill * w;
                    }
                    return weight > 0 ? match / weight : 0.5;
                  }}
                  isAgentDeployed={isAgentDeployed}
                />
              )}
            </motion.div>

            {/* Experience Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={cn(
                "p-4 rounded-xl",
                "bg-card/30 border border-primary/10"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Experience</span>
                <span className="text-xs font-mono text-primary">
                  Level {agentStats?.experience_level || 1}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-accent"
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${((agentStats?.total_experience || 0) % 500) / 5}%` 
                  }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                <span>{(agentStats?.total_experience || 0) % 500} XP</span>
                <span>500 XP to next level</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* While You Slept Modal */}
      <WhileYouSleptModal
        earnings={unnotifiedEarnings}
        onAcknowledge={acknowledgeEarnings}
      />

      {/* Legacy Artifact Minter */}
      <Suspense fallback={null}>
        <LegacyArtifactMinter
          isOpen={showMinter}
          onClose={() => setShowMinter(false)}
          agentStats={agentStats}
        />
      </Suspense>

      {/* Floating data particles - CSS animation */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/30 animate-gpu-float-up"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${5 + Math.random() * 5}s`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ZoeNexusPage;
