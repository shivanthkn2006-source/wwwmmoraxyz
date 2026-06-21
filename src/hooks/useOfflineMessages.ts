/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY — OFFLINE-FIRST MESSAGES HOOK
 * Local-first message handling with automatic cloud sync
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineMessages, networkStatus, type OfflineMessage } from '@/db/OfflineDB';
import { supabase } from '@/integrations/supabase/client';

interface UseOfflineMessagesOptions {
  userId: string | null;
  limit?: number;
  autoSync?: boolean;
}

interface UseOfflineMessagesReturn {
  messages: OfflineMessage[];
  isLoading: boolean;
  error: string | null;
  addMessage: (message: Omit<OfflineMessage, 'id' | 'syncStatus' | 'createdAt'> & { id?: string }) => Promise<string>;
  refreshMessages: () => Promise<void>;
  clearHistory: () => Promise<void>;
  pendingCount: number;
  isOffline: boolean;
}

const createOfflineMessageId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0;
    const value = char === 'x' ? random : (random & 0x3 | 0x8);
    return value.toString(16);
  });
};

export function useOfflineMessages(options: UseOfflineMessagesOptions): UseOfflineMessagesReturn {
  const { userId, limit = 100, autoSync = true } = options;

  const [messages, setMessages] = useState<OfflineMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOffline, setIsOffline] = useState(!networkStatus.isOnline());

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD MESSAGES FROM LOCAL DB
  // ═══════════════════════════════════════════════════════════════════════════

  const loadLocalMessages = useCallback(async () => {
    if (!userId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    try {
      const localMessages = await offlineMessages.getByUser(userId, limit);
      setMessages(localMessages.reverse()); // Chronological order
      
      const pending = localMessages.filter(m => m.syncStatus === 'pending').length;
      setPendingCount(pending);
    } catch (err) {
      console.error('[OfflineMessages] Load error:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [userId, limit]);

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIAL CLOUD SYNC (if online)
  // ═══════════════════════════════════════════════════════════════════════════

  const syncFromCloud = useCallback(async () => {
    if (!userId || !networkStatus.isOnline()) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('zoe_infinity_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) {
        console.error('[OfflineMessages] Cloud sync error:', fetchError);
        return;
      }

      if (data && data.length > 0) {
        await offlineMessages.bulkUpsert(
          data.map(row => ({
            id: row.id,
            userId: row.user_id,
            role: row.role as 'user' | 'assistant',
            content: row.content,
            mediaUrl: row.media_url,
            mediaType: row.media_type,
            metadata: row.metadata as Record<string, any>,
            createdAt: new Date(row.created_at),
            syncStatus: 'synced' as const,
          }))
        );

        // Reload local messages
        await loadLocalMessages();
      }
    } catch (err) {
      console.error('[OfflineMessages] Cloud sync exception:', err);
    }
  }, [userId, limit, loadLocalMessages]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ADD MESSAGE (OFFLINE-FIRST)
  // ═══════════════════════════════════════════════════════════════════════════

  const addMessage = useCallback(async (
    message: Omit<OfflineMessage, 'id' | 'syncStatus' | 'createdAt'> & { id?: string }
  ): Promise<string> => {
    const id = message.id || createOfflineMessageId();
    const now = new Date();

    const newMessage: OfflineMessage = {
      ...message,
      id,
      createdAt: now,
      syncStatus: 'pending',
    };

    // Optimistic local update
    setMessages(prev => [...prev, newMessage]);

    // BUG FIX: Skip sync queue since we handle cloud sync directly below
    // This prevents duplicate sync attempts (once from queue, once from immediate sync)
    await offlineMessages.add({
      ...newMessage,
      id,
      createdAt: now,
    }, { skipSyncQueue: true });

    setPendingCount(prev => prev + 1);

    // If online, try immediate sync
    if (networkStatus.isOnline() && autoSync) {
      try {
        const { error: syncError } = await supabase.from('zoe_infinity_messages').upsert({
          id,
          user_id: message.userId,
          role: message.role,
          content: message.content,
          media_url: message.mediaUrl,
          media_type: message.mediaType,
          metadata: message.metadata,
          created_at: now.toISOString(),
        });

        if (!syncError) {
          await offlineMessages.markSynced([id]);
          setMessages(prev => 
            prev.map(m => m.id === id ? { ...m, syncStatus: 'synced' } : m)
          );
          setPendingCount(prev => Math.max(0, prev - 1));
        }
      } catch (err) {
        console.warn('[OfflineMessages] Immediate sync failed, queued for later:', err);
      }
    }

    return id;
  }, [autoSync]);

  // ═══════════════════════════════════════════════════════════════════════════
  // REFRESH MESSAGES
  // ═══════════════════════════════════════════════════════════════════════════

  const refreshMessages = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (networkStatus.isOnline()) {
        await syncFromCloud();
      }
      await loadLocalMessages();
    } catch (err) {
      setError('Failed to refresh messages');
    } finally {
      setIsLoading(false);
    }
  }, [syncFromCloud, loadLocalMessages]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEAR HISTORY
  // ═══════════════════════════════════════════════════════════════════════════

  const clearHistory = useCallback(async () => {
    if (!userId) return;

    await offlineMessages.clear(userId);
    setMessages([]);
    setPendingCount(0);
  }, [userId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    loadLocalMessages();

    if (autoSync && networkStatus.isOnline()) {
      syncFromCloud();
    }
  }, [userId, loadLocalMessages, syncFromCloud, autoSync]);

  // Subscribe to online/offline events
  useEffect(() => {
    const unsubscribe = networkStatus.subscribe((online) => {
      setIsOffline(!online);

      if (online && autoSync) {
        console.log('[OfflineMessages] Back online, syncing...');
        syncFromCloud();
      }
    });

    return unsubscribe;
  }, [syncFromCloud, autoSync]);

  return {
    messages,
    isLoading,
    error,
    addMessage,
    refreshMessages,
    clearHistory,
    pendingCount,
    isOffline,
  };
}

export default useOfflineMessages;
