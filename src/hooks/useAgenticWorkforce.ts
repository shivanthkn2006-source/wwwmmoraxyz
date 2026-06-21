// ═══════════════════════════════════════════════════════════════════════════════
// ZOE AGENTIC WORKFORCE - Background Simulation Engine
// "While You Slept" - Passive AI earning system integrated with DHF
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface AgentJob {
  id: string;
  job_type: string;
  title: string;
  description: string;
  required_skills: Record<string, number> | unknown;
  reward_credits: number;
  reward_karma: number;
  difficulty: string;
  estimated_duration_hours: number;
  current_agents: number;
  max_agents: number | null;
}

export interface AgentDeployment {
  id: string;
  job_id: string;
  status: string;
  deployed_at: string;
  estimated_completion_at: string;
  completed_at: string | null;
  success_probability: number;
  actual_success: boolean | null;
  credits_earned: number;
  karma_earned: number;
  experience_gained: number;
  job?: AgentJob | null;
}

export interface AgentStats {
  id: string;
  user_id: string;
  total_credits: number;
  total_karma: number;
  experience_level: number;
  total_experience: number;
  jobs_completed: number;
  jobs_failed: number;
  current_status: 'idle' | 'deployed' | 'training';
  skill_creativity: number;
  skill_logic: number;
  skill_empathy: number;
  skill_security: number;
  last_deployment_at: string | null;
}

export interface UnnotifiedEarning {
  id: string;
  credits_amount: number;
  karma_amount: number;
  source_description: string;
  earned_at: string;
}

export const useAgenticWorkforce = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [jobs, setJobs] = useState<AgentJob[]>([]);
  const [activeDeployments, setActiveDeployments] = useState<AgentDeployment[]>([]);
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null);
  const [unnotifiedEarnings, setUnnotifiedEarnings] = useState<UnnotifiedEarning[]>([]);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load job market
  const loadJobs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('zoe_job_market')
        .select('*')
        .eq('is_active', true)
        .order('reward_credits', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error('[AgenticWorkforce] Failed to load jobs:', err);
    }
  }, []);

  // Load agent stats
  const loadAgentStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('zoe_agent_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAgentStats(data as AgentStats);
      } else {
        // Initialize agent stats for new users
        const { data: newStats, error: insertError } = await supabase
          .from('zoe_agent_stats')
          .insert({
            user_id: user.id,
            total_credits: 0,
            total_karma: 0,
            experience_level: 1,
            total_experience: 0,
            jobs_completed: 0,
            jobs_failed: 0,
            current_status: 'idle',
            skill_creativity: 0.5,
            skill_logic: 0.5,
            skill_empathy: 0.5,
            skill_security: 0.5
          })
          .select()
          .single();

        if (!insertError && newStats) {
          setAgentStats(newStats as AgentStats);
        }
      }
    } catch (err) {
      console.error('[AgenticWorkforce] Failed to load agent stats:', err);
    }
  }, [user?.id]);

  // Load active deployments
  const loadActiveDeployments = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('zoe_agent_deployments')
        .select(`
          *,
          job:zoe_job_market(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'deployed')
        .order('deployed_at', { ascending: false });

      if (error) throw error;
      setActiveDeployments(data || []);
    } catch (err) {
      console.error('[AgenticWorkforce] Failed to load deployments:', err);
    }
  }, [user?.id]);

  // Check for completed deployments and "while you slept" earnings
  const checkCompletedDeployments = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Check for deployments that should be completed
      const { data: pendingDeployments, error: deployError } = await supabase
        .from('zoe_agent_deployments')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'deployed')
        .lte('estimated_completion_at', new Date().toISOString());

      if (deployError) throw deployError;

      // Complete each pending deployment
      for (const deployment of pendingDeployments || []) {
        const { data: result } = await supabase.rpc('complete_agent_deployment', {
          p_deployment_id: deployment.id
        });

        const resultObj = result as Record<string, unknown> | null;
        if (resultObj?.success) {
          // Log to DHF
          await supabase.from('behavioral_events').insert([{
            user_id: user.id,
            event_type: 'agent_job_completed',
            event_category: 'agentic_economy',
            metadata: {
              job_id: deployment.job_id,
              success: String(resultObj.job_success),
              credits_earned: Number(resultObj.credits_earned) || 0,
              karma_earned: Number(resultObj.karma_earned) || 0,
              experience_gained: Number(resultObj.experience_gained) || 0
            },
            dhf_logged: true
          }]);
        }
      }

      // Check for unnotified earnings
      const { data: earnings, error: earningsError } = await supabase
        .from('agentic_earnings')
        .select('*')
        .eq('user_id', user.id)
        .eq('notified', false)
        .order('earned_at', { ascending: false });

      if (!earningsError && earnings?.length > 0) {
        setUnnotifiedEarnings(earnings);
      }

      // Reload all data
      await Promise.all([loadAgentStats(), loadActiveDeployments()]);
    } catch (err) {
      console.error('[AgenticWorkforce] Failed to check completions:', err);
    }
  }, [user?.id, loadAgentStats, loadActiveDeployments]);

  // Deploy agent to a job
  const deployAgent = useCallback(async (jobId: string): Promise<boolean> => {
    if (!user?.id || !agentStats) {
      toast.error('Agent not initialized');
      return false;
    }

    try {
      const job = jobs.find(j => j.id === jobId);
      if (!job) {
        toast.error('Job not found');
        return false;
      }

      // Calculate success probability based on skills
      const { data: probability } = await supabase.rpc('calculate_agent_success_probability', {
        p_user_id: user.id,
        p_job_id: jobId
      });

      const completionTime = new Date();
      completionTime.setHours(completionTime.getHours() + job.estimated_duration_hours);

      // Create deployment
      const { error: deployError } = await supabase
        .from('zoe_agent_deployments')
        .insert({
          user_id: user.id,
          job_id: jobId,
          status: 'deployed',
          deployed_at: new Date().toISOString(),
          estimated_completion_at: completionTime.toISOString(),
          success_probability: probability || 0.5
        });

      if (deployError) throw deployError;

      // Update agent status
      await supabase
        .from('zoe_agent_stats')
        .update({
          current_status: 'deployed',
          last_deployment_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      // Log to DHF
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'agent_deployed',
        event_category: 'agentic_economy',
        metadata: {
          job_id: jobId,
          job_title: job.title,
          estimated_hours: job.estimated_duration_hours,
          success_probability: probability
        },
        dhf_logged: true
      });

      toast.success(`Zoe deployed to: ${job.title}`, {
        description: `Estimated completion: ${job.estimated_duration_hours}h`
      });

      await Promise.all([loadAgentStats(), loadActiveDeployments()]);
      return true;
    } catch (err) {
      console.error('[AgenticWorkforce] Deploy failed:', err);
      toast.error('Failed to deploy agent');
      return false;
    }
  }, [user?.id, agentStats, jobs, loadAgentStats, loadActiveDeployments]);

  // Acknowledge earnings (mark as notified)
  const acknowledgeEarnings = useCallback(async () => {
    if (!user?.id || unnotifiedEarnings.length === 0) return;

    try {
      const ids = unnotifiedEarnings.map(e => e.id);
      await supabase
        .from('agentic_earnings')
        .update({ notified: true })
        .in('id', ids);

      setUnnotifiedEarnings([]);
    } catch (err) {
      console.error('[AgenticWorkforce] Failed to acknowledge earnings:', err);
    }
  }, [user?.id, unnotifiedEarnings]);

  // Calculate skill match for a job
  const calculateSkillMatch = useCallback((job: AgentJob): number => {
    if (!agentStats) return 0;

    let matchScore = 0;
    let totalWeight = 0;

    for (const [skill, weight] of Object.entries(job.required_skills)) {
      totalWeight += weight;
      const agentSkill = agentStats[`skill_${skill}` as keyof AgentStats] as number || 0.5;
      matchScore += agentSkill * weight;
    }

    return totalWeight > 0 ? matchScore / totalWeight : 0.5;
  }, [agentStats]);

  // Get deployment time remaining
  const getDeploymentTimeRemaining = useCallback((deployment: AgentDeployment): number => {
    const completion = new Date(deployment.estimated_completion_at).getTime();
    const now = Date.now();
    return Math.max(0, completion - now);
  }, []);

  // Initialize
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([loadJobs(), loadAgentStats(), loadActiveDeployments()]);
      await checkCompletedDeployments();
      setIsLoading(false);
    };

    if (user?.id) {
      init();

      // Check for completions every minute
      checkIntervalRef.current = setInterval(checkCompletedDeployments, 60000);
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [user?.id, loadJobs, loadAgentStats, loadActiveDeployments, checkCompletedDeployments]);

  return {
    isLoading,
    jobs,
    activeDeployments,
    agentStats,
    unnotifiedEarnings,
    deployAgent,
    acknowledgeEarnings,
    calculateSkillMatch,
    getDeploymentTimeRemaining,
    refreshData: () => Promise.all([loadJobs(), loadAgentStats(), loadActiveDeployments()])
  };
};

export default useAgenticWorkforce;
