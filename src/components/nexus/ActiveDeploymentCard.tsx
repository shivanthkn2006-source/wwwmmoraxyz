// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVE DEPLOYMENT CARD - Shows current agent deployment progress
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Clock, Target, Percent } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { AgentDeployment } from '@/hooks/useAgenticWorkforce';
import { cn } from '@/lib/utils';

interface ActiveDeploymentCardProps {
  deployment: AgentDeployment;
  getTimeRemaining: (deployment: AgentDeployment) => number;
}

export const ActiveDeploymentCard: React.FC<ActiveDeploymentCardProps> = ({
  deployment,
  getTimeRemaining
}) => {
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining(deployment));
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalTime = new Date(deployment.estimated_completion_at).getTime() - new Date(deployment.deployed_at).getTime();
    
    const updateTimer = () => {
      const remaining = getTimeRemaining(deployment);
      setTimeRemaining(remaining);
      
      const elapsed = totalTime - remaining;
      setProgress(Math.min(100, (elapsed / totalTime) * 100));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deployment, getTimeRemaining]);

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const jobTitle = deployment.job?.title || 'Unknown Mission';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative p-4 rounded-xl overflow-hidden",
        "bg-gradient-to-br from-primary/10 via-card to-accent/5",
        "border border-primary/30"
      )}
    >
      {/* Animated background pulse - CSS */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 animate-gpu-pulse-opacity-slow" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center animate-gpu-spin">
            <Loader2 className="w-4 h-4 text-primary" />
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground text-sm">Active Mission</h4>
            <p className="text-xs text-primary">{jobTitle}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-primary font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="relative">
            <Progress value={progress} className="h-2 bg-muted" />
            {/* Glow effect on progress - CSS */}
            <div
              className="absolute top-0 h-2 bg-gradient-to-r from-primary to-accent rounded-full animate-gpu-glow-cyan"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span className="font-mono">{formatTime(timeRemaining)}</span>
            <span>remaining</span>
          </div>
          
        </div>
      </div>

      {/* Scanning line effect - CSS */}
      <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent animate-gpu-scan-line" />
    </motion.div>
  );
};

export default ActiveDeploymentCard;
