// ═══════════════════════════════════════════════════════════════════════════════
// ZOE HANDS-FREE MESSAGE READER - Read incoming messages aloud without opening chat
// Does NOT mark messages as read or show read status to sender
// Works silently in background when enabled
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { speakAs, stopSpeaking, isAssistantSpeaking } from '@/utils/assistantVoice';
import { toast } from 'sonner';

interface UnreadMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: Date;
  mediaType?: string;
}

interface HandsFreeReaderState {
  isEnabled: boolean;
  isReading: boolean;
  currentQueue: UnreadMessage[];
  lastReadMessageId: string | null;
}

export const useZoeHandsFreeMessageReader = () => {
  const { user } = useAuth();
  const [state, setState] = useState<HandsFreeReaderState>({
    isEnabled: false,
    isReading: false,
    currentQueue: [],
    lastReadMessageId: null,
  });
  
  const queueRef = useRef<UnreadMessage[]>([]);
  const isReadingRef = useRef(false);
  const enabledRef = useRef(false);
  const processedIdsRef = useRef<Set<string>>(new Set());
  
  // Process queue - read next message
  const processNextMessage = useCallback(async () => {
    if (queueRef.current.length === 0 || !enabledRef.current) {
      isReadingRef.current = false;
      setState(prev => ({ ...prev, isReading: false }));
      return;
    }
    
    // Wait if already speaking
    if (isAssistantSpeaking()) {
      setTimeout(() => processNextMessage(), 500);
      return;
    }
    
    const message = queueRef.current.shift();
    if (!message) return;
    
    isReadingRef.current = true;
    setState(prev => ({ 
      ...prev, 
      isReading: true, 
      currentQueue: [...queueRef.current],
      lastReadMessageId: message.id 
    }));
    
    // Format announcement
    const announcement = message.mediaType 
      ? `${message.senderName} sent you a ${message.mediaType}${message.content ? `: ${message.content}` : ''}`
      : `${message.senderName} says: ${message.content}`;
    
    console.log('[HandsFreeReader] Reading:', announcement.substring(0, 60));
    
    await new Promise<void>((resolve) => {
      speakAs(
        announcement,
        'Zoe', // Use Zoe voice for message reading
        undefined,
        () => {
          resolve();
          // Process next message after short delay
          setTimeout(() => processNextMessage(), 800);
        },
        () => resolve()
      );
    });
  }, []);
  
  // Add message to queue
  const queueMessage = useCallback((message: UnreadMessage) => {
    // Skip if already processed
    if (processedIdsRef.current.has(message.id)) return;
    processedIdsRef.current.add(message.id);
    
    // Limit processed IDs to prevent memory leak
    if (processedIdsRef.current.size > 500) {
      const ids = Array.from(processedIdsRef.current);
      processedIdsRef.current = new Set(ids.slice(-200));
    }
    
    queueRef.current.push(message);
    setState(prev => ({ ...prev, currentQueue: [...queueRef.current] }));
    
    console.log('[HandsFreeReader] Queued message from:', message.senderName);
    
    // Start processing if not already
    if (!isReadingRef.current) {
      processNextMessage();
    }
  }, [processNextMessage]);
  
  // Subscribe to new messages
  useEffect(() => {
    if (!user?.id || !enabledRef.current) return;
    
    console.log('[HandsFreeReader] Setting up realtime subscription');
    
    const channel = supabase
      .channel('handsfree-message-reader')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Don't read if already marked as read
          if (newMessage.read) return;
          
          // Get sender profile
          let senderName = 'Someone';
          try {
            const { data: profile } = await supabase
              .from('safe_public_profiles')
              .select('display_name, username')
              .eq('user_id', newMessage.sender_id)
              .single();
            
            if (profile) {
              senderName = profile.display_name || profile.username || 'Someone';
            }
          } catch {
            // Use default name
          }
          
          queueMessage({
            id: newMessage.id,
            senderId: newMessage.sender_id,
            senderName,
            content: newMessage.content || '',
            createdAt: new Date(newMessage.created_at),
            mediaType: newMessage.media_type,
          });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, state.isEnabled, queueMessage]);
  
  // Enable hands-free message reading
  const enable = useCallback(() => {
    enabledRef.current = true;
    setState(prev => ({ ...prev, isEnabled: true }));
    console.log('[HandsFreeReader] Enabled');
    toast.success('Hands-free message reading enabled', { 
      description: 'Zoe will read new messages aloud',
      duration: 2000 
    });
  }, []);
  
  // Disable hands-free message reading
  const disable = useCallback(() => {
    enabledRef.current = false;
    isReadingRef.current = false;
    queueRef.current = [];
    stopSpeaking();
    setState({
      isEnabled: false,
      isReading: false,
      currentQueue: [],
      lastReadMessageId: null,
    });
    console.log('[HandsFreeReader] Disabled');
    toast.info('Hands-free message reading disabled');
  }, []);
  
  // Toggle
  const toggle = useCallback(() => {
    if (state.isEnabled) {
      disable();
    } else {
      enable();
    }
  }, [state.isEnabled, enable, disable]);
  
  // Skip current message
  const skipCurrent = useCallback(() => {
    stopSpeaking();
    if (queueRef.current.length > 0) {
      processNextMessage();
    } else {
      isReadingRef.current = false;
      setState(prev => ({ ...prev, isReading: false }));
    }
  }, [processNextMessage]);
  
  // Clear queue
  const clearQueue = useCallback(() => {
    queueRef.current = [];
    setState(prev => ({ ...prev, currentQueue: [] }));
  }, []);
  
  // Cleanup
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);
  
  // Listen for voice command events from GlobalZoeAssistant
  useEffect(() => {
    const handleEnableReader = () => {
      if (!state.isEnabled) {
        enable();
      }
    };
    
    const handleDisableReader = () => {
      if (state.isEnabled) {
        disable();
      }
    };
    
    window.addEventListener('zoe-enable-message-reader', handleEnableReader);
    window.addEventListener('zoe-disable-message-reader', handleDisableReader);
    
    return () => {
      window.removeEventListener('zoe-enable-message-reader', handleEnableReader);
      window.removeEventListener('zoe-disable-message-reader', handleDisableReader);
    };
  }, [state.isEnabled, enable, disable]);
  
  return {
    ...state,
    enable,
    disable,
    toggle,
    skipCurrent,
    clearQueue,
    pendingCount: state.currentQueue.length,
  };
};

export default useZoeHandsFreeMessageReader;
