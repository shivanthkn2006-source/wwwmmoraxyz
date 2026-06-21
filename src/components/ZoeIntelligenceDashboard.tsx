import React, { useState } from 'react';
import { useZoeIntelligence } from '@/hooks/useZoeIntelligence';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Brain, Target, Heart, TrendingUp, Sparkles, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

export const ZoeIntelligenceDashboard = () => {
  const {
    loading,
    contextualMemory,
    activeGoals,
    emotionalIntelligence,
    performanceMetrics,
    getProactiveSuggestions
  } = useZoeIntelligence();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    goals: true,
    memory: false,
    emotional: false,
    performance: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const proactiveSuggestions = getProactiveSuggestions();

  if (loading) {
    return (
      <Card className="glassmorphic p-6">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-primary animate-pulse" />
          <p className="text-foreground/70">Loading Zoe Intelligence...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glassmorphic p-6 rounded-xl border border-border/50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Zoe Intelligence Dashboard</h3>
              <p className="text-sm text-muted-foreground">Your adaptive AI learning profile</p>
            </div>
          </div>
          {performanceMetrics && (
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {Math.round(performanceMetrics.overall_satisfaction_score * 100)}%
              </div>
              <p className="text-xs text-muted-foreground">Overall Satisfaction</p>
            </div>
          )}
        </div>

        {/* Proactive Suggestions */}
        {proactiveSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 space-y-2"
          >
            {proactiveSuggestions.slice(0, 2).map((suggestion, idx) => (
              <div key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground">{suggestion}</p>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Active Goals Section */}
      <Collapsible open={expandedSections.goals} onOpenChange={() => toggleSection('goals')}>
        <Card className="glassmorphic border-border/50">
          <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-accent/5 transition-colors">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Active Goals</span>
              <Badge variant="secondary">{activeGoals.length}</Badge>
            </div>
            {expandedSections.goals ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="p-4 pt-0 space-y-3">
              {activeGoals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active goals. Create one to let Zoe help you achieve it!
                </p>
              ) : (
                <AnimatePresence>
                  {activeGoals.map((goal, idx) => (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{goal.goal_description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {goal.goal_category}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {goal.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-semibold text-primary">{goal.current_progress_percentage}%</span>
                        </div>
                        <Progress value={goal.current_progress_percentage} className="h-2" />
                      </div>

                      {goal.zoe_interventions && goal.zoe_interventions.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Zoe helped {goal.zoe_interventions.length} times
                        </p>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Emotional Intelligence Section */}
      <Collapsible open={expandedSections.emotional} onOpenChange={() => toggleSection('emotional')}>
        <Card className="glassmorphic border-border/50">
          <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-accent/5 transition-colors">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Emotional Intelligence</span>
            </div>
            {expandedSections.emotional ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            {emotionalIntelligence && (
              <div className="p-4 pt-0 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                  <span className="text-sm text-muted-foreground">Current Sentiment</span>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={(emotionalIntelligence.current_sentiment + 1) * 50} 
                      className="w-24 h-2" 
                    />
                    <span className="text-sm font-semibold text-primary">
                      {emotionalIntelligence.current_sentiment > 0 ? '😊' : emotionalIntelligence.current_sentiment < 0 ? '😔' : '😐'}
                    </span>
                  </div>
                </div>

                {emotionalIntelligence.emotional_patterns && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Patterns</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded bg-background/50 border border-border/50">
                        <p className="text-xs text-muted-foreground">Morning</p>
                        <p className="text-sm font-medium text-foreground capitalize">
                          {emotionalIntelligence.emotional_patterns.morning_mood}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-background/50 border border-border/50">
                        <p className="text-xs text-muted-foreground">Evening</p>
                        <p className="text-sm font-medium text-foreground capitalize">
                          {emotionalIntelligence.emotional_patterns.evening_mood}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {emotionalIntelligence.detected_emotions && emotionalIntelligence.detected_emotions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Detected Emotions</p>
                    <div className="flex flex-wrap gap-2">
                      {emotionalIntelligence.detected_emotions.slice(0, 6).map((emotion, idx) => (
                        <Badge key={idx} variant="secondary" className="capitalize">
                          {emotion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Performance Metrics Section */}
      <Collapsible open={expandedSections.performance} onOpenChange={() => toggleSection('performance')}>
        <Card className="glassmorphic border-border/50">
          <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-accent/5 transition-colors">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Zoe Performance</span>
            </div>
            {expandedSections.performance ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            {performanceMetrics && (
              <div className="p-4 pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Suggestion Acceptance</p>
                    <p className="text-xl font-bold text-primary">
                      {Math.round(performanceMetrics.suggestion_acceptance_rate * 100)}%
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Command Success</p>
                    <p className="text-xl font-bold text-primary">
                      {Math.round(performanceMetrics.command_success_rate * 100)}%
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Total Interactions</p>
                  <p className="text-2xl font-bold text-foreground">{performanceMetrics.total_interactions}</p>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-muted-foreground">
                    Zoe is learning from every interaction to serve you better. The more you use Zoe, the smarter it becomes!
                  </p>
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Memory Insights */}
      <Collapsible open={expandedSections.memory} onOpenChange={() => toggleSection('memory')}>
        <Card className="glassmorphic border-border/50">
          <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-accent/5 transition-colors">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Contextual Memory</span>
            </div>
            {expandedSections.memory ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            {contextualMemory && (
              <div className="p-4 pt-0 space-y-3">
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-2">What Zoe Remembers</p>
                  <div className="space-y-1">
                    <p className="text-sm text-foreground">
                      • {contextualMemory.conversation_topics?.length || 0} conversation topics
                    </p>
                    <p className="text-sm text-foreground">
                      • {contextualMemory.successful_interactions?.length || 0} successful interactions
                    </p>
                    <p className="text-sm text-foreground">
                      • {Object.keys(contextualMemory.key_decisions || {}).length} key decisions remembered
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Zoe builds context over time to provide increasingly personalized assistance.
                </p>
              </div>
            )}
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};
