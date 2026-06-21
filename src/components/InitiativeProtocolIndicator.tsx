/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * INITIATIVE PROTOCOL INDICATOR
 * Visual indicator when Zoe has proactive content ready
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Bell, Sparkles, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

// Support both type systems (from useZoeOfflineCore and useZoeProactiveMessaging)
type CombinedInsightType = 'achievement' | 'reminder' | 'social' | 'wellness' | 'opportunity' | 'idle_heart' | 'check_in' | 'insight';
type CombinedPriority = 'low' | 'medium' | 'high' | 'urgent' | 'normal';

interface InitiativeProtocolIndicatorProps {
  type: CombinedInsightType;
  priority: CombinedPriority;
  message: string;
  onDismiss?: () => void;
  onAction?: () => void;
  className?: string;
}

const typeConfig: Record<CombinedInsightType, { icon: React.ComponentType<any>; color: string; pulseClass: string; label: string }> = {
  idle_heart: { icon: Heart, color: 'text-pink-400', pulseClass: 'bg-pink-500/20', label: 'Idle Heart' },
  check_in: { icon: MessageCircle, color: 'text-blue-400', pulseClass: 'bg-blue-500/20', label: 'Check-in' },
  reminder: { icon: Bell, color: 'text-amber-400', pulseClass: 'bg-amber-500/20', label: 'Reminder' },
  achievement: { icon: Sparkles, color: 'text-purple-400', pulseClass: 'bg-purple-500/20', label: 'Achievement' },
  social: { icon: MessageCircle, color: 'text-green-400', pulseClass: 'bg-green-500/20', label: 'Social' },
  wellness: { icon: Heart, color: 'text-rose-400', pulseClass: 'bg-rose-500/20', label: 'Wellness' },
  opportunity: { icon: Sparkles, color: 'text-cyan-400', pulseClass: 'bg-cyan-500/20', label: 'Opportunity' },
  insight: { icon: Lightbulb, color: 'text-yellow-400', pulseClass: 'bg-yellow-500/20', label: 'Insight' },
};

export const InitiativeProtocolIndicator: React.FC<InitiativeProtocolIndicatorProps> = ({
  type,
  priority,
  message,
  onDismiss,
  onAction,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const config = typeConfig[type] || typeConfig.check_in;
  const Icon = config.icon;

  // Auto-expand for high priority after a delay
  useEffect(() => {
    if (priority === 'high' || priority === 'urgent') {
      const timer = setTimeout(() => setIsExpanded(true), 500);
      return () => clearTimeout(timer);
    }
  }, [priority]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss?.(), 300);
  };

  // Normalize priority for border styling
  const isUrgent = priority === 'urgent' || priority === 'high';

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="initiative-indicator"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={cn(
            'fixed bottom-24 right-4 z-50',
            className
          )}
        >
          <div
            className={cn(
              'bg-black/80 backdrop-blur-xl border rounded-2xl shadow-2xl overflow-hidden transition-all duration-300',
              isUrgent ? 'border-destructive/50' : 'border-border/20',
              isExpanded ? 'w-72' : 'w-14'
            )}
          >
            {/* Collapsed State - Just Icon */}
            {!isExpanded && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsExpanded(true)}
                className="w-14 h-14 flex items-center justify-center relative"
              >
                <Icon className={cn('w-6 h-6', config.color)} />
                {/* Pulse indicator */}
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={cn('absolute inset-0 rounded-full', config.pulseClass)}
                />
              </motion.button>
            )}

            {/* Expanded State */}
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4"
              >
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={cn('w-5 h-5', config.color)} />
                  <span className="text-xs text-muted-foreground font-medium">{config.label}</span>
                  <button
                    onClick={handleDismiss}
                    className="ml-auto text-muted-foreground/60 hover:text-muted-foreground text-xs"
                  >
                    ✕
                  </button>
                </div>

                {/* Message */}
                <p className="text-sm text-foreground/90 leading-relaxed mb-4">
                  {message}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onAction?.();
                      handleDismiss();
                    }}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors',
                      'bg-muted hover:bg-muted/80 text-foreground'
                    )}
                  >
                    Open Chat
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="py-2 px-3 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Later
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InitiativeProtocolIndicator;
