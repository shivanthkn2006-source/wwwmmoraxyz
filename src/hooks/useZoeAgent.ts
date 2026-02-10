import { useZoe } from '@/contexts/ZoeContext';

/**
 * Custom hook to interact with Zoe AI Agent - A true agentic AI from the future
 * 
 * Zoe is powered by advanced AI models with capabilities:
 * - Autonomous decision-making and goal pursuit
 * - Multi-step reasoning and planning
 * - Tool calling and function execution
 * - Proactive suggestions and interventions
 * - Memory and context management
 * - Real-time learning and adaptation
 * 
 * Usage examples:
 * 
 * // Agentic mode - Zoe autonomously completes complex tasks
 * const { executeCommand, enableAgentMode } = useZoeAgent();
 * enableAgentMode();
 * executeCommand('analyze my activity patterns and suggest improvements');
 * 
 * // Tool-assisted operations
 * executeCommand('create a personalized workout plan based on my profile');
 * 
 * // Proactive AI assistance
 * executeCommand('monitor my notifications and summarize important ones');
 * 
 * // Complex multi-step tasks
 * executeCommand('organize my day based on my schedule and priorities');
 */
export const useZoeAgent = () => {
  const { executeCommand, isAgentMode, currentTask, taskProgress } = useZoe();

  return {
    // Execute any Zoe command with agentic capabilities
    executeCommand,
    
    // Current agent state
    isAgentMode,
    currentTask,
    taskProgress,
    
    // Agentic AI commands - Complex multi-step reasoning
    analyzeAndSuggest: (context: string) => executeCommand(`analyze ${context} and provide actionable insights`),
    planAndExecute: (goal: string) => executeCommand(`create a plan to achieve: ${goal} and help me execute it`),
    monitorAndNotify: (criteria: string) => executeCommand(`monitor ${criteria} and notify me of important changes`),
    
    // Content creation with AI reasoning
    createBeautifulPost: () => executeCommand('create a beautiful post'),
    createPost: (topic: string) => executeCommand(`post about ${topic}`),
    surprisePost: () => executeCommand('surprise me with a post'),
    
    // Platform management with autonomous decision-making
    moderateContent: () => executeCommand('moderate recent content'),
    showStats: () => executeCommand('show platform stats'),
    showUsers: () => executeCommand('show users'),
    
    // Proactive AI assistance
    suggestActions: () => executeCommand('suggest actions based on my current context'),
    optimizeWorkflow: () => executeCommand('optimize my workflow and daily routine'),
    personalizedRecommendations: () => executeCommand('give me personalized recommendations'),
    
    // Agent mode control
    enableAgentMode: () => executeCommand('agent mode'),
    disableAgentMode: () => executeCommand('stop agent'),
    
    // Advanced agentic capabilities
    autonomousAssist: (objective: string) => executeCommand(`autonomously help me with: ${objective}`),
    reasonAndDecide: (scenario: string) => executeCommand(`analyze this scenario and decide the best course of action: ${scenario}`),
    learnAndAdapt: () => executeCommand('learn from my patterns and adapt your behavior'),
    
    // Legacy commands (kept for backwards compatibility)
    generatePost: (topic: string) => executeCommand(`post about ${topic}`),
    generateImage: (prompt: string) => executeCommand(`create image of ${prompt}`),
  };
};

// Legacy export for backwards compatibility
export const useLisaAgent = useZoeAgent;
