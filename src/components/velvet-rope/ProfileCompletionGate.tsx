// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE COMPLETION GATE
// The "Velvet Rope" - Advanced features are INVISIBLE until basic profile is complete
// Prevents empty Life Codex and saves system memory
// ═══════════════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { User, ArrowRight, CheckCircle, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useVelvetRope } from '@/contexts/VelvetRopeContext';
import { useNavigate } from 'react-router-dom';

interface ProfileCompletionGateProps {
  children: React.ReactNode;
  requiredLevel?: 'basic' | 'advanced' | 'dhf';
  fallbackMessage?: string;
}

const ProfileCompletionGate: React.FC<ProfileCompletionGateProps> = ({
  children,
  requiredLevel = 'basic',
  fallbackMessage,
}) => {
  const { mvdScore } = useVelvetRope();
  const navigate = useNavigate();

  // Determine if access is granted
  const hasAccess = (() => {
    switch (requiredLevel) {
      case 'basic':
        return mvdScore.isBasicComplete;
      case 'advanced':
        return mvdScore.isAdvancedReady;
      case 'dhf':
        return mvdScore.isDHFReady;
      default:
        return mvdScore.isBasicComplete;
    }
  })();

  // If access granted, render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // Otherwise, show completion prompt
  const thresholds = {
    basic: 60,
    advanced: 80,
    dhf: 90,
  };

  const threshold = thresholds[requiredLevel];
  const remaining = threshold - mvdScore.totalScore;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-xl border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-full bg-primary/10">
          <User className="h-6 w-6 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground mb-1">
            Complete Your Profile
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {fallbackMessage || `This feature requires ${threshold}% profile completion. You need ${remaining.toFixed(0)}% more.`}
          </p>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Current progress</span>
              <span className="text-primary font-medium">{mvdScore.totalScore.toFixed(0)}%</span>
            </div>
            <Progress value={mvdScore.totalScore} className="h-2" />
            <div 
              className="relative h-1 -mt-3"
              style={{ marginLeft: `${threshold}%`, transform: 'translateX(-50%)' }}
            >
              <div className="absolute bottom-0 w-0.5 h-4 bg-amber-500" />
              <span className="absolute top-5 text-[10px] text-amber-500 whitespace-nowrap -translate-x-1/2">
                {threshold}% needed
              </span>
            </div>
          </div>

          {/* Missing fields */}
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">Missing fields:</p>
            <div className="flex flex-wrap gap-2">
              {mvdScore.missingFields.slice(0, 5).map((field) => (
                <span
                  key={field}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-xs"
                >
                  <Circle className="h-2 w-2" />
                  {field}
                </span>
              ))}
              {mvdScore.missingFields.length > 5 && (
                <span className="px-2 py-1 text-xs text-muted-foreground">
                  +{mvdScore.missingFields.length - 5} more
                </span>
              )}
            </div>
          </div>

          {/* CTA */}
          <Button
            onClick={() => navigate('/profile')}
            className="w-full sm:w-auto"
            size="sm"
          >
            Complete Profile
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-white/5">
        {Object.entries(mvdScore.categories).map(([key, data]) => {
          const maxScores = { identity: 30, personality: 25, astrology: 25, social: 20 };
          const maxScore = maxScores[key as keyof typeof maxScores];
          const percentage = (data.score / maxScore) * 100;
          const isComplete = percentage >= 80;

          return (
            <div key={key} className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {isComplete ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <Circle className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="text-xs capitalize text-muted-foreground">{key}</span>
              </div>
              <div className="text-sm font-medium">
                {percentage.toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default memo(ProfileCompletionGate);
