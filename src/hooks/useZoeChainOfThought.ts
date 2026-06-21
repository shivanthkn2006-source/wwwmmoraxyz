// ═══════════════════════════════════════════════════════════════════════════════
// ZOE CHAIN OF THOUGHT HOOK v1.0
// Frontend integration for 4-step ASI reasoning pipeline
// Connects to: zoe-chain-of-thought edge function
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types matching the edge function output
export interface ExtractionResult {
  keyFacts: {
    names: string[];
    places: string[];
    dates: string[];
    entities: string[];
    topics: string[];
  };
  emotionalState: {
    primary: string;
    intensity: number;
    valence: number;
    arousal: number;
    nuances: string[];
  };
  rawText: string;
  wordCount: number;
}

export interface IntentResult {
  primaryIntent: string;
  secondaryIntents: string[];
  actionRequired: 'none' | 'information' | 'action' | 'confirmation' | 'empathy' | 'tool';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  complexity: 'simple' | 'moderate' | 'complex' | 'expert';
  thinkingLevelRequired: 'low' | 'medium' | 'high';
  intentConfidence: number;
  // Classification Agent (The Judge) fields
  interactionCategory: 'emotional_support' | 'memory_retrieval' | 'creative_task' | 'information_seeking' | 'task_execution' | 'general_conversation';
  isValid: boolean;
  invalidReason: string | null;
  requiredTool: string | null;
  dhfAlignment: number;
}

export interface LogicCoreResult {
  selectedPersonalityTraits: string[];
  responseStrategy: string;
  clarifyingQuestion: string | null;
  memorySearchResults: string[];
  emotionalResonanceScore: number;
  dhfConstraintsMet: boolean;
  suggestedActions: string[];
}

export interface ChainOfThoughtResponse {
  success: boolean;
  response: string;
  intent: string;
  emotion: string;
  confidence: number;
  tone: string;
  suggestedFollowUp: string | null;
  processingTime: number;
  // Classification Agent (Judge) results
  interactionCategory?: string;
  isValid?: boolean;
  invalidReason?: string | null;
  requiredTool?: string | null;
  dhfAlignment?: number;
  // Detailed data (when enableDetailedLogs is true)
  extraction?: ExtractionResult;
  intentDetails?: IntentResult;
  logicCore?: LogicCoreResult;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UseZoeChainOfThoughtOptions {
  enableDetailedLogs?: boolean;
  onEmotionDetected?: (emotion: string, intensity: number) => void;
  onIntentClassified?: (intent: string, action: string) => void;
  maxHistoryLength?: number;
}

interface UseZoeChainOfThoughtReturn {
  // Core function
  processMessage: (message: string) => Promise<ChainOfThoughtResponse | null>;
  
  // State
  isProcessing: boolean;
  lastResponse: ChainOfThoughtResponse | null;
  error: string | null;
  
  // Conversation history
  conversationHistory: ConversationMessage[];
  addToHistory: (message: ConversationMessage) => void;
  clearHistory: () => void;
  
  // Metrics
  averageLatency: number;
  totalMessagesProcessed: number;
  
  // Quick access to last extracted data
  lastEmotion: string | null;
  lastIntent: string | null;
}

export function useZoeChainOfThought(
  options: UseZoeChainOfThoughtOptions = {}
): UseZoeChainOfThoughtReturn {
  const {
    enableDetailedLogs = false,
    onEmotionDetected,
    onIntentClassified,
    maxHistoryLength = 20,
  } = options;

  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<ChainOfThoughtResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  
  // Metrics
  const [totalLatency, setTotalLatency] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  
  // Quick access
  const [lastEmotion, setLastEmotion] = useState<string | null>(null);
  const [lastIntent, setLastIntent] = useState<string | null>(null);
  
  // Ref to prevent duplicate calls
  const processingRef = useRef(false);

  const addToHistory = useCallback((message: ConversationMessage) => {
    setConversationHistory(prev => {
      const newHistory = [...prev, message];
      if (newHistory.length > maxHistoryLength) {
        return newHistory.slice(-maxHistoryLength);
      }
      return newHistory;
    });
  }, [maxHistoryLength]);

  const clearHistory = useCallback(() => {
    setConversationHistory([]);
  }, []);

  const processMessage = useCallback(async (message: string): Promise<ChainOfThoughtResponse | null> => {
    if (processingRef.current) {
      console.warn('[CoT Hook] Already processing a message');
      return null;
    }

    if (!message.trim()) {
      setError('Message cannot be empty');
      return null;
    }

    processingRef.current = true;
    setIsProcessing(true);
    setError(null);

    const startTime = performance.now();

    try {
      // Add user message to history
      addToHistory({ role: 'user', content: message });

      // Get current platform context
      const platformContext = {
        currentPage: window.location.pathname,
        timeOfDay: getTimeOfDay(),
        recentActivity: [],
      };

      // Call the Chain of Thought edge function
      const { data, error: fnError } = await supabase.functions.invoke('zoe-chain-of-thought', {
        body: {
          message,
          platformContext,
          conversationHistory: conversationHistory.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
          enableDetailedLogs,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Chain of Thought processing failed');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Unknown error occurred');
      }

      const response: ChainOfThoughtResponse = {
        success: true,
        response: data.response,
        intent: data.intent,
        emotion: data.emotion,
        confidence: data.confidence,
        tone: data.tone,
        suggestedFollowUp: data.suggestedFollowUp,
        processingTime: data.processingTime,
        // Classification Agent (Judge) results
        interactionCategory: data.interactionCategory,
        isValid: data.isValid,
        invalidReason: data.invalidReason,
        requiredTool: data.requiredTool,
        dhfAlignment: data.dhfAlignment,
        // Detailed logs
        extraction: data.extraction,
        intentDetails: data.intentDetails,
        logicCore: data.logicCore,
      };

      // Update state
      setLastResponse(response);
      setLastEmotion(response.emotion);
      setLastIntent(response.intent);
      
      // Update metrics
      const latency = performance.now() - startTime;
      setTotalLatency(prev => prev + latency);
      setMessageCount(prev => prev + 1);

      // Add assistant response to history
      addToHistory({ role: 'assistant', content: response.response });

      // Call callbacks
      if (onEmotionDetected && data.extraction?.emotionalState) {
        onEmotionDetected(
          data.extraction.emotionalState.primary,
          data.extraction.emotionalState.intensity
        );
      }

      if (onIntentClassified && data.intentDetails) {
        onIntentClassified(
          data.intentDetails.primaryIntent,
          data.intentDetails.actionRequired
        );
      }

      console.log(`[CoT Hook] Processed in ${response.processingTime}ms | Intent: ${response.intent} | Emotion: ${response.emotion}`);

      return response;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Chain of Thought processing failed';
      setError(errorMessage);
      
      // Handle specific error types
      if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
        toast.error('AI is busy', {
          description: 'Please wait a moment and try again.',
        });
      } else if (errorMessage.includes('credits') || errorMessage.includes('402')) {
        toast.error('AI credits depleted', {
          description: 'Please add credits to continue using Zoe.',
        });
      } else {
        console.error('[CoT Hook] Error:', err);
      }

      return null;

    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  }, [conversationHistory, addToHistory, enableDetailedLogs, onEmotionDetected, onIntentClassified]);

  // Calculate average latency
  const averageLatency = messageCount > 0 ? totalLatency / messageCount : 0;

  return {
    processMessage,
    isProcessing,
    lastResponse,
    error,
    conversationHistory,
    addToHistory,
    clearHistory,
    averageLatency,
    totalMessagesProcessed: messageCount,
    lastEmotion,
    lastIntent,
  };
}

// Helper function to get time of day
function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export default useZoeChainOfThought;
