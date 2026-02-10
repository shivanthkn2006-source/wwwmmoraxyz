import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  processOfflineCommand, 
  executeOfflineAction, 
  isOffline,
  OfflineResponse,
  OfflineContext 
} from '@/utils/zoeOfflineIntelligence';
import { processOfflineConversation } from '@/utils/zoeOfflineConversation';
import { offlineDataSync, ZoeConversationContext } from '@/utils/offlineDataSync';
import { speakAsZoe, stopZoeSpeech } from '@/utils/zoeVoice';
import { useToast } from '@/hooks/use-toast';

interface UseZoeOfflineReturn {
  isOnline: boolean;
  processCommand: (command: string) => OfflineResponse;
  executeCommand: (command: string) => Promise<void>;
  lastResponse: OfflineResponse | null;
  commandHistory: string[];
  clearHistory: () => void;
  processConversation: (input: string) => { text: string; emotion?: string; confidence: number };
  universalSearch: (query: string) => { posts: any[]; messages: any[]; users: any[] };
  getConversationContext: () => ZoeConversationContext | null;
}

export const useZoeOffline = (): UseZoeOfflineReturn => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastResponse, setLastResponse] = useState<OfflineResponse | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Zoe is now connected with full capabilities.",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Offline Mode",
        description: "Zoe is running locally. Some features may be limited.",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Listen for navigation events from offline commands
  useEffect(() => {
    const handleNavigate = (event: CustomEvent) => {
      const { route } = event.detail;
      if (route) {
        navigate(route);
      }
    };

    const handleSetStatus = (event: CustomEvent) => {
      const { status } = event.detail;
      // Dispatch status change event for UI components
      window.dispatchEvent(new CustomEvent('user-status-change', { 
        detail: { status } 
      }));
    };

    const handleStopSpeech = () => {
      stopZoeSpeech();
    };

    window.addEventListener('zoe-navigate' as any, handleNavigate as EventListener);
    window.addEventListener('zoe-set-status' as any, handleSetStatus as EventListener);
    window.addEventListener('zoe-stop-speech' as any, handleStopSpeech as EventListener);

    return () => {
      window.removeEventListener('zoe-navigate' as any, handleNavigate as EventListener);
      window.removeEventListener('zoe-set-status' as any, handleSetStatus as EventListener);
      window.removeEventListener('zoe-stop-speech' as any, handleStopSpeech as EventListener);
    };
  }, [navigate]);

  // Build context for offline processing
  const buildContext = useCallback((): Partial<OfflineContext> => {
    const storedName = localStorage.getItem('user-display-name');
    return {
      userName: storedName || undefined,
      currentTime: new Date(),
      currentPage: location.pathname,
      recentCommands: commandHistory.slice(-5),
    };
  }, [location.pathname, commandHistory]);

  // Process command without executing
  const processCommand = useCallback((command: string): OfflineResponse => {
    const context = buildContext();
    return processOfflineCommand(command, context);
  }, [buildContext]);

  // Execute command with voice response - now with conversation support
  const executeCommand = useCallback(async (command: string): Promise<void> => {
    // Add to history
    setCommandHistory(prev => [...prev.slice(-19), command]);

    // Process the command
    const context = buildContext();
    let response = processOfflineCommand(command, context);
    
    // If low confidence, try conversation processing
    if (response.confidence < 0.5) {
      const conversationResponse = processOfflineConversation(command);
      if (conversationResponse.confidence > response.confidence) {
        response = {
          text: conversationResponse.text,
          emotion: conversationResponse.emotion,
          confidence: conversationResponse.confidence,
        };
      }
    }
    
    setLastResponse(response);

    // Execute any associated action
    executeOfflineAction(response);

    // Speak the response
    if (response.text) {
      speakAsZoe(response.text);
    }

    // Dispatch response event for UI updates
    window.dispatchEvent(new CustomEvent('zoe-offline-response', { 
      detail: response 
    }));
  }, [buildContext]);

  // Process natural conversation
  const processConversation = useCallback((input: string) => {
    return processOfflineConversation(input);
  }, []);

  // Search across all cached data
  const universalSearch = useCallback((query: string) => {
    return offlineDataSync.universalSearch(query);
  }, []);

  // Get conversation context for Zoe
  const getConversationContext = useCallback(() => {
    return offlineDataSync.getZoeConversationContext();
  }, []);

  // Clear command history
  const clearHistory = useCallback(() => {
    setCommandHistory([]);
  }, []);

  return {
    isOnline,
    processCommand,
    executeCommand,
    lastResponse,
    commandHistory,
    clearHistory,
    processConversation,
    universalSearch,
    getConversationContext,
  };
};

// Hook for offline memory/storage
export const useZoeOfflineMemory = () => {
  const MEMORY_KEY = 'zoe-offline-memories';

  const saveMemory = useCallback((key: string, value: any) => {
    try {
      const memories = JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}');
      memories[key] = {
        value,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(MEMORY_KEY, JSON.stringify(memories));
      return true;
    } catch {
      return false;
    }
  }, []);

  const recallMemory = useCallback((key: string): any | null => {
    try {
      const memories = JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}');
      return memories[key]?.value || null;
    } catch {
      return null;
    }
  }, []);

  const getAllMemories = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}');
    } catch {
      return {};
    }
  }, []);

  const deleteMemory = useCallback((key: string) => {
    try {
      const memories = JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}');
      delete memories[key];
      localStorage.setItem(MEMORY_KEY, JSON.stringify(memories));
      return true;
    } catch {
      return false;
    }
  }, []);

  const clearAllMemories = useCallback(() => {
    localStorage.removeItem(MEMORY_KEY);
  }, []);

  return {
    saveMemory,
    recallMemory,
    getAllMemories,
    deleteMemory,
    clearAllMemories,
  };
};

// Hook for offline conversation history
export const useZoeOfflineConversation = () => {
  const CONVERSATION_KEY = 'zoe-offline-conversations';
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(CONVERSATION_KEY);
    if (stored) {
      try {
        setConversations(JSON.parse(stored));
      } catch {
        setConversations([]);
      }
    }
  }, []);

  const addMessage = useCallback((role: 'user' | 'zoe', content: string) => {
    const message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date().toISOString(),
    };

    setConversations(prev => {
      const updated = [...prev, message].slice(-100); // Keep last 100 messages
      localStorage.setItem(CONVERSATION_KEY, JSON.stringify(updated));
      return updated;
    });

    return message;
  }, []);

  const getRecentConversations = useCallback((count: number = 10) => {
    return conversations.slice(-count);
  }, [conversations]);

  const clearConversations = useCallback(() => {
    setConversations([]);
    localStorage.removeItem(CONVERSATION_KEY);
  }, []);

  return {
    conversations,
    addMessage,
    getRecentConversations,
    clearConversations,
  };
};