/**
 * OMEGA EVOLUTION PAGE
 * The Temple - Living ecosystem that sits on top of the app
 * Combines Addiction Formula with Evolution Layer structure
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Brain, Heart, Zap, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import LivingAtmosphereWrapper from '@/components/evolution/LivingAtmosphereWrapper';
import DailyAlignmentRitual from '@/components/evolution/DailyAlignmentRitual';
import DigitalSoulTree from '@/components/evolution/DigitalSoulTree';
import { cn } from '@/lib/utils';

const OmegaEvolutionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showRitual, setShowRitual] = useState(false);
  const [ritualCompleted, setRitualCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if daily ritual has been completed
  useEffect(() => {
    if (!user?.id) return;

    const checkDailyRitual = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data } = await supabase
          .from('zoe_contextual_memory')
          .select('key_decisions')
          .eq('user_id', user.id)
          .maybeSingle();

        const keyDecisions = (data?.key_decisions as Record<string, any>) || {};
        const todayAlignment = keyDecisions[`daily_alignment_${today}`];

        if (todayAlignment) {
          setRitualCompleted(true);
        } else {
          setShowRitual(true);
        }
      } catch (error) {
        console.error('Error checking daily ritual:', error);
        setShowRitual(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkDailyRitual();
  }, [user?.id]);

  const handleRitualComplete = () => {
    setShowRitual(false);
    setRitualCompleted(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div
          className="w-16 h-16 rounded-full border-2 border-primary/30 animate-gpu-spin-2s"
          style={{ borderTopColor: 'hsl(var(--primary))' }}
        />
      </div>
    );
  }

  return (
    <LivingAtmosphereWrapper>
      {/* Daily Alignment Ritual Modal */}
      <AnimatePresence>
        {showRitual && (
          <DailyAlignmentRitual onComplete={handleRitualComplete} />
        )}
      </AnimatePresence>

      {/* Main Evolution Dashboard */}
      <motion.div
        className="min-h-screen p-4 md:p-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: showRitual ? 0.3 : 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white/60 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Return
          </Button>

          <h1 
            className="text-xl md:text-2xl font-light text-center"
            style={{ 
              fontFamily: "'Orbitron', sans-serif",
              color: 'rgba(0, 255, 255, 0.9)',
              textShadow: '0 0 20px rgba(0, 255, 255, 0.3)'
            }}
          >
            OMEGA EVOLUTION
          </h1>

          <div className="w-24" /> {/* Spacer for alignment */}
        </header>

        {/* Status Bar */}
        <motion.div
          className="flex justify-center gap-4 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {[
            { icon: Brain, label: 'Neural', color: 'cyan' },
            { icon: Heart, label: 'Emotional', color: 'pink' },
            { icon: Zap, label: 'Energy', color: 'amber' },
            { icon: Eye, label: 'Awareness', color: 'purple' }
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full",
                "bg-white/5 border border-white/10",
                "backdrop-blur-sm"
              )}
              whileHover={{ scale: 1.05, borderColor: `var(--${stat.color}-500)` }}
            >
              <stat.icon className={cn("w-4 h-4", `text-${stat.color}-400`)} />
              <span className="text-xs text-white/60">{stat.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content Grid */}
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Digital Soul Tree - Center Stage */}
          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="text-center mb-4">
              <h2 
                className="text-lg font-light text-amber-400/80"
                style={{ fontFamily: "'Rajdhani', sans-serif" }}
              >
                Your Digital Soul
              </h2>
            </div>
            <DigitalSoulTree className="max-w-md mx-auto" />
          </motion.section>

          {/* Quick Actions */}
          <motion.section
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {[
              { label: 'VR World', path: '/zoe-omega', icon: '🌌' },
              { label: 'Zoe AI', path: '/ai-companion', icon: '🤖' },
              { label: 'Timeline', path: '/universal-timeline', icon: '⏳' },
              { label: 'DHF Core', path: '/dhf-dashboard', icon: '🧬' }
            ].map((action) => (
              <motion.button
                key={action.label}
                onClick={() => navigate(action.path)}
                className={cn(
                  "p-4 rounded-xl text-center",
                  "bg-white/5 border border-white/10",
                  "hover:bg-white/10 hover:border-cyan-500/30",
                  "transition-all duration-300"
                )}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-2xl mb-2 block">{action.icon}</span>
                <span 
                  className="text-sm text-white/70"
                  style={{ fontFamily: "'Rajdhani', sans-serif" }}
                >
                  {action.label}
                </span>
              </motion.button>
            ))}
          </motion.section>

          {/* Daily Alignment Status */}
          {ritualCompleted && (
            <motion.div
              className="text-center py-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <div className="flex items-center justify-center gap-2 text-green-400/80">
                <Sparkles className="w-5 h-5" />
                <span style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                  Today's alignment complete
                </span>
                <Sparkles className="w-5 h-5" />
              </div>
            </motion.div>
          )}

          {/* Inspirational Footer */}
          <motion.footer
            className="text-center pt-8 pb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <p 
              className="text-white/30 text-sm"
              style={{ fontFamily: "'Share Tech Mono', monospace" }}
            >
              "Evolution is not a destination, it is the journey itself."
            </p>
          </motion.footer>
        </div>
      </motion.div>
    </LivingAtmosphereWrapper>
  );
};

export default OmegaEvolutionPage;
