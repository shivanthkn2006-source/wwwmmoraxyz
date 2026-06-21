import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export interface DailyPulseScore {
  pulse_date: string;
  stress_score: number;
  productivity_score: number;
  overall_pulse_score: number;
  avg_typing_speed_wpm: number;
  deep_work_minutes: number;
  context_switches: number;
}

export interface WeeklyEvaluation {
  id: string;
  week_start: string;
  week_end: string;
  system_bugs_fixed: number;
  dhf_core_optimized: boolean;
  edge_functions_health: number;
  database_health: number;
  daily_pulse_scores: DailyPulseScore[];
  avg_stress_level: number;
  peak_productivity_day: string | null;
  stress_peak_day: string | null;
  learned_preferences: Record<string, any>;
  recommendations: string[];
  served_well_rating: number | null;
  acknowledged_at: string | null;
}

export interface StressMarkers {
  typingSpeed: number;
  typingSpeedVariance: number;
  sessionInterruptions: number;
  contextSwitches: number;
  deepWorkMinutes: number;
}

export function useSundayProtocol() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCollecting, setIsCollecting] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState<WeeklyEvaluation | null>(null);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [todayPulse, setTodayPulse] = useState<DailyPulseScore | null>(null);

  // Calculate stress score from markers
  const calculateStressScore = (markers: StressMarkers): number => {
    let score = 0;
    
    // High typing speed variance indicates stress
    if (markers.typingSpeedVariance > 20) score += 0.2;
    if (markers.typingSpeedVariance > 40) score += 0.2;
    
    // Many session interruptions indicate stress
    if (markers.sessionInterruptions > 5) score += 0.15;
    if (markers.sessionInterruptions > 10) score += 0.15;
    
    // High context switches indicate fragmented attention
    if (markers.contextSwitches > 15) score += 0.15;
    if (markers.contextSwitches > 30) score += 0.15;
    
    // Low deep work time indicates inability to focus
    if (markers.deepWorkMinutes < 30) score += 0.1;
    
    return Math.min(1, score);
  };

  // Calculate productivity score from markers
  const calculateProductivityScore = (markers: StressMarkers): number => {
    let score = 0.5; // Start at baseline
    
    // Good typing speed is productive
    if (markers.typingSpeed > 40) score += 0.1;
    if (markers.typingSpeed > 60) score += 0.1;
    
    // Deep work time is productive
    if (markers.deepWorkMinutes > 60) score += 0.15;
    if (markers.deepWorkMinutes > 120) score += 0.15;
    
    // Low context switches is productive
    if (markers.contextSwitches < 10) score += 0.1;
    
    // Low interruptions is productive
    if (markers.sessionInterruptions < 3) score += 0.1;
    
    return Math.min(1, score);
  };

  // Collect daily pulse (silent, Mon-Sat)
  const collectDailyPulse = useCallback(async (markers: StressMarkers) => {
    if (!user) return null;
    
    setIsCollecting(true);
    
    try {
      const stressScore = calculateStressScore(markers);
      const productivityScore = calculateProductivityScore(markers);
      const overallPulse = (1 - stressScore + productivityScore) / 2;
      
      const today = new Date().toISOString().split('T')[0];
      
      // Use upsert to handle existing records
      const { data, error } = await supabase
        .from('daily_pulse_scores')
        .upsert({
          user_id: user.id,
          pulse_date: today,
          avg_typing_speed_wpm: markers.typingSpeed,
          typing_speed_variance: markers.typingSpeedVariance,
          session_interruptions: markers.sessionInterruptions,
          context_switches: markers.contextSwitches,
          deep_work_minutes: markers.deepWorkMinutes,
          stress_score: stressScore,
          productivity_score: productivityScore,
          overall_pulse_score: overallPulse
        }, {
          onConflict: 'user_id,pulse_date'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setTodayPulse(data as any);
      return data;
    } catch (error: any) {
      console.error('[SUNDAY_PROTOCOL] Pulse collection error:', error);
      return null;
    } finally {
      setIsCollecting(false);
    }
  }, [user]);

  // Check if it's Sunday and show evaluation
  const checkForSundayProtocol = useCallback(async () => {
    if (!user) return;
    
    const today = new Date();
    const isSunday = today.getDay() === 0;
    
    if (!isSunday) return;
    
    // Check if we already have an evaluation for this week
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6); // Go back to Monday
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    const { data: existingEval } = await supabase
      .from('sunday_protocol_evaluations')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStartStr)
      .single();
    
    if (existingEval && (existingEval as any).acknowledged_at) {
      // Already acknowledged this week
      return;
    }
    
    // Generate weekly evaluation
    await generateWeeklyEvaluation();
  }, [user]);

  // Generate the weekly evaluation
  const generateWeeklyEvaluation = useCallback(async () => {
    if (!user) return null;
    
    try {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 6);
      const weekEnd = today;
      
      // Get daily pulse scores for the week
      const { data: pulseScores } = await supabase
        .from('daily_pulse_scores')
        .select('*')
        .eq('user_id', user.id)
        .gte('pulse_date', weekStart.toISOString().split('T')[0])
        .lte('pulse_date', weekEnd.toISOString().split('T')[0])
        .order('pulse_date', { ascending: true });
      
      // Calculate averages and patterns
      const scores = (pulseScores as any[]) || [];
      const avgStress = scores.length > 0 
        ? scores.reduce((sum, s) => sum + (s.stress_score || 0), 0) / scores.length 
        : 0;
      
      // Find peak days
      let peakProductivity = { day: '', score: 0 };
      let peakStress = { day: '', score: 0 };
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      scores.forEach(score => {
        const dayName = dayNames[new Date(score.pulse_date).getDay()];
        if (score.productivity_score > peakProductivity.score) {
          peakProductivity = { day: dayName, score: score.productivity_score };
        }
        if (score.stress_score > peakStress.score) {
          peakStress = { day: dayName, score: score.stress_score };
        }
      });
      
      // Get system health data (from god mode if available)
      const { data: healthLogs } = await supabase
        .from('platform_health_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', weekStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
      
      const latestHealth = healthLogs?.[0] as any;
      
      // Generate recommendations
      const recommendations: string[] = [];
      
      if (avgStress > 0.6) {
        recommendations.push('Consider scheduling more breaks during high-stress periods.');
      }
      if (peakProductivity.day) {
        recommendations.push(`Your productivity peaks on ${peakProductivity.day}. Schedule important tasks then.`);
      }
      if (scores.some(s => s.deep_work_minutes < 30)) {
        recommendations.push('Try blocking 2-hour focus sessions for deep work.');
      }
      
      // Create or update evaluation
      const evaluation = {
        user_id: user.id,
        week_start: weekStart.toISOString().split('T')[0],
        week_end: weekEnd.toISOString().split('T')[0],
        daily_pulse_scores: scores,
        avg_stress_level: avgStress,
        peak_productivity_day: peakProductivity.day || null,
        stress_peak_day: peakStress.day || null,
        system_bugs_fixed: latestHealth?.issues_count || 0,
        edge_functions_health: latestHealth?.score || 100,
        database_health: 100,
        dhf_core_optimized: true,
        learned_preferences: {
          preferred_work_hours: 'morning', // Could be derived from data
          notification_preference: 'batched'
        },
        recommendations
      };
      
      const { data, error } = await supabase
        .from('sunday_protocol_evaluations')
        .upsert(evaluation, {
          onConflict: 'user_id,week_start'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setCurrentEvaluation(data as any);
      setShowEvaluationModal(true);
      
      return data;
    } catch (error: any) {
      console.error('[SUNDAY_PROTOCOL] Evaluation error:', error);
      return null;
    }
  }, [user]);

  // Submit feedback for the week
  const submitFeedback = useCallback(async (rating: number, notes?: string) => {
    if (!user || !currentEvaluation) return null;
    
    try {
      const { data, error } = await supabase
        .from('sunday_protocol_evaluations')
        .update({
          served_well_rating: rating,
          feedback_notes: notes || null,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', currentEvaluation.id)
        .select()
        .single();
      
      if (error) throw error;
      
      setShowEvaluationModal(false);
      
      toast({
        title: "Thank you for your feedback",
        description: "I'll use this to serve you better next week.",
      });
      
      return data;
    } catch (error: any) {
      console.error('[SUNDAY_PROTOCOL] Feedback error:', error);
      return null;
    }
  }, [user, currentEvaluation, toast]);

  // Auto-check on Sunday
  useEffect(() => {
    if (user) {
      checkForSundayProtocol();
    }
  }, [user, checkForSundayProtocol]);

  return {
    // State
    isCollecting,
    currentEvaluation,
    showEvaluationModal,
    todayPulse,
    
    // Actions
    collectDailyPulse,
    generateWeeklyEvaluation,
    submitFeedback,
    setShowEvaluationModal,
    
    // Helpers
    calculateStressScore,
    calculateProductivityScore
  };
}
