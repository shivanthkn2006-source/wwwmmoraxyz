import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export type AgentMode = 'autonomous' | 'collaborative' | 'adaptive' | 'predictive';

export interface AgentExecution {
  toolCallId: string;
  functionName: string;
  agentsInvolved: string[];
  result: any;
  executionTime: number;
}

export interface MultiAgentResponse {
  message: string;
  agentExecutions: AgentExecution[];
  coordinationLog: string[];
  mode: AgentMode;
  reasoning: string;
  multiAgentMode: boolean;
  agentTypes: string[];
  systemStatus: {
    agents_active: number;
    operations_completed: number;
    coordination_successful: boolean;
    learning_enabled: boolean;
  };
}

/**
 * Advanced Multi-Agent System Hook
 * 
 * Provides access to Zoe's next-generation multi-agent AI system with:
 * - 6 specialized collaborative agents (Planner, Researcher, Executor, Optimizer, Learning, Coordinator)
 * - Autonomous task management and execution
 * - Continuous learning and adaptation
 * - Predictive intelligence
 * - Natural language interface for complex operations
 * 
 * This represents the future of agentic AI where multiple specialized agents
 * work together to solve complex, unpredictable problems autonomously.
 */
export const useZoeMultiAgent = () => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentMode, setCurrentMode] = useState<AgentMode>('autonomous');
  const [lastResponse, setLastResponse] = useState<MultiAgentResponse | null>(null);
  const [agentHistory, setAgentHistory] = useState<any[]>([]);

  /**
   * Execute a command using the multi-agent system
   */
  const executeMultiAgentCommand = useCallback(async (
    command: string,
    mode: AgentMode = 'autonomous',
    context?: any
  ): Promise<MultiAgentResponse> => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    if (!command.trim()) {
      throw new Error('Command cannot be empty');
    }

    setIsProcessing(true);
    setCurrentMode(mode);

    try {
      console.log('Executing multi-agent command:', { command, mode });

      const { data, error } = await supabase.functions.invoke('zoe-multiagent', {
        body: {
          command,
          userId: user.id,
          mode,
          context: {
            ...context,
            agentHistory: agentHistory.slice(-10), // Last 10 interactions for context
          }
        }
      });

      if (error) {
        console.error('Multi-agent error:', error);
        
        if (error.message?.includes('Rate limit')) {
          toast.error('Rate limit exceeded', {
            description: 'Please wait a moment before making another request.'
          });
        } else if (error.message?.includes('credits exhausted')) {
          toast.error('AI credits exhausted', {
            description: 'Please add more credits to continue using advanced AI features.'
          });
        } else {
          toast.error('Multi-agent system error', {
            description: error.message || 'Failed to execute command'
          });
        }
        
        throw error;
      }

      const response = data as MultiAgentResponse;
      
      // Update history for learning
      setAgentHistory(prev => [...prev, {
        timestamp: new Date().toISOString(),
        command,
        mode,
        response: response.message,
        agentsUsed: response.agentExecutions?.flatMap(e => e.agentsInvolved) || [],
        operationsCount: response.agentExecutions?.length || 0
      }]);

      setLastResponse(response);
      
      console.log('Multi-agent response:', response);
      
      return response;
      
    } catch (error) {
      console.error('Error executing multi-agent command:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [user, agentHistory]);

  /**
   * Autonomous mode: Minimal human intervention
   */
  const autonomous = useCallback(async (task: string, context?: any) => {
    return executeMultiAgentCommand(task, 'autonomous', context);
  }, [executeMultiAgentCommand]);

  /**
   * Collaborative mode: Multiple agents working together with visible reasoning
   */
  const collaborative = useCallback(async (problem: string, context?: any) => {
    return executeMultiAgentCommand(problem, 'collaborative', context);
  }, [executeMultiAgentCommand]);

  /**
   * Adaptive mode: Learning from interactions and adapting behavior
   */
  const adaptive = useCallback(async (scenario: string, context?: any) => {
    return executeMultiAgentCommand(scenario, 'adaptive', context);
  }, [executeMultiAgentCommand]);

  /**
   * Predictive mode: Anticipate needs and suggest proactive actions
   */
  const predictive = useCallback(async (context?: any) => {
    return executeMultiAgentCommand(
      'Analyze my current context and predict what I might need next',
      'predictive',
      context
    );
  }, [executeMultiAgentCommand]);

  /**
   * Decompose a complex task into agent-specific subtasks
   */
  const decomposeTask = useCallback(async (complexTask: string, priority: string = 'medium') => {
    return executeMultiAgentCommand(
      `Decompose this complex task into subtasks and assign to appropriate agents: ${complexTask}. Priority: ${priority}`,
      'collaborative'
    );
  }, [executeMultiAgentCommand]);

  /**
   * Optimize a workflow or process
   */
  const optimizeWorkflow = useCallback(async (workflowDescription: string) => {
    return executeMultiAgentCommand(
      `Analyze and optimize this workflow: ${workflowDescription}`,
      'autonomous'
    );
  }, [executeMultiAgentCommand]);

  /**
   * Learn from user feedback and adapt
   */
  const learnFromFeedback = useCallback(async (feedback: string, interactionType: string) => {
    return executeMultiAgentCommand(
      `Learn from this feedback: ${feedback}. Interaction type: ${interactionType}`,
      'adaptive'
    );
  }, [executeMultiAgentCommand]);

  /**
   * Get proactive suggestions based on context
   */
  const getProactiveSuggestions = useCallback(async (userContext: any) => {
    return executeMultiAgentCommand(
      'Analyze my context and provide proactive suggestions for what I should do next',
      'predictive',
      userContext
    );
  }, [executeMultiAgentCommand]);

  /**
   * Save current task to database for later retrieval
   */
  const saveTask = useCallback(async (taskName: string): Promise<boolean> => {
    if (!user || !lastResponse) {
      toast.error('No task to save');
      return false;
    }

    try {
      const { error } = await supabase
        .from('zoe_multiagent_tasks')
        .insert({
          user_id: user.id,
          task_name: taskName,
          command: lastResponse.message || '',
          mode: lastResponse.mode,
          response: lastResponse.message,
          agent_executions: lastResponse.agentExecutions as any || [],
          coordination_log: lastResponse.coordinationLog as any || [],
          status: 'completed'
        });

      if (error) throw error;

      toast.success('Task saved successfully', {
        description: `"${taskName}" has been saved for later retrieval`
      });
      return true;
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Failed to save task');
      return false;
    }
  }, [user, lastResponse]);

  /**
   * Retrieve saved tasks from database
   */
  const getSavedTasks = useCallback(async () => {
    if (!user) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('zoe_multiagent_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error retrieving tasks:', error);
      toast.error('Failed to retrieve saved tasks');
      return [];
    }
  }, [user]);

  /**
   * Load a saved task
   */
  const loadTask = useCallback(async (taskId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('zoe_multiagent_tasks')
        .select('*')
        .eq('id', taskId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        const reconstructedResponse: MultiAgentResponse = {
          message: data.response || '',
          agentExecutions: (data.agent_executions as any)?.map((exec: any) => ({
            toolCallId: exec.toolCallId || '',
            functionName: exec.functionName || '',
            agentsInvolved: exec.agentsInvolved || [],
            result: exec.result,
            executionTime: exec.executionTime || 0
          })) || [],
          coordinationLog: (data.coordination_log as any) || [],
          mode: data.mode as AgentMode,
          reasoning: 'Loaded from saved task',
          multiAgentMode: true,
          agentTypes: ['PLANNER', 'RESEARCHER', 'EXECUTOR', 'OPTIMIZER', 'LEARNING', 'COORDINATOR'],
          systemStatus: {
            agents_active: 6,
            operations_completed: ((data.agent_executions as any) || []).length,
            coordination_successful: true,
            learning_enabled: true
          }
        };

        setLastResponse(reconstructedResponse);
        toast.success('Task loaded successfully', {
          description: data.task_name
        });
      }
    } catch (error) {
      console.error('Error loading task:', error);
      toast.error('Failed to load task');
    }
  }, [user]);

  /**
   * Delete a saved task
   */
  const deleteTask = useCallback(async (taskId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('zoe_multiagent_tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Task deleted');
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
      return false;
    }
  }, [user]);

  /**
   * Clear agent history (for privacy or reset)
   */
  const clearHistory = useCallback(() => {
    setAgentHistory([]);
    setLastResponse(null);
    toast.success('Agent history cleared');
  }, []);

  return {
    // Core execution function
    executeMultiAgentCommand,
    
    // Mode-specific functions
    autonomous,
    collaborative,
    adaptive,
    predictive,
    
    // Specialized operations
    decomposeTask,
    optimizeWorkflow,
    learnFromFeedback,
    getProactiveSuggestions,
    
    // Task management
    saveTask,
    getSavedTasks,
    loadTask,
    deleteTask,
    
    // State
    isProcessing,
    currentMode,
    lastResponse,
    agentHistory,
    
    // Utilities
    clearHistory,
    
    // Agent types for reference
    agentTypes: ['PLANNER', 'RESEARCHER', 'EXECUTOR', 'OPTIMIZER', 'LEARNING', 'COORDINATOR']
  };
};
