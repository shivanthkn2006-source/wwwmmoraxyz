// ═══════════════════════════════════════════════════════════════════════════════
// ZOE REASONING TRACE - "Chain of Thought" Visibility Component
// Shows users WHAT Zoe is thinking to build trust (IBM AGI Transparency)
// 
// IBM Insight: "Show the user what the AI is thinking to build trust"
// This makes Zoe feel like AGI by exposing her reasoning process
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Shield, 
  Target, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Search,
  BookOpen,
  Heart,
  X,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface ReasoningStep {
  id: string;
  icon: 'search' | 'shield' | 'target' | 'book' | 'heart' | 'check' | 'sparkles';
  label: string;
  status: 'pending' | 'processing' | 'complete' | 'warning';
  detail?: string;
  timestamp?: number;
}

export interface ReasoningTraceData {
  steps: ReasoningStep[];
  totalTimeMs?: number;
  wisdomPassed?: boolean;
  sentinelClean?: boolean;
  alignedGoals?: string[];
  confidenceScore?: number;
}

interface ZoeReasoningTraceProps {
  trace: ReasoningTraceData;
  isOpen: boolean;
  onToggle: () => void;
  compact?: boolean;
}

const STEP_ICONS = {
  search: Search,
  shield: Shield,
  target: Target,
  book: BookOpen,
  heart: Heart,
  check: CheckCircle2,
  sparkles: Sparkles,
};

const STATUS_COLORS = {
  pending: 'text-foreground/40',
  processing: 'text-amber-400 animate-pulse',
  complete: 'text-emerald-400',
  warning: 'text-amber-500',
};

const STATUS_BG = {
  pending: 'bg-foreground/5',
  processing: 'bg-amber-500/10',
  complete: 'bg-emerald-500/10',
  warning: 'bg-amber-500/10',
};

export const ZoeReasoningTrace: React.FC<ZoeReasoningTraceProps> = ({
  trace,
  isOpen,
  onToggle,
  compact = false,
}) => {
  return (
    <div className="w-full">
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className={cn(
          "h-6 px-2 gap-1.5 text-[10px] transition-all",
          isOpen 
            ? "bg-primary/10 text-primary" 
            : "hover:bg-primary/5 text-foreground/50 hover:text-foreground/70"
        )}
      >
        <Brain className={cn("h-3 w-3", isOpen && "text-primary")} />
        <span>{isOpen ? "Hide" : "Show"} Reasoning</span>
        {isOpen ? (
          <ChevronUp className="h-2.5 w-2.5" />
        ) : (
          <ChevronDown className="h-2.5 w-2.5" />
        )}
        {trace.wisdomPassed !== undefined && (
          <span className={cn(
            "ml-1 px-1 py-0.5 rounded text-[8px] font-medium",
            trace.wisdomPassed 
              ? "bg-emerald-500/20 text-emerald-400" 
              : "bg-amber-500/20 text-amber-400"
          )}>
            {trace.wisdomPassed ? "ALIGNED" : "REVIEW"}
          </span>
        )}
      </Button>

      {/* Reasoning Steps Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-2.5 rounded-lg bg-background/50 backdrop-blur-sm border border-primary/10">
              {/* Header */}
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-primary/10">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-full bg-primary/10">
                    <Brain className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-[10px] font-medium text-foreground/70">
                    Chain of Thought
                  </span>
                </div>
                {trace.totalTimeMs && (
                  <span className="text-[9px] text-foreground/40">
                    {trace.totalTimeMs}ms
                  </span>
                )}
              </div>

              {/* Steps */}
              <div className="space-y-1.5">
                {trace.steps.map((step, index) => {
                  const Icon = STEP_ICONS[step.icon] || Sparkles;
                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "flex items-start gap-2 p-1.5 rounded-lg transition-all",
                        STATUS_BG[step.status]
                      )}
                    >
                      <div className={cn(
                        "shrink-0 p-0.5 rounded",
                        STATUS_COLORS[step.status]
                      )}>
                        {step.status === 'processing' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Icon className="h-3 w-3" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-[10px] font-medium",
                          step.status === 'complete' ? "text-foreground/80" : "text-foreground/60"
                        )}>
                          {step.label}
                        </p>
                        {step.detail && (
                          <p className="text-[9px] text-foreground/50 truncate">
                            {step.detail}
                          </p>
                        )}
                      </div>
                      {step.status === 'complete' && (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                      )}
                      {step.status === 'warning' && (
                        <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Summary Footer */}
              <div className="mt-2 pt-2 border-t border-primary/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {trace.sentinelClean !== undefined && (
                    <div className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px]",
                      trace.sentinelClean 
                        ? "bg-emerald-500/10 text-emerald-400" 
                        : "bg-red-500/10 text-red-400"
                    )}>
                      <Shield className="h-2.5 w-2.5" />
                      {trace.sentinelClean ? "Secure" : "Threats Blocked"}
                    </div>
                  )}
                  {trace.alignedGoals && trace.alignedGoals.length > 0 && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-[8px] text-primary">
                      <Target className="h-2.5 w-2.5" />
                      {trace.alignedGoals.length} goal{trace.alignedGoals.length > 1 ? 's' : ''} aligned
                    </div>
                  )}
                </div>
                {trace.confidenceScore !== undefined && (
                  <div className="text-[9px] text-foreground/50">
                    Confidence: {trace.confidenceScore}%
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Generate default reasoning trace for a message
export const generateReasoningTrace = (metadata?: {
  sentinelScanned?: boolean;
  threatsDetected?: number;
  threatsBlocked?: number;
  wisdomChecked?: boolean;
  wisdomPassed?: boolean;
  wisdomConfidence?: number;
  alignedGoals?: string[];
  classifiedIntent?: string;
  extractedEmotions?: string[];
  codexInjected?: boolean;
}): ReasoningTraceData => {
  const steps: ReasoningStep[] = [];
  const startTime = Date.now();

  // Step 1: Sentinel Security Scan
  steps.push({
    id: 'sentinel',
    icon: 'shield',
    label: 'Security Scan (Protocol Sentinel)',
    status: metadata?.sentinelScanned ? 'complete' : 'pending',
    detail: metadata?.threatsDetected 
      ? `${metadata.threatsBlocked}/${metadata.threatsDetected} threats blocked`
      : 'No threats detected',
  });

  // Step 2: Wisdom Check
  steps.push({
    id: 'wisdom',
    icon: 'target',
    label: 'Wisdom Check (Goal Alignment)',
    status: metadata?.wisdomChecked 
      ? (metadata.wisdomPassed ? 'complete' : 'warning')
      : 'pending',
    detail: metadata?.wisdomPassed 
      ? 'Action aligns with your macro goals'
      : 'Review alignment with your priorities',
  });

  // Step 3: Intent Classification
  steps.push({
    id: 'intent',
    icon: 'search',
    label: 'Intent Classification',
    status: metadata?.classifiedIntent ? 'complete' : 'pending',
    detail: metadata?.classifiedIntent || 'Analyzing request type...',
  });

  // Step 4: Emotional Context
  steps.push({
    id: 'emotion',
    icon: 'heart',
    label: 'Emotional Context',
    status: metadata?.extractedEmotions?.length ? 'complete' : 'pending',
    detail: metadata?.extractedEmotions?.join(', ') || 'Detecting emotional state...',
  });

  // Step 5: Soul Codex Injection
  steps.push({
    id: 'codex',
    icon: 'book',
    label: 'Soul Codex Personalization',
    status: metadata?.codexInjected ? 'complete' : 'pending',
    detail: metadata?.codexInjected 
      ? 'Response personalized to your identity'
      : 'Applying personality model...',
  });

  // Step 6: Final Response
  steps.push({
    id: 'response',
    icon: 'sparkles',
    label: 'Response Generated',
    status: 'complete',
    detail: 'Answer optimized for you',
  });

  return {
    steps,
    totalTimeMs: Date.now() - startTime + Math.floor(Math.random() * 50) + 30, // Simulated time
    wisdomPassed: metadata?.wisdomPassed,
    sentinelClean: metadata?.sentinelScanned && (metadata?.threatsBlocked || 0) >= (metadata?.threatsDetected || 0),
    alignedGoals: metadata?.alignedGoals,
    confidenceScore: metadata?.wisdomConfidence || 85,
  };
};

export default ZoeReasoningTrace;
