/**
 * LIFE YOU WANT JOURNEY - Phase 3 Complete User Flow
 * Orchestrates: Discovery → Re-Sleeving → Execution → Result
 * Part of Zoe Infinity DHF Core - Standalone System
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useZoeReSleeve } from '@/hooks/useZoeReSleeve';
import { DiscoveryPrompt } from './DiscoveryPrompt';
import { TransformationScreen } from './TransformationScreen';
import { CreativeExecutor } from './CreativeExecutor';
import { SleeveMarketplace } from './SleeveMarketplace';
import { SoulScanner } from './SoulScanner';
import { PuppetMasterAgent } from './PuppetMasterAgent';
import { cn } from '@/lib/utils';

type JourneyPhase = 'idle' | 'discovery' | 'transforming' | 'equipped' | 'executing' | 'complete';

const SLEEVE_EMOJIS: Record<string, string> = {
  'zoe-painter': '🎨',
  'zoe-coder': '💻',
  'zoe-entrepreneur': '🚀',
  'zoe-healer': '🧘',
  'zoe-connector': '🤝'
};

export const LifeYouWantJourney = () => {
  const { 
    scanSoul, 
    soulScanResult, 
    activeSleeve, 
    equipSleeve, 
    unequipSleeve,
    isScanning 
  } = useZoeReSleeve();
  
  const [phase, setPhase] = useState<JourneyPhase>('idle');
  const [showDiscoveryPrompt, setShowDiscoveryPrompt] = useState(false);
  const [discoveredTalent, setDiscoveredTalent] = useState<{ name: string; sleeveId: string; confidence: number } | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);

  // Auto-scan on mount and show discovery if talent found
  useEffect(() => {
    const autoDiscover = async () => {
      if (!soulScanResult && !isScanning) {
        try {
          const result = await scanSoul();
          if (result.talents.length > 0 && result.talents[0].confidence >= 60) {
            const talent = result.talents[0];
            setDiscoveredTalent({
              name: talent.name,
              sleeveId: talent.matchingSleeves[0],
              confidence: talent.confidence
            });
            setPhase('discovery');
            // Slight delay for better UX
            setTimeout(() => setShowDiscoveryPrompt(true), 500);
          }
        } catch (error) {
          console.error('[LifeYouWantJourney] Auto-scan failed:', error);
        }
      }
    };

    autoDiscover();
  }, [scanSoul, soulScanResult, isScanning]);

  // Update phase when sleeve is equipped
  useEffect(() => {
    if (activeSleeve && phase !== 'transforming') {
      setPhase('equipped');
    } else if (!activeSleeve && phase === 'equipped') {
      setPhase('idle');
    }
  }, [activeSleeve, phase]);

  const handleAcceptDiscovery = useCallback(() => {
    if (!discoveredTalent) return;
    
    setShowDiscoveryPrompt(false);
    setIsTransforming(true);
    setPhase('transforming');
    
    // Equip the sleeve
    equipSleeve(discoveredTalent.sleeveId);
    
    // Dispatch to Zoe Core DHF
    window.dispatchEvent(new CustomEvent('zoe-journey-phase', {
      detail: { phase: 'transforming', sleeveId: discoveredTalent.sleeveId }
    }));
  }, [discoveredTalent, equipSleeve]);

  const handleDismissDiscovery = useCallback(() => {
    setShowDiscoveryPrompt(false);
    setPhase('idle');
  }, []);

  const handleTransformationComplete = useCallback(() => {
    setIsTransforming(false);
    setPhase('equipped');
    
    // Dispatch to Zoe Core DHF
    window.dispatchEvent(new CustomEvent('zoe-journey-phase', {
      detail: { phase: 'equipped', sleeveId: activeSleeve?.id }
    }));
  }, [activeSleeve]);

  const handleExecutionComplete = useCallback((result: any) => {
    setPhase('complete');
    
    // Dispatch to Zoe Core DHF
    window.dispatchEvent(new CustomEvent('zoe-journey-complete', {
      detail: { result, sleeveId: activeSleeve?.id }
    }));
  }, [activeSleeve]);

  const handleRestart = useCallback(() => {
    unequipSleeve();
    setPhase('idle');
    setDiscoveredTalent(null);
    setShowDiscoveryPrompt(false);
  }, [unequipSleeve]);

  return (
    <div className="space-y-6">
      {/* Phase Indicator */}
      <div className="flex items-center justify-center gap-2 py-3">
        {['Discovery', 'Transform', 'Execute', 'Result'].map((label, i) => {
          const phaseIndex = { idle: -1, discovery: 0, transforming: 1, equipped: 2, executing: 2, complete: 3 }[phase];
          const isActive = i <= phaseIndex;
          const isCurrent = i === phaseIndex;
          
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}>
                {i + 1}
              </div>
              <span className={cn(
                "text-sm hidden sm:block",
                isActive ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {label}
              </span>
              {i < 3 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          );
        })}
      </div>

      {/* Discovery Prompt Overlay */}
      <DiscoveryPrompt
        talentName={discoveredTalent?.name || 'colors'}
        sleeveId={discoveredTalent?.sleeveId || 'zoe-painter'}
        sleeveEmoji={SLEEVE_EMOJIS[discoveredTalent?.sleeveId || 'zoe-painter'] || '🎨'}
        confidence={discoveredTalent?.confidence || 85}
        onAccept={handleAcceptDiscovery}
        onDismiss={handleDismissDiscovery}
        isVisible={showDiscoveryPrompt}
      />

      {/* Transformation Screen Overlay */}
      <TransformationScreen
        sleeve={activeSleeve}
        isTransforming={isTransforming}
        onComplete={handleTransformationComplete}
      />

      {/* Main Content Based on Phase */}
      <AnimatePresence mode="wait">
        {(phase === 'idle' || phase === 'discovery') && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid gap-6 md:grid-cols-2"
          >
            <SoulScanner
              onTalentDetected={(talent) => {
                setDiscoveredTalent({
                  name: talent.name,
                  sleeveId: talent.matchingSleeves[0],
                  confidence: talent.confidence
                });
                if (talent.confidence >= 60) {
                  setPhase('discovery');
                  setTimeout(() => setShowDiscoveryPrompt(true), 300);
                }
              }}
              onSleeveRecommended={(sleeveId) => {
                equipSleeve(sleeveId);
                setIsTransforming(true);
                setPhase('transforming');
              }}
            />
            <SleeveMarketplace
              recommendedSleeveId={discoveredTalent?.sleeveId}
              onSleeveEquipped={(sleeve) => {
                setIsTransforming(true);
                setPhase('transforming');
              }}
            />
          </motion.div>
        )}

        {(phase === 'equipped' || phase === 'executing') && activeSleeve && (
          <motion.div
            key="equipped"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Active Sleeve Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{SLEEVE_EMOJIS[activeSleeve.id] || '🧠'}</span>
                  <div>
                    <h3 className="font-bold">{activeSleeve.name} Active</h3>
                    <p className="text-sm text-muted-foreground">You're now operating as a {activeSleeve.category} professional</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleRestart}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Switch Role
                </Button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Creative Executor for Painters */}
              {activeSleeve.id === 'zoe-painter' && (
                <CreativeExecutor
                  sleeveId={activeSleeve.id}
                  onComplete={handleExecutionComplete}
                />
              )}
              
              {/* Puppet Master Agent for all sleeves */}
              <PuppetMasterAgent />
            </div>
          </motion.div>
        )}

        {phase === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-4"
            >
              <Sparkles className="w-10 h-10 text-green-500" />
            </motion.div>
            <h2 className="text-2xl font-bold mb-2">You Did It!</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              You provided the Soul and Vision. Zoe provided the Hands and Technique.
              Together, you became a professional {activeSleeve?.category || 'creator'}.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleRestart}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Another Role
              </Button>
              <Button>
                <Sparkles className="w-4 h-4 mr-2" />
                Continue Creating
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LifeYouWantJourney;
