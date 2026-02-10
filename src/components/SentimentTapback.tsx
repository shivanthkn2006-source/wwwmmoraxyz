// ═══════════════════════════════════════════════════════════════════════════════
// SENTIMENT TAPBACK COMPONENT
// Low-friction feedback for Zoe AI responses
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface SentimentTapbackProps {
  responseId: string;
  responseSnippet: string;
  featureContext?: string;
  onSentimentRecorded: (
    sentiment: 'helpful' | 'confused' | 'perfect',
    responseId: string,
    responseSnippet: string,
    featureContext?: string
  ) => void;
  className?: string;
}

const SENTIMENTS = [
  { 
    id: 'helpful' as const, 
    emoji: '💡', 
    label: 'Helpful',
    color: 'hover:bg-blue-500/20 hover:border-blue-500/50',
    activeColor: 'bg-blue-500/30 border-blue-500 text-blue-400',
  },
  { 
    id: 'confused' as const, 
    emoji: '😟', 
    label: 'Confused',
    color: 'hover:bg-amber-500/20 hover:border-amber-500/50',
    activeColor: 'bg-amber-500/30 border-amber-500 text-amber-400',
  },
  { 
    id: 'perfect' as const, 
    emoji: '🔥', 
    label: 'Perfect',
    color: 'hover:bg-emerald-500/20 hover:border-emerald-500/50',
    activeColor: 'bg-emerald-500/30 border-emerald-500 text-emerald-400',
  },
];

export const SentimentTapback: React.FC<SentimentTapbackProps> = ({
  responseId,
  responseSnippet,
  featureContext,
  onSentimentRecorded,
  className,
}) => {
  const [selectedSentiment, setSelectedSentiment] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const handleTapback = async (sentiment: 'helpful' | 'confused' | 'perfect') => {
    if (isRecording || selectedSentiment) return;
    
    setIsRecording(true);
    setSelectedSentiment(sentiment);
    
    try {
      await onSentimentRecorded(sentiment, responseId, responseSnippet, featureContext);
    } catch (error) {
      console.error('[SentimentTapback] Recording failed:', error);
      setSelectedSentiment(null);
    } finally {
      setIsRecording(false);
    }
  };

  if (selectedSentiment) {
    const selected = SENTIMENTS.find(s => s.id === selectedSentiment);
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn('flex items-center gap-1.5 text-xs', className)}
      >
        <span className="text-muted-foreground">Feedback:</span>
        <span className={cn(
          'px-2 py-0.5 rounded-full border',
          selected?.activeColor
        )}>
          {selected?.emoji} {selected?.label}
        </span>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        className={cn('flex items-center gap-1', className)}
      >
        {SENTIMENTS.map((sentiment, index) => (
          <motion.div
            key={sentiment.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Button
              variant="ghost"
              size="sm"
              disabled={isRecording}
              onClick={() => handleTapback(sentiment.id)}
              className={cn(
                'h-7 px-2 gap-1 text-xs border border-transparent transition-all',
                sentiment.color,
                isRecording && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span className="text-sm">{sentiment.emoji}</span>
              <span className="hidden sm:inline">{sentiment.label}</span>
            </Button>
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

export default SentimentTapback;