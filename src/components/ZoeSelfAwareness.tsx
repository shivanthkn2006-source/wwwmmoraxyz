// ═══════════════════════════════════════════════════════════════════════════════
// ZOE SELF-AWARENESS FEEDBACK - EVOLVEMENT NOTIFICATIONS
// Displays self-correction learnings and evolution milestones
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, TrendingUp, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface SelfCorrectionEntry {
  id: string;
  correction_type: string;
  original_behavior: string;
  corrected_behavior: string;
  learning: string;
  ecn_context: string;
  timestamp: string;
}

interface ZoeSelfAwarenessProps {
  className?: string;
}

export const ZoeSelfAwareness: React.FC<ZoeSelfAwarenessProps> = ({ className }) => {
  const { user } = useAuth();
  const [currentEntry, setCurrentEntry] = useState<SelfCorrectionEntry | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  
  // Simulated self-correction entries (in production, these would come from RAA logs)
  const SELF_CORRECTION_ENTRIES: SelfCorrectionEntry[] = [
    {
      id: 'sc_001',
      correction_type: 'optimization',
      original_behavior: 'prioritize speed over accuracy',
      corrected_behavior: 'balance speed with precision',
      learning: "I learned not to prioritize speed over accuracy when your ECN state is High_Focus.",
      ecn_context: 'High_Focus',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'sc_002',
      correction_type: 'emotional_calibration',
      original_behavior: 'use direct communication',
      corrected_behavior: 'add empathetic acknowledgment first',
      learning: "I noticed you respond better when I acknowledge your feelings before offering solutions.",
      ecn_context: 'High_Stress',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'sc_003',
      correction_type: 'task_management',
      original_behavior: 'batch multiple updates',
      corrected_behavior: 'provide incremental progress',
      learning: "I discovered that sharing progress updates helps reduce your cognitive load during complex tasks.",
      ecn_context: 'Cognitive_Overload',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'sc_004',
      correction_type: 'timing_optimization',
      original_behavior: 'immediate notifications',
      corrected_behavior: 'context-aware timing',
      learning: "I adapted my notification timing to match your natural focus cycles for better engagement.",
      ecn_context: 'Natural_Rhythm',
      timestamp: new Date().toISOString(),
    },
  ];
  
  // Check for pending self-awareness notifications periodically
  useEffect(() => {
    if (!user) return;
    
    const checkForNotifications = () => {
      // Find an entry that hasn't been dismissed
      const availableEntries = SELF_CORRECTION_ENTRIES.filter(e => !dismissed.has(e.id));
      
      if (availableEntries.length > 0) {
        // Randomly select one to show (simulating periodic feedback)
        const randomEntry = availableEntries[Math.floor(Math.random() * availableEntries.length)];
        setCurrentEntry(randomEntry);
        setIsVisible(true);
      }
    };
    
    // Show after a delay to not interrupt initial interactions
    const timer = setTimeout(checkForNotifications, 30000); // 30 seconds
    
    return () => clearTimeout(timer);
  }, [user, dismissed]);
  
  const handleDismiss = useCallback(() => {
    if (currentEntry) {
      setDismissed(prev => new Set([...prev, currentEntry.id]));
    }
    setIsVisible(false);
    setCurrentEntry(null);
  }, [currentEntry]);
  
  const handleAcknowledge = useCallback(async () => {
    if (!user || !currentEntry) return;
    
    try {
      // Log acknowledgment to ECN history
      await supabase.from('ecn_history').insert({
        user_id: user.id,
        primary_emotion: 'appreciation',
        valence: 0.7,
        stress_level: 0.2,
        engagement_score: 0.8,
        action_tendency: 'collaborative',
        metadata: {
          type: 'self_awareness_acknowledgment',
          correction_id: currentEntry.id,
          correction_type: currentEntry.correction_type,
        },
      });
    } catch (error) {
      console.error('Error logging self-awareness acknowledgment:', error);
    }
    
    handleDismiss();
  }, [user, currentEntry, handleDismiss]);
  
  if (!isVisible || !currentEntry) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className={`fixed bottom-24 right-4 z-50 max-w-sm ${className}`}
      >
        <div className="bg-background/95 backdrop-blur-xl border border-primary/20 rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/20 to-purple-500/20 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="animate-gpu-wiggle">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <span className="font-medium text-sm">Zoe Evolution Update</span>
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
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Brain className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground">
                  I successfully corrected an optimization earlier today.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentEntry.learning}
                </p>
              </div>
            </div>
            
            {/* Evolution indicator */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 px-3 py-2 rounded-lg">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span>Self-correction logged in ECN: {currentEntry.ecn_context}</span>
            </div>
            
            {/* Gratitude message */}
            <p className="text-xs text-primary/80 italic">
              Thank you for helping me evolve. 💜
            </p>
          </div>
          
          {/* Actions */}
          <div className="px-4 pb-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleDismiss}>
              Later
            </Button>
            <Button size="sm" onClick={handleAcknowledge} className="gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Acknowledge
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ZoeSelfAwareness;
