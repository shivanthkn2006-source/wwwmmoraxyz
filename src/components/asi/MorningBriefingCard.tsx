// ═══════════════════════════════════════════════════════════════════════════════
// MORNING BRIEFING CARD - The Premonition Display
// Shows the "While You Slept" synthesis from the Dreamer
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, Moon, Sparkles, Target, ChevronRight, 
  TrendingUp, TrendingDown, Minus, Eye, X 
} from 'lucide-react';
import type { MorningBriefing } from '@/hooks/useMorningBriefing';

interface MorningBriefingCardProps {
  briefing: MorningBriefing;
  onDismiss: () => void;
  onViewScenarios?: () => void;
  expanded?: boolean;
}

const toneConfig = {
  wise: {
    icon: '🦉',
    gradient: 'from-amber-500/20 to-orange-500/20',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-300'
  },
  prophetic: {
    icon: '🔮',
    gradient: 'from-purple-500/20 to-violet-500/20',
    border: 'border-purple-500/30',
    badge: 'bg-purple-500/20 text-purple-300'
  },
  calm: {
    icon: '☀️',
    gradient: 'from-sky-500/20 to-blue-500/20',
    border: 'border-sky-500/30',
    badge: 'bg-sky-500/20 text-sky-300'
  },
  urgent: {
    icon: '⚡',
    gradient: 'from-red-500/20 to-orange-500/20',
    border: 'border-red-500/30',
    badge: 'bg-red-500/20 text-red-300'
  }
};

export const MorningBriefingCard: React.FC<MorningBriefingCardProps> = ({
  briefing,
  onDismiss,
  onViewScenarios,
  expanded = false
}) => {
  const config = toneConfig[briefing.tone];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Card className={`relative overflow-hidden bg-gradient-to-br ${config.gradient} ${config.border} border backdrop-blur-xl`}>
          {/* Animated glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
          
          <CardHeader className="pb-2 relative">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl animate-gpu-icon-wiggle">
                  {config.icon}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg text-foreground">
                      While You Slept...
                    </CardTitle>
                    <Badge className={`${config.badge} text-xs`}>
                      {briefing.tone.charAt(0).toUpperCase() + briefing.tone.slice(1)}
                    </Badge>
                  </div>
                  <CardDescription className="text-muted-foreground/80">
                    {briefing.insightHeadline}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDismiss}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 relative">
            {/* Profound Insight */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="p-4 rounded-lg bg-background/30 backdrop-blur-sm border border-white/10"
            >
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-foreground/90 leading-relaxed italic">
                  "{briefing.profoundInsight}"
                </p>
              </div>
            </motion.div>

            {/* Action Item */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20"
            >
              <Target className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Today's Action</span>
                <p className="text-sm text-foreground font-medium">{briefing.actionItem}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </motion.div>

            {/* Scenarios Preview (if expanded) */}
            {expanded && briefing.scenarios.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2 pt-2"
              >
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Simulated Futures
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {briefing.scenarios.slice(0, 3).map((scenario, idx) => (
                    <div
                      key={scenario.id}
                      className="flex items-center gap-2 p-2 rounded bg-background/20 text-sm"
                    >
                      <span className="text-xs font-mono text-muted-foreground">
                        {scenario.id}
                      </span>
                      <span className="flex-1 text-foreground/80 truncate">
                        {scenario.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {(scenario.probability * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Synthesized at {new Date(briefing.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              
              {onViewScenarios && briefing.scenarios.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewScenarios}
                  className="text-xs gap-1"
                >
                  <Eye className="h-3 w-3" />
                  View All Scenarios
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default MorningBriefingCard;
