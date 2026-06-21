import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, Brain, Zap, Target, TrendingUp, Lightbulb } from 'lucide-react';
import { useZoeAgent } from '@/hooks/useZoeAgent';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

/**
 * ZoeAgentPanel - Advanced agentic AI interface
 * 
 * Showcases Zoe's true agentic capabilities:
 * - Autonomous decision-making
 * - Multi-step reasoning
 * - Proactive suggestions
 * - Tool-assisted operations
 */
export const ZoeAgentPanel = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const { 
    analyzeAndSuggest, 
    planAndExecute, 
    suggestActions,
    optimizeWorkflow,
    personalizedRecommendations,
    autonomousAssist 
  } = useZoeAgent();

  const agenticCapabilities = [
    {
      icon: <Brain className="w-4 h-4" />,
      title: 'Analyze & Suggest',
      description: 'Deep analysis with actionable insights',
      action: () => {
        analyzeAndSuggest('my current activity and engagement patterns');
        toast.success('Zoe is analyzing your patterns...');
      }
    },
    {
      icon: <Target className="w-4 h-4" />,
      title: 'Plan & Execute',
      description: 'Create and execute complex plans',
      action: () => {
        planAndExecute('improve my social engagement on the platform');
        toast.success('Zoe is creating your personalized plan...');
      }
    },
    {
      icon: <Lightbulb className="w-4 h-4" />,
      title: 'Smart Suggestions',
      description: 'Context-aware recommendations',
      action: () => {
        suggestActions();
        toast.success('Zoe is generating suggestions...');
      }
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      title: 'Optimize Workflow',
      description: 'Enhance your daily routine',
      action: () => {
        optimizeWorkflow();
        toast.success('Zoe is optimizing your experience...');
      }
    },
    {
      icon: <Sparkles className="w-4 h-4" />,
      title: 'Personalized AI',
      description: 'Tailored recommendations',
      action: () => {
        personalizedRecommendations();
        toast.success('Zoe is preparing personalized insights...');
      }
    },
    {
      icon: <Zap className="w-4 h-4" />,
      title: 'Autonomous Mode',
      description: 'Let Zoe work autonomously',
      action: () => {
        autonomousAssist('help me get the most out of the platform');
        toast.success('Zoe is now in autonomous assistance mode...');
      }
    }
  ];

  // Only show on home page and when user is authenticated
  if (location.pathname !== '/home' || !user) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-6 z-50">
      {/* Floating Action Button - Half size */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="relative"
      >
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          size="sm"
          className="rounded-full w-8 h-8 shadow-lg bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 hover:shadow-purple-500/50 transition-all duration-300 p-0"
        >
          <Brain className="w-4 h-4" />
        </Button>
      </motion.div>

      {/* Expanded Panel */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="absolute bottom-12 right-0 w-72"
        >
          <Card className="p-4 bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Zoe Agent</h3>
                  <p className="text-[10px] text-muted-foreground">True Agentic AI</p>
                </div>
              </div>

              <div className="space-y-1">
                {agenticCapabilities.map((capability, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 hover:bg-accent/50 transition-all h-auto py-2"
                      onClick={capability.action}
                    >
                      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                        {capability.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-xs font-medium">{capability.title}</p>
                        <p className="text-[10px] text-muted-foreground">{capability.description}</p>
                      </div>
                    </Button>
                  </motion.div>
                ))}
              </div>

              <div className="pt-3 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground text-center">
                  Advanced Neural Intelligence
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
};