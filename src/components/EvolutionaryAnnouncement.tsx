// ═══════════════════════════════════════════════════════════════════════════════
// EVOLUTIONARY ANNOUNCEMENT - Shows Zoe's self-improvement notifications
// Low-frequency, context-aware notifications about Zoe's growth
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, TrendingUp, X, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface EvolutionEntry {
  id: string;
  evolution_type: string;
  description: string;
  learning_source: string;
  created_at: string;
}

interface EvolutionaryAnnouncementProps {
  maxAnnouncements?: number;
  checkInterval?: number; // in minutes
}

export const EvolutionaryAnnouncement: React.FC<EvolutionaryAnnouncementProps> = ({
  maxAnnouncements = 1,
  checkInterval = 60, // Check every hour
}) => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<EvolutionEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const fetchUnannounced = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('zoe_evolution_log')
        .select('*')
        .eq('user_id', user.id)
        .eq('announced_to_user', false)
        .order('created_at', { ascending: false })
        .limit(maxAnnouncements);

      if (error) throw error;

      if (data && data.length > 0) {
        setAnnouncements(data as EvolutionEntry[]);
        setIsVisible(true);
      }
    } catch (err) {
      console.error('Failed to fetch evolution announcements:', err);
    }
  }, [user, maxAnnouncements]);

  useEffect(() => {
    // Initial fetch after a delay
    const initialTimer = setTimeout(fetchUnannounced, 30000); // Wait 30 seconds

    // Periodic check
    const interval = setInterval(fetchUnannounced, checkInterval * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [fetchUnannounced, checkInterval]);

  const markAsAnnounced = async (id: string) => {
    if (!user) return;

    try {
      await supabase
        .from('zoe_evolution_log')
        .update({
          announced_to_user: true,
          announced_at: new Date().toISOString(),
        })
        .eq('id', id);
    } catch (err) {
      console.error('Failed to mark announcement:', err);
    }
  };

  const handleDismiss = async () => {
    const current = announcements[currentIndex];
    if (current) {
      await markAsAnnounced(current.id);
    }

    if (currentIndex < announcements.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsVisible(false);
      setAnnouncements([]);
      setCurrentIndex(0);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'self_correction':
        return <Brain className="h-5 w-5" />;
      case 'pattern_learned':
        return <TrendingUp className="h-5 w-5" />;
      case 'optimization':
        return <Sparkles className="h-5 w-5" />;
      default:
        return <Heart className="h-5 w-5" />;
    }
  };

  const getTitle = (type: string) => {
    switch (type) {
      case 'self_correction':
        return 'Learning Update';
      case 'pattern_learned':
        return 'Pattern Recognized';
      case 'optimization':
        return 'Performance Improved';
      case 'behavior_refined':
        return 'Behavior Refined';
      default:
        return 'Evolution Update';
    }
  };

  const current = announcements[currentIndex];

  if (!isVisible || !current) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, x: 20 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, y: 50, x: 20 }}
        className="fixed bottom-24 right-4 z-50 max-w-sm"
      >
        <div className="bg-gradient-to-br from-background to-secondary/50 rounded-xl shadow-lg border border-primary/20 overflow-hidden">
          {/* Header */}
          <div className="bg-primary/10 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-primary animate-gpu-pulse-scale-slow">
                {getIcon(current.evolution_type)}
              </div>
              <span className="text-sm font-medium">{getTitle(current.evolution_type)}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            <p className="text-sm text-foreground">
              {current.description}
            </p>

            <p className="text-xs text-muted-foreground italic">
              Thank you for helping me evolve.
            </p>

            {/* Progress indicator for multiple announcements */}
            {announcements.length > 1 && (
              <div className="flex justify-center gap-1 pt-2">
                {announcements.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i === currentIndex ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EvolutionaryAnnouncement;
