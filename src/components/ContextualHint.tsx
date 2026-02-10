import { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ContextualHintProps {
  hintKey: string;
  title: string;
  content: string;
  voiceText?: string;
  icon?: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  maxShowCount?: number;
  autoSpeak?: boolean;
}

export const ContextualHint = ({
  hintKey,
  title,
  content,
  voiceText,
  icon,
  position = 'center',
  maxShowCount = 3,
  autoSpeak = true,
}: ContextualHintProps) => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAndShowHint();
  }, [user, hintKey]);

  const checkAndShowHint = async () => {
    if (!user) {
      setIsChecking(false);
      return;
    }

    try {
      // Check if hint should be shown
      const { data: shouldShow, error } = await supabase
        .rpc('should_show_hint', {
          p_user_id: user.id,
          p_hint_key: hintKey,
          p_max_count: maxShowCount,
        });

      if (error) throw error;

      if (shouldShow) {
        setIsVisible(true);

        // Record that hint was shown
        const { error: upsertError } = await supabase
          .from('user_hints')
          .upsert({
            user_id: user.id,
            hint_key: hintKey,
            shown_count: 1,
            last_shown_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,hint_key',
            ignoreDuplicates: false,
          })
          .select()
          .then(({ data, error }) => {
            if (error) return { error };
            
            // Increment count if already exists
            if (data && data.length > 0) {
              return supabase
                .from('user_hints')
                .update({ 
                  shown_count: data[0].shown_count + 1,
                  last_shown_at: new Date().toISOString(),
                })
                .eq('id', data[0].id);
            }
            return { error: null };
          });

        if (upsertError) console.error('Error recording hint:', upsertError);

        // Speak hint if enabled
        if (autoSpeak && (voiceText || content)) {
          setTimeout(() => {
            speakHint(voiceText || content);
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error checking hint:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const speakHint = (text: string) => {
    const event = new CustomEvent('zoe-response', {
      detail: { text: `💡 Hint: ${text}` },
    });
    window.dispatchEvent(event);
  };

  const handleDismiss = async () => {
    setIsVisible(false);

    if (user) {
      await supabase
        .from('user_hints')
        .update({ dismissed: true })
        .eq('user_id', user.id)
        .eq('hint_key', hintKey);
    }
  };

  const handleGotIt = async () => {
    setIsVisible(false);

    if (user) {
      await supabase
        .from('user_hints')
        .update({ dismissed: true })
        .eq('user_id', user.id)
        .eq('hint_key', hintKey);
    }
  };

  const positionClasses = {
    top: 'top-4 left-1/2 -translate-x-1/2',
    bottom: 'bottom-4 left-1/2 -translate-x-1/2',
    left: 'left-4 top-1/2 -translate-y-1/2',
    right: 'right-4 top-1/2 -translate-y-1/2',
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  };

  if (isChecking || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className={`fixed ${positionClasses[position]} z-[9999] max-w-md mx-4`}
      >
        <Card className="bg-gradient-to-br from-primary/20 via-background to-accent/20 backdrop-blur-xl border-primary/30 shadow-2xl">
          <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  {icon || <Sparkles className="w-5 h-5 text-primary" />}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-400 animate-pulse" />
                    {title}
                  </h3>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-6 w-6 p-0 hover:bg-primary/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {content}
            </p>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground"
              >
                Don't show again
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleGotIt}
                className="bg-primary hover:bg-primary/90"
              >
                Got it!
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
