import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Trophy, Shield, Zap, Award, Lock, Unlock } from 'lucide-react';

interface CorticalStackProps {
  totalPoints?: number;
  tier?: string | null;
}

const TIER_MILESTONES = [
  { points: 10000, label: '10K', tier: 'Observer' },
  { points: 100000, label: '100K', tier: 'Sentinel' },
  { points: 500000, label: '500K', tier: 'Guardian' },
  { points: 1000000, label: '1M', tier: 'Architect' }
];

const CorticalStackSpine: React.FC<CorticalStackProps> = ({ 
  totalPoints = 0, 
  tier = 'Drifter' 
}) => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'SYNCED' | 'FRAGMENTED'>('SYNCED');

  // Check sync status based on last activity
  useEffect(() => {
    if (!user) return;

    const checkActivity = async () => {
      const { data } = await supabase
        .from('page_views')
        .select('entered_at')
        .eq('user_id', user.id)
        .order('entered_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.entered_at) {
        const lastActive = new Date(data.entered_at);
        const hoursSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60);
        setSyncStatus(hoursSinceActive < 24 ? 'SYNCED' : 'FRAGMENTED');
        setLastActivity(lastActive);
      }
    };

    checkActivity();
    const interval = setInterval(checkActivity, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // Calculate progress percentage (max 1M points)
  const progressPercentage = Math.min((totalPoints / 1000000) * 100, 100);

  return (
    <div className="relative w-full">
      {/* Resonance Progress Bar - Full Width Scanning */}
      <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden mb-4">
        {/* Progress Fill */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-accent to-secondary"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
        
        {/* Scanning Effect - GPU */}
        <div
          className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-gpu-shimmer"
        />
        
        {/* Milestone Markers */}
        {TIER_MILESTONES.map((milestone, idx) => {
          const position = (milestone.points / 1000000) * 100;
          const achieved = totalPoints >= milestone.points;
          return (
            <div
              key={milestone.label}
              className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-muted-foreground/50"
              style={{ left: `${position}%` }}
            >
              <span className={`absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] ${
                achieved ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {milestone.label}
              </span>
            </div>
          );
        })}
        
        {/* Architect Goal Icon */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1">
          <div
            className={totalPoints >= 1000000 ? 'animate-gpu-pulse-scale' : 'opacity-50'}
          >
            <Trophy className={`w-4 h-4 ${
              totalPoints >= 1000000 ? 'text-yellow-400' : 'text-muted-foreground'
            }`} />
          </div>
        </div>
      </div>

      {/* Cortical Stack Visualization */}
      <div className="flex items-center gap-4">
        {/* The Stack - Vertical Cylinder */}
        <div className="relative w-12 h-32 flex-shrink-0">
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-b from-primary/30 via-primary/10 to-primary/30 border border-primary/40 animate-gpu-glow-primary"
          />
          
          {/* Internal Data Flow */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-1 h-full animate-gpu-scan-line"
            style={{
              background: 'linear-gradient(180deg, transparent, hsl(var(--primary)), transparent)'
            }}
          />
          
          {/* Tier Indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[8px] font-mono text-primary uppercase tracking-wider transform -rotate-90 whitespace-nowrap">
              {tier || 'DRIFTER'}
            </span>
          </div>
        </div>

        {/* Status Display */}
        <div className="flex-1 space-y-2">
          {/* Sync Status */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full animate-gpu-pulse-opacity ${
                syncStatus === 'SYNCED' ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className={`text-xs font-mono ${
              syncStatus === 'SYNCED' ? 'text-green-400' : 'text-red-400'
            }`}>
              {syncStatus}
            </span>
          </div>
          
          {/* Points Display */}
          <div className="text-lg font-bold font-mono text-primary">
            {totalPoints.toLocaleString()} <span className="text-xs text-muted-foreground">RP</span>
          </div>
          
          {/* Quick Stats */}
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              {tier || 'Drifter'}
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorticalStackSpine;
