// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS JOB BOARD - Scrolling list of network tasks with deploy functionality
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Clock, Target, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AgentJob } from '@/hooks/useAgenticWorkforce';
import { cn } from '@/lib/utils';

interface NexusJobBoardProps {
  jobs: AgentJob[];
  onDeploy: (jobId: string) => Promise<boolean>;
  calculateSkillMatch: (job: AgentJob) => number;
  isAgentDeployed: boolean;
}

export const NexusJobBoard: React.FC<NexusJobBoardProps> = ({
  jobs,
  onDeploy,
  calculateSkillMatch,
  isAgentDeployed
}) => {
  const [deployingId, setDeployingId] = useState<string | null>(null);

  const handleDeploy = async (jobId: string) => {
    setDeployingId(jobId);
    await onDeploy(jobId);
    setDeployingId(null);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 border-green-400/30 bg-green-400/10';
      case 'medium': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
      case 'hard': return 'text-red-400 border-red-400/30 bg-red-400/10';
      default: return 'text-muted-foreground';
    }
  };

  const getSkillMatchColor = (match: number) => {
    if (match >= 0.7) return 'text-green-400';
    if (match >= 0.4) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent pr-2">
      <AnimatePresence mode="popLayout">
        {jobs.map((job, index) => {
          const skillMatch = calculateSkillMatch(job);
          
          return (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "relative p-4 rounded-lg border transition-all duration-300",
                "bg-card/30 backdrop-blur-md",
                "border-primary/10 hover:border-primary/30",
                "group"
              )}
            >
              {/* Glow effect on hover */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground text-sm mb-1">
                      {job.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {job.description}
                    </p>
                  </div>
                  
                  {/* Difficulty badge */}
                  <span className={cn(
                    "px-2 py-0.5 text-[10px] font-mono uppercase rounded border",
                    getDifficultyColor(job.difficulty)
                  )}>
                    {job.difficulty}
                  </span>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 mb-3 text-xs">
                  <div className="flex items-center gap-1 text-green-400">
                    <Zap className="w-3 h-3" />
                    <span className="font-mono">{job.reward_credits}</span>
                    <span className="text-muted-foreground">credits</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-purple-400">
                    <Target className="w-3 h-3" />
                    <span className="font-mono">{job.reward_karma}</span>
                    <span className="text-muted-foreground">karma</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span className="font-mono">{job.estimated_duration_hours}h</span>
                  </div>
                </div>

                {/* Skill match + Deploy button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground uppercase">Skill Match:</span>
                    <span className={cn("font-mono text-sm font-bold", getSkillMatchColor(skillMatch))}>
                      {Math.round(skillMatch * 100)}%
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeploy(job.id)}
                    disabled={isAgentDeployed || deployingId !== null}
                    className={cn(
                      "h-7 px-3 text-xs font-mono",
                      "border-primary/30 bg-primary/10 text-primary",
                      "hover:bg-primary/20 hover:border-primary/50",
                      "disabled:opacity-50"
                    )}
                  >
                    {deployingId === job.id ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : isAgentDeployed ? (
                      <Lock className="w-3 h-3 mr-1" />
                    ) : null}
                    {isAgentDeployed ? 'Busy' : 'Deploy'}
                  </Button>
                </div>
              </div>

              {/* Animated border effect */}
              <div
                className="absolute inset-0 rounded-lg pointer-events-none animate-gpu-bg-slide"
                style={{
                  background: 'linear-gradient(90deg, transparent, hsl(var(--omega-cyan) / 0.3), transparent)',
                  backgroundSize: '200% 100%'
                }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {jobs.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No jobs available</p>
        </div>
      )}
    </div>
  );
};

export default NexusJobBoard;
