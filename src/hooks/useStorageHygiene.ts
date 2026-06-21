/**
 * Storage Hygiene Hook - "Cleanup Crew" Protocol
 * Monitors storage usage and triggers cleanup when needed
 * Connected to Zoe Core for system health monitoring
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StorageStats {
  usedMB: number;
  percentage: number;
  lastCleanup: string | null;
  filesDeleted: number;
  bytesFreed: number;
}

interface CleanupResult {
  success: boolean;
  deletedFiles: number;
  freedMB: number;
  storageUsedMB: number;
  storagePercentage: number;
  alertSent: boolean;
  errors: string[];
}

const STORAGE_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
const LOCAL_STORAGE_KEY = 'zoe_storage_hygiene';

export function useStorageHygiene() {
  const [stats, setStats] = useState<StorageStats>({
    usedMB: 0,
    percentage: 0,
    lastCleanup: null,
    filesDeleted: 0,
    bytesFreed: 0,
  });
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  // Load cached stats from localStorage
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setStats(parsed);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Trigger manual cleanup via edge function
  const triggerCleanup = useCallback(async (): Promise<CleanupResult | null> => {
    if (isCleaningUp) return null;
    
    setIsCleaningUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('storage-cleaner');
      
      if (error) {
        console.error('[Storage Hygiene] Cleanup failed:', error);
        return null;
      }

      const result = data as CleanupResult;
      
      // Update local stats
      const newStats: StorageStats = {
        usedMB: result.storageUsedMB,
        percentage: result.storagePercentage,
        lastCleanup: new Date().toISOString(),
        filesDeleted: result.deletedFiles,
        bytesFreed: result.freedMB * 1024 * 1024,
      };
      
      setStats(newStats);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newStats));

      // Log to Zoe Core
      console.log('[Storage Hygiene] Cleanup completed:', result);
      
      return result;
    } catch (err) {
      console.error('[Storage Hygiene] Error:', err);
      return null;
    } finally {
      setIsCleaningUp(false);
    }
  }, [isCleaningUp]);

  // Check if cleanup is needed based on local cache
  const needsCleanup = useCallback((): boolean => {
    if (!stats.lastCleanup) return true;
    
    const lastCleanup = new Date(stats.lastCleanup).getTime();
    const now = Date.now();
    
    // Cleanup if >24 hours since last cleanup OR storage >80%
    return (now - lastCleanup > 24 * 60 * 60 * 1000) || stats.percentage > 80;
  }, [stats]);

  // Client-side temp file cleanup (IndexedDB, localStorage)
  const cleanupLocalStorage = useCallback(() => {
    const keysToCheck = [
      'zoe_delta_sync_',
      'zoe_edge_brain_',
      'temp_media_',
      'upload_progress_',
    ];

    let bytesCleared = 0;
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key) continue;

      const shouldCheck = keysToCheck.some(prefix => key.startsWith(prefix));
      if (!shouldCheck) continue;

      try {
        const value = localStorage.getItem(key);
        if (!value) continue;

        const parsed = JSON.parse(value);
        const timestamp = parsed.timestamp || parsed.lastUpdated || parsed.created_at;
        
        if (timestamp && (now - new Date(timestamp).getTime()) > maxAge) {
          bytesCleared += value.length * 2; // Rough estimate (UTF-16)
          localStorage.removeItem(key);
        }
      } catch {
        // Not JSON or no timestamp, check size
        const value = localStorage.getItem(key);
        if (value && value.length > 100000) { // >100KB
          bytesCleared += value.length * 2;
          localStorage.removeItem(key);
        }
      }
    }

    if (bytesCleared > 0) {
      console.log(`[Storage Hygiene] Cleared ${Math.round(bytesCleared / 1024)}KB from localStorage`);
    }

    return bytesCleared;
  }, []);

  // Automatic periodic check
  useEffect(() => {
    const checkInterval = setInterval(() => {
      cleanupLocalStorage();
      
      if (needsCleanup()) {
        triggerCleanup();
      }
    }, STORAGE_CHECK_INTERVAL);

    // Initial check
    cleanupLocalStorage();

    return () => clearInterval(checkInterval);
  }, [cleanupLocalStorage, needsCleanup, triggerCleanup]);

  return {
    stats,
    isCleaningUp,
    triggerCleanup,
    cleanupLocalStorage,
    needsCleanup,
  };
}
