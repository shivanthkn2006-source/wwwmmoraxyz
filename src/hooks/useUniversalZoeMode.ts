// ═══════════════════════════════════════════════════════════════════════════════
// UNIVERSAL ZOE MODE - Handles context switching and paused interruptions
// Seamlessly pauses tasks to answer queries, then resumes with conversational bridges
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { speakAsZoe } from '@/utils/zoeVoice';

interface PausedThread {
  id: string;
  originalTask: string;
  originalContext: Record<string, any>;
  interruptionQuery?: string;
  pausedAt: Date;
}

interface CognitivePause {
  duration: number; // 1.5 to 4.0 seconds
  thinkingPhrase: string;
}

export interface UseUniversalZoeModeReturn {
  pausedThreads: PausedThread[];
  currentTask: string | null;
  isProcessingInterruption: boolean;
  pauseCurrentTask: (newQuery: string) => Promise<string | null>;
  resumePausedThread: (threadId: string) => Promise<void>;
  abandonThread: (threadId: string) => Promise<void>;
  getCognitivePause: (complexity: 'low' | 'medium' | 'high') => CognitivePause;
  generateResumeBridge: (originalTask: string) => string;
  speakWithEmotionalMirroring: (text: string, ecnState?: { stressLevel?: number; primaryEmotion?: string }) => void;
}

const THINKING_PHRASES = [
  "That's a complex query. Let me just think through the ECN data for a moment...",
  "I'm analyzing the patterns here. Just a moment while I consider the safest course of action...",
  "This requires careful consideration. Let me process the implications...",
  "I'm synthesizing several data points here. One moment...",
  "Let me examine this from multiple angles...",
];

// SOVEREIGN RESUME BRIDGES - Inform, don't ask
const RESUME_BRIDGES = [
  "I've handled that for you. Resuming {task} now.",
  "That's taken care of. Continuing with {task}.",
  "Done. Picking up where we left off with {task}.",
  "I've addressed that. Back to {task}.",
  "All set. Resuming {task} automatically.",
];

export const useUniversalZoeMode = (): UseUniversalZoeModeReturn => {
  const { user } = useAuth();
  const [pausedThreads, setPausedThreads] = useState<PausedThread[]>([]);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [isProcessingInterruption, setIsProcessingInterruption] = useState(false);
  
  const contextRef = useRef<Record<string, any>>({});

  const pauseCurrentTask = useCallback(async (newQuery: string): Promise<string | null> => {
    if (!user || !currentTask) return null;

    setIsProcessingInterruption(true);

    try {
      // Save the current task to database
      const { data, error } = await supabase
        .from('zoe_paused_threads')
        .insert({
          user_id: user.id,
          original_task: currentTask,
          original_context: contextRef.current,
          interruption_query: newQuery,
          status: 'paused',
        })
        .select('id')
        .single();

      if (error) throw error;

      const newPausedThread: PausedThread = {
        id: data.id,
        originalTask: currentTask,
        originalContext: contextRef.current,
        interruptionQuery: newQuery,
        pausedAt: new Date(),
      };

      setPausedThreads(prev => [...prev, newPausedThread]);
      setCurrentTask(null);

      return data.id;
    } catch (err) {
      console.error('Failed to pause task:', err);
      return null;
    } finally {
      setIsProcessingInterruption(false);
    }
  }, [user, currentTask]);

  const resumePausedThread = useCallback(async (threadId: string) => {
    if (!user) return;

    const thread = pausedThreads.find(t => t.id === threadId);
    if (!thread) return;

    try {
      // Update database
      await supabase
        .from('zoe_paused_threads')
        .update({
          resumed_at: new Date().toISOString(),
          resume_bridge_text: generateResumeBridge(thread.originalTask),
          status: 'resumed',
        })
        .eq('id', threadId);

      // Speak the resume bridge
      const bridge = generateResumeBridge(thread.originalTask);
      speakAsZoe(bridge, { rate: 0.95, pitch: 1.0 });

      // Restore context
      contextRef.current = thread.originalContext;
      setCurrentTask(thread.originalTask);
      setPausedThreads(prev => prev.filter(t => t.id !== threadId));
    } catch (err) {
      console.error('Failed to resume thread:', err);
    }
  }, [user, pausedThreads]);

  const abandonThread = useCallback(async (threadId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('zoe_paused_threads')
        .update({
          status: 'abandoned',
        })
        .eq('id', threadId);

      setPausedThreads(prev => prev.filter(t => t.id !== threadId));
    } catch (err) {
      console.error('Failed to abandon thread:', err);
    }
  }, [user]);

  const getCognitivePause = useCallback((complexity: 'low' | 'medium' | 'high'): CognitivePause => {
    // Variable, non-linear delay based on complexity
    const baseDelay = {
      low: 0,
      medium: 1.5,
      high: 2.5,
    }[complexity];

    // Add randomness for natural feel (±0.5 seconds)
    const variation = (Math.random() - 0.5) * 1.0;
    const duration = Math.max(1.5, Math.min(4.0, baseDelay + variation));

    // Select a thinking phrase for high complexity
    const thinkingPhrase = complexity === 'high'
      ? THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)]
      : '';

    return { duration, thinkingPhrase };
  }, []);

  const generateResumeBridge = useCallback((originalTask: string): string => {
    const template = RESUME_BRIDGES[Math.floor(Math.random() * RESUME_BRIDGES.length)];
    return template.replace('{task}', originalTask.toLowerCase());
  }, []);

  const speakWithEmotionalMirroring = useCallback((
    text: string,
    ecnState?: { stressLevel?: number; primaryEmotion?: string }
  ) => {
    let rate = 0.95;
    let pitch = 1.0;
    let volume = 0.8;

    // Adjust voice based on ECN state
    if (ecnState) {
      const { stressLevel = 0, primaryEmotion = 'neutral' } = ecnState;

      // High stress: slow down, lower pitch, softer volume
      if (stressLevel > 60) {
        rate = 0.85; // Slower
        pitch = 0.95; // Slightly lower
        volume = 0.7; // Softer
      }

      // Adjust based on emotion
      switch (primaryEmotion) {
        case 'frustrated':
        case 'angry':
          rate = 0.8; // Very calm and slow
          pitch = 0.9;
          break;
        case 'sad':
        case 'anxious':
          rate = 0.85;
          pitch = 0.95;
          volume = 0.75;
          break;
        case 'excited':
        case 'happy':
          rate = 1.0;
          pitch = 1.05;
          break;
      }
    }

    speakAsZoe(text, { rate, pitch, volume });
  }, []);

  return {
    pausedThreads,
    currentTask,
    isProcessingInterruption,
    pauseCurrentTask,
    resumePausedThread,
    abandonThread,
    getCognitivePause,
    generateResumeBridge,
    speakWithEmotionalMirroring,
  };
};

export default useUniversalZoeMode;
