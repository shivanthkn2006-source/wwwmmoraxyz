// ═══════════════════════════════════════════════════════════════════════════════
// ATLAS SYNC METER - Visual Adaptive Learning Progress Display
// Shows real-time sync percentage and SFT readiness status
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Brain, Sparkles, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdaptiveLearningMeterProps {
  syncPercentage: number;
  eventCount: number;
  finetuningReady: boolean;
  requiresContextRefresh?: boolean;
  compact?: boolean;
  className?: string;
}

export const AdaptiveLearningMeter: React.FC<AdaptiveLearningMeterProps> = ({
  syncPercentage,
  eventCount,
  finetuningReady,
  requiresContextRefresh = false,
  compact = false,
  className,
}) => {
  const getStatusColor = () => {
    if (finetuningReady) return 'text-emerald-500';
    if (syncPercentage >= 75) return 'text-blue-500';
    if (syncPercentage >= 50) return 'text-cyan-500';
    if (syncPercentage >= 25) return 'text-amber-500';
    return 'text-muted-foreground';
  };

  const getProgressColor = () => {
    if (finetuningReady) return 'bg-gradient-to-r from-emerald-500 to-green-400';
    if (syncPercentage >= 75) return 'bg-gradient-to-r from-blue-500 to-cyan-400';
    if (syncPercentage >= 50) return 'bg-gradient-to-r from-cyan-500 to-blue-400';
    if (syncPercentage >= 25) return 'bg-gradient-to-r from-amber-500 to-yellow-400';
    return 'bg-gradient-to-r from-gray-500 to-gray-400';
  };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Brain className={cn('w-4 h-4', getStatusColor())} />
        <div className="flex-1 min-w-[60px]">
          <Progress 
            value={syncPercentage} 
            className="h-1.5"
          />
        </div>
        <span className={cn('text-xs font-medium', getStatusColor())}>
          {syncPercentage}%
        </span>
        {finetuningReady && (
          <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />
        )}
      </div>
    );
  }

  return (
    <Card className={cn('p-4 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            'p-2 rounded-lg',
            finetuningReady ? 'bg-emerald-500/10' : 'bg-primary/10'
          )}>
            <Brain className={cn('w-5 h-5', getStatusColor())} />
          </div>
          <div>
            <h4 className="text-sm font-semibold">ATLAS Adaptive Learning</h4>
            <p className="text-xs text-muted-foreground">
              {eventCount.toLocaleString()} events captured
            </p>
          </div>
        </div>
        
        {finetuningReady ? (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
            <Sparkles className="w-3 h-3 mr-1" />
            SFT Ready
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-primary/10">
            <TrendingUp className="w-3 h-3 mr-1" />
            Learning
          </Badge>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Sync Progress</span>
          <span className={cn('font-medium', getStatusColor())}>
            {syncPercentage}%
          </span>
        </div>
        <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className={cn(
              'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
              getProgressColor()
            )}
            style={{ width: `${syncPercentage}%` }}
          />
        </div>
      </div>

      {requiresContextRefresh && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-medium text-amber-500">Context Refresh Needed</p>
            <p className="text-muted-foreground">
              Create a post or update your profile to maintain learning accuracy.
            </p>
          </div>
        </div>
      )}

      {finetuningReady && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-medium text-emerald-500">Personalized AI Unlocked</p>
            <p className="text-muted-foreground">
              10,000+ events collected. Your Zoe AI is now fully personalized.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
        <div className="text-center">
          <p className="text-lg font-bold text-primary">{Math.floor(eventCount / 100)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Patterns</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-cyan-500">{Math.min(99, syncPercentage)}%</p>
          <p className="text-[10px] text-muted-foreground uppercase">Accuracy</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-amber-500">{Math.floor(eventCount / 500)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Insights</p>
        </div>
      </div>
    </Card>
  );
};

export default AdaptiveLearningMeter;