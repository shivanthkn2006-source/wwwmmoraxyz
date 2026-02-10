import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { 
  offlineDataSync, 
  OfflinePost, 
  OfflineMessage, 
  OfflineUser,
  ZoeConversationContext 
} from '@/utils/offlineDataSync';
import { useToast } from '@/hooks/use-toast';

export const useOfflineDataSync = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [pendingActionsCount, setPendingActionsCount] = useState(0);

  // Track online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Syncing your offline data...",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Offline Mode",
        description: "Using cached data. Changes will sync when online.",
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

  // Start auto-sync when user is available
  useEffect(() => {
    if (user?.id) {
      offlineDataSync.startAutoSync(user.id, 60000); // Sync every minute
      setLastSyncTime(offlineDataSync.getLastSyncTime());
      setPendingActionsCount(offlineDataSync.getPendingActionsCount());
    }

    return () => {
      offlineDataSync.stopAutoSync();
    };
  }, [user?.id]);

  // Manual sync
  const manualSync = useCallback(async () => {
    if (!user?.id || !isOnline) return;
    
    setIsSyncing(true);
    try {
      await offlineDataSync.performFullSync(user.id);
      setLastSyncTime(offlineDataSync.getLastSyncTime());
      setPendingActionsCount(offlineDataSync.getPendingActionsCount());
      toast({
        title: "Sync Complete",
        description: "All data has been synchronized.",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Could not sync data. Will retry later.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  }, [user?.id, isOnline, toast]);

  // Get cached posts
  const getOfflinePosts = useCallback((): OfflinePost[] => {
    return offlineDataSync.getPosts();
  }, []);

  // Search posts offline
  const searchOfflinePosts = useCallback((query: string): OfflinePost[] => {
    return offlineDataSync.searchPosts(query);
  }, []);

  // Get cached messages
  const getOfflineMessages = useCallback((chatUserId?: string): OfflineMessage[] => {
    return offlineDataSync.getMessages(chatUserId);
  }, []);

  // Search messages offline
  const searchOfflineMessages = useCallback((query: string): OfflineMessage[] => {
    return offlineDataSync.searchMessages(query);
  }, []);

  // Get cached friends
  const getOfflineFriends = useCallback((): OfflineUser[] => {
    return offlineDataSync.getFriends();
  }, []);

  // Search users offline
  const searchOfflineUsers = useCallback((query: string): OfflineUser[] => {
    return offlineDataSync.searchUsers(query);
  }, []);

  // Universal search
  const universalOfflineSearch = useCallback((query: string) => {
    return offlineDataSync.universalSearch(query);
  }, []);

  // Get Zoe conversation context
  const getZoeContext = useCallback((): ZoeConversationContext | null => {
    return offlineDataSync.getZoeConversationContext();
  }, []);

  // Add conversation for Zoe context
  const addZoeConversation = useCallback((role: 'user' | 'zoe', content: string) => {
    offlineDataSync.addConversation(role, content);
  }, []);

  // Queue offline action
  const queueOfflineAction = useCallback((type: 'like' | 'comment' | 'message' | 'post' | 'reaction', data: any) => {
    const id = offlineDataSync.queueAction(type, data);
    setPendingActionsCount(offlineDataSync.getPendingActionsCount());
    return id;
  }, []);

  // Clear all cache
  const clearCache = useCallback(() => {
    offlineDataSync.clearAllCache();
    setLastSyncTime(null);
    setPendingActionsCount(0);
  }, []);

  return {
    // Status
    isOnline,
    isSyncing,
    lastSyncTime,
    pendingActionsCount,

    // Actions
    manualSync,
    clearCache,

    // Data access
    getOfflinePosts,
    searchOfflinePosts,
    getOfflineMessages,
    searchOfflineMessages,
    getOfflineFriends,
    searchOfflineUsers,
    universalOfflineSearch,

    // Zoe context
    getZoeContext,
    addZoeConversation,

    // Offline actions
    queueOfflineAction,
  };
};