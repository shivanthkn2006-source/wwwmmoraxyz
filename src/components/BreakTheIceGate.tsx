// ═══════════════════════════════════════════════════════════════════════════════
// BREAK THE ICE GATE - Zero-Friction Freemium Conversion Component
// Triggers when users access premium features
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Lock, Unlock, Brain, Zap, Clock, 
  ChevronRight, X, Star, Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useZeroFrictionFreemium, PremiumFeature } from '@/hooks/useZeroFrictionFreemium';

interface BreakTheIceGateProps {
  feature: PremiumFeature;
  featureTitle: string;
  featureDescription: string;
  onAccessGranted?: () => void;
  onDismiss?: () => void;
}

export const BreakTheIceGate = ({
  feature,
  featureTitle,
  featureDescription,
  onAccessGranted,
  onDismiss
}: BreakTheIceGateProps) => {
  const { 
    engagementScore, 
    startTrial, 
    trackFeatureGate 
  } = useZeroFrictionFreemium();
  
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [showTrialSuccess, setShowTrialSuccess] = useState(false);

  const handleStartTrial = async () => {
    setIsStartingTrial(true);
    await trackFeatureGate(feature);
    
    const success = await startTrial(feature, 7);
    
    if (success) {
      setShowTrialSuccess(true);
      setTimeout(() => {
        onAccessGranted?.();
      }, 2000);
    }
    
    setIsStartingTrial(false);
  };

  const featureIcons: Record<PremiumFeature, typeof Brain> = {
    universal_architect: Sparkles,
    raa_debugger: Zap,
    dhf_visualization: Brain,
    dreams_ai: Star,
    multiagent: Zap,
    advanced_voice: Zap,
    mind_merge: Brain
  };
  
  const FeatureIcon = featureIcons[feature] || Sparkles;

  // Show trial offer if high engagement
  const showTrialOffer = engagementScore > 50;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-lg"
        >
          <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-background border-purple-500/30">
            {/* Close button */}
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            {/* Animated background - GPU Accelerated */}
            <div className="absolute inset-0 overflow-hidden">
              <div
                className="absolute w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-gpu-blob-1"
                style={{ top: '-20%', left: '-10%' }}
              />
              <div
                className="absolute w-48 h-48 bg-pink-500/20 rounded-full blur-3xl animate-gpu-blob-2"
                style={{ bottom: '-10%', right: '-5%' }}
              />
            </div>
            
            <div className="relative p-8">
              {showTrialSuccess ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-center py-8"
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex p-6 rounded-full bg-green-500/20 mb-6"
                  >
                    <Unlock className="w-12 h-12 text-green-400" />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-2">Trial Activated!</h3>
                  <p className="text-muted-foreground">
                    Enjoy 7 days of full access to {featureTitle}
                  </p>
                </motion.div>
              ) : (
                <>
                  {/* Header */}
                  <div className="text-center mb-8">
                    <div
                      className="inline-flex p-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-4 animate-gpu-scale-bounce"
                    >
                      <Lock className="w-8 h-8 text-purple-400" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">
                      Unlock {featureTitle}
                    </h2>
                    <p className="text-muted-foreground">
                      {featureDescription}
                    </p>
                  </div>
                  
                  {/* Feature preview */}
                  <div className="bg-white/5 rounded-xl p-6 mb-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30">
                        <FeatureIcon className="w-6 h-6 text-purple-300" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{featureTitle}</h4>
                        <p className="text-sm text-muted-foreground">
                          Part of the Mind Merge Protocol - Activate deeper reasoning and save your unique memory
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Engagement progress */}
                  {engagementScore > 0 && engagementScore <= 50 && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Your Engagement</span>
                        <span className="text-purple-400">{engagementScore}/50 to unlock trial</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (engagementScore / 50) * 100)}%` }}
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Trial offer */}
                  {showTrialOffer && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6 p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30"
                    >
                      <div className="flex items-center gap-3">
                        <Gift className="w-5 h-5 text-purple-400" />
                        <div>
                          <p className="font-semibold text-sm">You've earned a free trial!</p>
                          <p className="text-xs text-muted-foreground">
                            7 days of full access based on your engagement
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Actions */}
                  <div className="space-y-3">
                    <Button
                      onClick={handleStartTrial}
                      disabled={isStartingTrial}
                      className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold"
                    >
                      {isStartingTrial ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Activating...
                        </>
                      ) : (
                        <>
                          <Unlock className="w-4 h-4 mr-2" />
                          Start 7-Day Free Trial
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      onClick={onDismiss}
                      className="w-full text-muted-foreground"
                    >
                      Maybe Later
                    </Button>
                  </div>
                  
                  {/* Trust indicators */}
                  <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-center gap-6 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      No credit card required
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Cancel anytime
                    </span>
                  </div>
                </>
              )}
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
