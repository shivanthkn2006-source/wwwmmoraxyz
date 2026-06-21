// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 6: ZOE PROACTIVE INSIGHTS
// Zoe proactively offers insights based on patterns, time, location, and context
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type InsightType = 
  | 'reminder'
  | 'wellness_check'
  | 'pattern_observation'
  | 'suggestion'
  | 'celebration'
  | 'encouragement'
  | 'time_based'
  | 'context_aware';

export type InsightPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ProactiveInsight {
  id: string;
  type: InsightType;
  message: string;
  triggerReason: string;
  priority: InsightPriority;
  shouldSpeak: boolean;
  createdAt: Date;
  expiresAt?: Date;
  contextData?: Record<string, unknown>;
}

interface UseProactiveInsightsReturn {
  // State
  pendingInsights: ProactiveInsight[];
  isGenerating: boolean;
  
  // Actions
  generateInsights: () => Promise<ProactiveInsight[]>;
  dismissInsight: (insightId: string) => void;
  getNextInsight: () => ProactiveInsight | null;
  
  // Configuration
  setInsightPreferences: (prefs: InsightPreferences) => void;
}

interface InsightPreferences {
  enableWellnessChecks: boolean;
  enablePatternObservations: boolean;
  enableTimeBased: boolean;
  quietHoursStart?: number; // 0-23
  quietHoursEnd?: number;   // 0-23
  maxInsightsPerHour: number;
}

interface UserPattern {
  type: string;
  frequency: number;
  lastOccurred: Date;
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIME-BASED INSIGHT TRIGGERS
// ═══════════════════════════════════════════════════════════════════════════════

interface TimeBasedTrigger {
  hourRange: [number, number];
  type: InsightType;
  messages: string[];
  priority: InsightPriority;
  shouldSpeak: boolean;
}

const TIME_BASED_TRIGGERS: TimeBasedTrigger[] = [
  {
    hourRange: [6, 8],
    type: 'time_based',
    messages: [
      'Good morning! How are you feeling as you start your day?',
      'Rise and shine! What\'s one thing you\'re looking forward to today?',
      'Morning! Remember to take a moment to stretch before diving in.',
    ],
    priority: 'low',
    shouldSpeak: false,
  },
  {
    hourRange: [12, 14],
    type: 'wellness_check',
    messages: [
      'It\'s midday - have you taken a break to eat something?',
      'Halfway through the day! How\'s your energy level?',
      'Quick check-in: Have you moved around recently?',
    ],
    priority: 'low',
    shouldSpeak: false,
  },
  {
    hourRange: [17, 19],
    type: 'time_based',
    messages: [
      'Evening is approaching - what was the highlight of your day?',
      'Winding down? Remember to take a moment to reflect.',
      'How are you feeling as the day comes to a close?',
    ],
    priority: 'low',
    shouldSpeak: false,
  },
  {
    hourRange: [22, 24],
    type: 'wellness_check',
    messages: [
      'It\'s getting late - remember that rest is important too.',
      'Consider winding down soon. Your body will thank you.',
      'Night time approaching - I hope you had a good day.',
    ],
    priority: 'low',
    shouldSpeak: false,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN-BASED INSIGHTS
// ═══════════════════════════════════════════════════════════════════════════════

interface PatternInsightGenerator {
  pattern: string;
  generator: (data: UserPattern) => ProactiveInsight | null;
}

const PATTERN_GENERATORS: PatternInsightGenerator[] = [
  {
    pattern: 'frequent_late_night',
    generator: (data) => ({
      id: `pattern-${Date.now()}`,
      type: 'pattern_observation' as InsightType,
      message: 'I\'ve noticed you\'ve been active late at night recently. Is everything okay? Remember, I\'m here if you need to talk.',
      triggerReason: 'Detected late-night usage pattern',
      priority: 'medium' as InsightPriority,
      shouldSpeak: false,
      createdAt: new Date(),
      contextData: data.metadata,
    }),
  },
  {
    pattern: 'stress_indicators',
    generator: () => ({
      id: `pattern-${Date.now()}`,
      type: 'encouragement' as InsightType,
      message: 'You\'ve been working hard lately. Remember to take breaks and be kind to yourself. 💙',
      triggerReason: 'Multiple stress indicators detected',
      priority: 'medium' as InsightPriority,
      shouldSpeak: true,
      createdAt: new Date(),
    }),
  },
  {
    pattern: 'positive_streak',
    generator: (data) => ({
      id: `pattern-${Date.now()}`,
      type: 'celebration' as InsightType,
      message: `Amazing! You\'ve been consistently positive for ${data.frequency} days. Keep that beautiful energy going! 🌟`,
      triggerReason: 'Positive emotion streak detected',
      priority: 'low' as InsightPriority,
      shouldSpeak: true,
      createdAt: new Date(),
    }),
  },
  {
    pattern: 'inactivity',
    generator: (data) => {
      const daysSince = Math.floor((Date.now() - data.lastOccurred.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince < 3) return null;
      return {
        id: `pattern-${Date.now()}`,
        type: 'reminder' as InsightType,
        message: `Hey, it's been ${daysSince} days since we last chatted. Just wanted to check in - how are you doing?`,
        triggerReason: 'Extended inactivity detected',
        priority: 'medium' as InsightPriority,
        shouldSpeak: false,
        createdAt: new Date(),
      };
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useProactiveInsights = (): UseProactiveInsightsReturn => {
  const { user } = useAuth();
  const [pendingInsights, setPendingInsights] = useState<ProactiveInsight[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const preferencesRef = useRef<InsightPreferences>({
    enableWellnessChecks: true,
    enablePatternObservations: true,
    enableTimeBased: true,
    quietHoursStart: 23,
    quietHoursEnd: 7,
    maxInsightsPerHour: 2,
  });
  
  const lastInsightTimeRef = useRef<Date | null>(null);
  const insightCountRef = useRef(0);
  const generatedTodayRef = useRef<Set<string>>(new Set());

  // ═══════════════════════════════════════════════════════════════════════════
  // Check if in quiet hours
  // ═══════════════════════════════════════════════════════════════════════════
  
  const isQuietHours = useCallback((): boolean => {
    const prefs = preferencesRef.current;
    if (prefs.quietHoursStart === undefined || prefs.quietHoursEnd === undefined) {
      return false;
    }
    
    const currentHour = new Date().getHours();
    
    if (prefs.quietHoursStart <= prefs.quietHoursEnd) {
      return currentHour >= prefs.quietHoursStart && currentHour < prefs.quietHoursEnd;
    } else {
      // Handles overnight quiet hours (e.g., 23:00 - 07:00)
      return currentHour >= prefs.quietHoursStart || currentHour < prefs.quietHoursEnd;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Rate limiting
  // ═══════════════════════════════════════════════════════════════════════════
  
  const canGenerateInsight = useCallback((): boolean => {
    const prefs = preferencesRef.current;
    
    // Check quiet hours
    if (isQuietHours()) return false;
    
    // Check rate limit
    const now = new Date();
    if (lastInsightTimeRef.current) {
      const hoursSinceLast = (now.getTime() - lastInsightTimeRef.current.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < 1) {
        if (insightCountRef.current >= prefs.maxInsightsPerHour) {
          return false;
        }
      } else {
        // Reset counter for new hour
        insightCountRef.current = 0;
      }
    }
    
    return true;
  }, [isQuietHours]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Generate time-based insight
  // ═══════════════════════════════════════════════════════════════════════════
  
  const generateTimeBasedInsight = useCallback((): ProactiveInsight | null => {
    if (!preferencesRef.current.enableTimeBased) return null;
    
    const currentHour = new Date().getHours();
    const today = new Date().toDateString();
    
    for (const trigger of TIME_BASED_TRIGGERS) {
      const [start, end] = trigger.hourRange;
      
      if (currentHour >= start && currentHour < end) {
        const triggerId = `${trigger.type}-${start}-${end}`;
        
        // Only one per time window per day
        if (generatedTodayRef.current.has(triggerId)) continue;
        
        const randomMessage = trigger.messages[Math.floor(Math.random() * trigger.messages.length)];
        
        generatedTodayRef.current.add(triggerId);
        
        return {
          id: `time-${Date.now()}`,
          type: trigger.type,
          message: randomMessage,
          triggerReason: `Time-based trigger: ${start}:00-${end}:00`,
          priority: trigger.priority,
          shouldSpeak: trigger.shouldSpeak,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + (end - currentHour) * 60 * 60 * 1000),
        };
      }
    }
    
    // Reset daily generated insights at midnight
    if (generatedTodayRef.current.size > 0) {
      const lastReset = localStorage.getItem('zoe_insights_reset_date');
      if (lastReset !== today) {
        generatedTodayRef.current.clear();
        localStorage.setItem('zoe_insights_reset_date', today);
      }
    }
    
    return null;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Analyze user patterns from database
  // ═══════════════════════════════════════════════════════════════════════════
  
  const analyzeUserPatterns = useCallback(async (): Promise<UserPattern[]> => {
    if (!user?.id) return [];
    
    const patterns: UserPattern[] = [];
    
    try {
      // Check for late night activity
      const { data: lateNightMessages } = await supabase
        .from('zoe_infinity_memories')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (lateNightMessages) {
        const lateNightCount = lateNightMessages.filter(m => {
          const hour = new Date(m.created_at).getHours();
          return hour >= 23 || hour < 5;
        }).length;
        
        if (lateNightCount >= 5) {
          patterns.push({
            type: 'frequent_late_night',
            frequency: lateNightCount,
            lastOccurred: new Date(lateNightMessages[0]?.created_at || Date.now()),
            metadata: { count: lateNightCount },
          });
        }
      }
      
      // Check for stress indicators in recent memories
      const { data: recentMemories } = await supabase
        .from('zoe_infinity_memories')
        .select('value, memory_type')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());
      
      if (recentMemories) {
        const stressKeywords = ['stressed', 'anxious', 'worried', 'overwhelmed', 'tired', 'exhausted'];
        const stressCount = recentMemories.filter(m => 
          stressKeywords.some(k => m.value.toLowerCase().includes(k))
        ).length;
        
        if (stressCount >= 3) {
          patterns.push({
            type: 'stress_indicators',
            frequency: stressCount,
            lastOccurred: new Date(),
          });
        }
      }
      
      // Check for positive streak
      const { data: conversations } = await supabase
        .from('zoe_infinity_conversations')
        .select('emotional_arc, session_date')
        .eq('user_id', user.id)
        .order('session_date', { ascending: false })
        .limit(7);
      
      if (conversations) {
        const positiveCount = conversations.filter(c => 
          c.emotional_arc?.includes('positive') || c.emotional_arc?.includes('happy')
        ).length;
        
        if (positiveCount >= 3) {
          patterns.push({
            type: 'positive_streak',
            frequency: positiveCount,
            lastOccurred: new Date(),
          });
        }
      }
      
      // Check for inactivity
      const { data: lastActivity } = await supabase
        .from('zoe_infinity_conversations')
        .select('session_date')
        .eq('user_id', user.id)
        .order('session_date', { ascending: false })
        .limit(1)
        .single();
      
      if (lastActivity) {
        patterns.push({
          type: 'inactivity',
          frequency: 1,
          lastOccurred: new Date(lastActivity.session_date),
        });
      }
      
    } catch (e) {
      console.error('[ProactiveInsights] Pattern analysis failed:', e);
    }
    
    return patterns;
  }, [user?.id]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Generate pattern-based insights
  // ═══════════════════════════════════════════════════════════════════════════
  
  const generatePatternInsights = useCallback(async (): Promise<ProactiveInsight[]> => {
    if (!preferencesRef.current.enablePatternObservations) return [];
    
    const patterns = await analyzeUserPatterns();
    const insights: ProactiveInsight[] = [];
    
    for (const pattern of patterns) {
      const generator = PATTERN_GENERATORS.find(g => g.pattern === pattern.type);
      if (generator) {
        const insight = generator.generator(pattern);
        if (insight) {
          insights.push(insight);
        }
      }
    }
    
    return insights;
  }, [analyzeUserPatterns]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Main insight generation
  // ═══════════════════════════════════════════════════════════════════════════
  
  const generateInsights = useCallback(async (): Promise<ProactiveInsight[]> => {
    if (!canGenerateInsight()) {
      console.log('[ProactiveInsights] Skipping - rate limited or quiet hours');
      return [];
    }
    
    setIsGenerating(true);
    const newInsights: ProactiveInsight[] = [];
    
    try {
      // Time-based insight
      const timeInsight = generateTimeBasedInsight();
      if (timeInsight) {
        newInsights.push(timeInsight);
      }
      
      // Pattern-based insights
      const patternInsights = await generatePatternInsights();
      newInsights.push(...patternInsights);
      
      // Update state and tracking
      if (newInsights.length > 0) {
        setPendingInsights(prev => [...newInsights, ...prev]);
        lastInsightTimeRef.current = new Date();
        insightCountRef.current += newInsights.length;
        
        console.log(`[ProactiveInsights] Generated ${newInsights.length} insights`);
      }
      
    } catch (e) {
      console.error('[ProactiveInsights] Generation failed:', e);
    } finally {
      setIsGenerating(false);
    }
    
    return newInsights;
  }, [canGenerateInsight, generateTimeBasedInsight, generatePatternInsights]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Dismiss insight
  // ═══════════════════════════════════════════════════════════════════════════
  
  const dismissInsight = useCallback((insightId: string) => {
    setPendingInsights(prev => prev.filter(i => i.id !== insightId));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Get next insight
  // ═══════════════════════════════════════════════════════════════════════════
  
  const getNextInsight = useCallback((): ProactiveInsight | null => {
    // Filter expired insights
    const now = new Date();
    const validInsights = pendingInsights.filter(i => 
      !i.expiresAt || i.expiresAt > now
    );
    
    // Sort by priority
    const priorityOrder: Record<InsightPriority, number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    
    const sorted = validInsights.sort((a, b) => 
      priorityOrder[a.priority] - priorityOrder[b.priority]
    );
    
    return sorted[0] || null;
  }, [pendingInsights]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Set preferences
  // ═══════════════════════════════════════════════════════════════════════════
  
  const setInsightPreferences = useCallback((prefs: InsightPreferences) => {
    preferencesRef.current = prefs;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Auto-generate insights periodically
  // ═══════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    if (!user?.id) return;
    
    // Initial generation after short delay
    const initialTimer = setTimeout(() => {
      generateInsights();
    }, 5000);
    
    // Periodic generation every 30 minutes
    const periodicTimer = setInterval(() => {
      generateInsights();
    }, 30 * 60 * 1000);
    
    return () => {
      clearTimeout(initialTimer);
      clearInterval(periodicTimer);
    };
  }, [user?.id, generateInsights]);

  return {
    pendingInsights,
    isGenerating,
    generateInsights,
    dismissInsight,
    getNextInsight,
    setInsightPreferences,
  };
};

export default useProactiveInsights;
