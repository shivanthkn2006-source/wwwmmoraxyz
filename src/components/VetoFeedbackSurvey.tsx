// ═══════════════════════════════════════════════════════════════════════════════
// VETO DISRUPTION FEEDBACK SURVEY
// Low-friction survey for training VETO tolerance model
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Star, X, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface VetoFeedbackSurveyProps {
  interventionId: string;
  contextSnippet?: string;
  onFeedbackSubmitted: (
    interventionId: string,
    helpedOrHindered: 'helped' | 'hindered' | 'neutral',
    timingRating: number,
    contextSnippet?: string
  ) => void;
  onDismiss?: () => void;
  className?: string;
}

export const VetoFeedbackSurvey: React.FC<VetoFeedbackSurveyProps> = ({
  interventionId,
  contextSnippet,
  onFeedbackSubmitted,
  onDismiss,
  className,
}) => {
  const [helpedOrHindered, setHelpedOrHindered] = useState<'helped' | 'hindered' | 'neutral' | null>(null);
  const [timingRating, setTimingRating] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!helpedOrHindered) return;
    
    setIsSubmitting(true);
    try {
      await onFeedbackSubmitted(
        interventionId,
        helpedOrHindered,
        timingRating,
        contextSnippet
      );
      setIsSubmitted(true);
      
      // Auto-dismiss after success
      setTimeout(() => {
        onDismiss?.();
      }, 1500);
    } catch (error) {
      console.error('[VetoFeedback] Submit failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'flex items-center justify-center gap-2 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30',
          className
        )}
      >
        <ShieldAlert className="w-5 h-5 text-emerald-500" />
        <span className="text-sm font-medium text-emerald-500">
          VETO feedback recorded. Thank you!
        </span>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <Card className={cn('relative overflow-hidden', className)}>
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
          
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={onDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          )}

          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              VETO Intervention Feedback
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Question 1: Helped or Hindered */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Did this intervention help or hinder your goal?
              </Label>
              <RadioGroup
                value={helpedOrHindered || ''}
                onValueChange={(v) => setHelpedOrHindered(v as 'helped' | 'hindered' | 'neutral')}
                className="flex gap-2"
              >
                {[
                  { value: 'helped', label: 'Helped', color: 'text-emerald-500' },
                  { value: 'neutral', label: 'Neutral', color: 'text-muted-foreground' },
                  { value: 'hindered', label: 'Hindered', color: 'text-red-500' },
                ].map((option) => (
                  <div key={option.value} className="flex-1">
                    <RadioGroupItem
                      value={option.value}
                      id={`hoh-${option.value}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`hoh-${option.value}`}
                      className={cn(
                        'flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-all',
                        'hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10',
                        option.color
                      )}
                    >
                      <span className="text-xs font-medium">{option.label}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Question 2: Timing Rating */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                How would you rate Zoe's timing?
              </Label>
              <div className="flex items-center justify-center gap-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant="ghost"
                    size="sm"
                    onClick={() => setTimingRating(rating)}
                    className={cn(
                      'h-8 w-8 p-0 transition-all',
                      rating <= timingRating 
                        ? 'text-amber-500' 
                        : 'text-muted-foreground/30'
                    )}
                  >
                    <Star 
                      className={cn(
                        'w-5 h-5 transition-all',
                        rating <= timingRating && 'fill-amber-500'
                      )} 
                    />
                  </Button>
                ))}
              </div>
              <p className="text-center text-[10px] text-muted-foreground">
                {timingRating === 1 && 'Way too early'}
                {timingRating === 2 && 'A bit early'}
                {timingRating === 3 && 'Just right'}
                {timingRating === 4 && 'A bit late'}
                {timingRating === 5 && 'Perfect timing'}
              </p>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!helpedOrHindered || isSubmitting}
              className="w-full"
              size="sm"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default VetoFeedbackSurvey;