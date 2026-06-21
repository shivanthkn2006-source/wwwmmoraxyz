/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY — OFFLINE SYNC MANAGER
 * Background sync between IndexedDB and Supabase Cloud
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  offlineDB, 
  offlineMessages, 
  syncQueue, 
  networkStatus,
  type SyncQueueItem 
} from '@/db/OfflineDB';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  syncError: string | null;
}

const SYNC_INTERVAL = 30000; // 30 seconds
const BATCH_SIZE = 20;

export function useOfflineSync(userId: string | null) {
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: networkStatus.isOnline(),
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    syncError: null,
  });

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNC MESSAGES TO CLOUD
  // ═══════════════════════════════════════════════════════════════════════════

  const syncMessagesToCloud = useCallback(async (): Promise<number> => {
    if (!userId) return 0;

    const pendingMessages = await offlineMessages.getPending(userId);
    if (pendingMessages.length === 0) return 0;

    let syncedCount = 0;

    for (const message of pendingMessages.slice(0, BATCH_SIZE)) {
      try {
        const { error } = await supabase.from('zoe_infinity_messages').upsert({
          id: message.id,
          user_id: message.userId,
          role: message.role,
          content: message.content,
          media_url: message.mediaUrl,
          media_type: message.mediaType,
          metadata: message.metadata,
          created_at: message.createdAt.toISOString(),
        }, {
          onConflict: 'id',
        });

        if (error) {
          console.error('[OfflineSync] Message sync error:', error);
          continue;
        }

        await offlineMessages.markSynced([message.id]);
        syncedCount++;
      } catch (err) {
        console.error('[OfflineSync] Message sync exception:', err);
      }
    }

    return syncedCount;
  }, [userId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNC FROM CLOUD (PULL)
  // ═══════════════════════════════════════════════════════════════════════════

  const syncFromCloud = useCallback(async (): Promise<number> => {
    if (!userId) return 0;

    try {
      // Get latest sync timestamp
      const lastSync = await offlineDB.settings.get('lastCloudSync');
      const since = lastSync?.value 
        ? new Date(lastSync.value).toISOString()
        : new Date(0).toISOString();

      const { data, error } = await supabase
        .from('zoe_infinity_messages')
        .select('*')
        .eq('user_id', userId)
        .gt('created_at', since)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('[OfflineSync] Cloud pull error:', error);
        return 0;
      }

      if (!data || data.length === 0) return 0;

      // Bulk upsert to local
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

      // Update last sync timestamp
      await offlineDB.settings.put({
        key: 'lastCloudSync',
        value: new Date().toISOString(),
        updatedAt: new Date(),
      });

      return data.length;
    } catch (err) {
      console.error('[OfflineSync] Cloud pull exception:', err);
      return 0;
    }
  }, [userId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESS SYNC QUEUE
  // ═══════════════════════════════════════════════════════════════════════════

  const processSyncQueue = useCallback(async (): Promise<void> => {
    const items = await syncQueue.getPending(BATCH_SIZE);

    for (const item of items) {
      try {
        await processSyncItem(item);
        await syncQueue.remove(item.id!);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        await syncQueue.markFailed(item.id!, errorMsg);
      }
    }
  }, []);

  const processSyncItem = async (item: SyncQueueItem): Promise<void> => {
    switch (item.table) {
      case 'messages':
        // Messages are handled by syncMessagesToCloud
        break;
      case 'profiles':
        if (item.operation === 'update' || item.operation === 'create') {
          const { error } = await supabase.from('profiles').update({
            display_name: item.payload.displayName,
          }).eq('user_id', item.payload.userId);
          if (error) throw error;
        }
        break;
      default:
        console.warn(`[OfflineSync] Unknown table: ${item.table}`);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN SYNC FUNCTION
  // ═══════════════════════════════════════════════════════════════════════════

  const performSync = useCallback(async () => {
    if (!userId || isSyncingRef.current || !networkStatus.isOnline()) {
      return;
    }

    isSyncingRef.current = true;
    setSyncState(prev => ({ ...prev, isSyncing: true, syncError: null }));

    try {
      // Push local changes
      const pushedCount = await syncMessagesToCloud();
      console.log(`[OfflineSync] Pushed ${pushedCount} messages`);

      // Pull cloud changes
      const pulledCount = await syncFromCloud();
      console.log(`[OfflineSync] Pulled ${pulledCount} messages`);

      // Process remaining queue items
      await processSyncQueue();

      // Update state
      const pendingCount = await syncQueue.size();
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        pendingCount,
        lastSyncAt: new Date(),
        syncError: null,
      }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sync failed';
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        syncError: errorMsg,
      }));
    } finally {
      isSyncingRef.current = false;
    }
  }, [userId, syncMessagesToCloud, syncFromCloud, processSyncQueue]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    // Subscribe to online/offline events
    const unsubscribe = networkStatus.subscribe((online) => {
      setSyncState(prev => ({ ...prev, isOnline: online }));

      // Trigger sync when coming back online
      if (online && userId) {
        console.log('[OfflineSync] Back online, triggering sync...');
        performSync();
      }
    });

    return unsubscribe;
  }, [userId, performSync]);

  useEffect(() => {
    if (!userId) return;

    // Initial sync
    performSync();

    // Periodic sync
    syncIntervalRef.current = setInterval(() => {
      if (networkStatus.isOnline()) {
        performSync();
      }
    }, SYNC_INTERVAL);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [userId, performSync]);

  // Update pending count periodically
  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await syncQueue.size();
      setSyncState(prev => ({ ...prev, pendingCount: count }));
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 10000);

    return () => clearInterval(interval);
  }, []);

  return {
    ...syncState,
    triggerSync: performSync,
  };
}

export default useOfflineSync;
