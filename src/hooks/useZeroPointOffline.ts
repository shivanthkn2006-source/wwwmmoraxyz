/**
 * ZERO-POINT OFFLINE MATRIX
 * Project Exodus 2120 - Quantum Caching System
 * 
 * Features:
 * 1. Hyper-Caching - Store entire app state in IndexedDB
 * 2. Ghost Engine - Local Zoe logic via WebAssembly-style processing
 * 3. Satellite Sync - Delta compression for efficient sync
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Database configuration
const DB_NAME = 'ZoeZeroPoint';
const DB_VERSION = 3;

// Store names
const STORES = {
  STATE: 'app_state',
  VR_WORLD: 'vr_world',
  MESSAGES: 'offline_messages',
  EVENTS: 'queued_events',
  DELTA: 'sync_deltas',
  ASSETS: 'cached_assets'
} as const;

export interface OfflineState {
  isOffline: boolean;
  isSyncing: boolean;
  lastSyncAt: number | null;
  pendingChanges: number;
  cacheSize: number;
  ghostEngineActive: boolean;
}

export interface VRWorldState {
  id: string;
  assets: { id: string; position: [number, number, number]; rotation: [number, number, number] }[];
  inventory: { id: string; name: string; quantity: number }[];
  environment: {
    skybox: string;
    lighting: string;
    weather: string;
  };
  timestamp: number;
}

export interface SyncDelta {
  id: string;
  operation: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  synced: boolean;
}

let db: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;
let isClosing = false;

// Initialize IndexedDB with connection management
const initDB = (): Promise<IDBDatabase> => {
  // Return existing promise if already initializing
  if (dbPromise && !isClosing) {
    return dbPromise;
  }

  // Return existing connection if valid
  if (db && !isClosing) {
    try {
      // Test if connection is still valid by attempting a simple operation
      if (db.objectStoreNames.length > 0) {
        return Promise.resolve(db);
      }
    } catch {
      // Connection is stale, reinitialize
      db = null;
    }
  }

  dbPromise = new Promise((resolve, reject) => {
    isClosing = false;
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
    
    request.onsuccess = () => {
      db = request.result;
      
      // Handle unexpected close
      db.onclose = () => {
        console.log('[ZeroPoint] Database connection closed unexpectedly');
        db = null;
        dbPromise = null;
        isClosing = true;
      };
      
      // Handle version change (another tab updated the DB)
      db.onversionchange = () => {
        console.log('[ZeroPoint] Database version change detected, closing connection');
        db?.close();
        db = null;
        dbPromise = null;
        isClosing = true;
      };
      
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      // Create stores if they don't exist
      Object.values(STORES).forEach(storeName => {
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
        }
      });
    };
  });

  return dbPromise;
};

// Safe transaction wrapper with retry logic
const safeTransaction = async <T>(
  storeName: string, 
  mode: IDBTransactionMode, 
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | null> => {
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const database = await initDB();
      
      // Check if database connection is still valid
      if (!database || database.objectStoreNames.length === 0) {
        db = null;
        dbPromise = null;
        continue;
      }
      
      return new Promise<T | null>((resolve, reject) => {
        try {
          const transaction = database.transaction(storeName, mode);
          const store = transaction.objectStore(storeName);
          const request = operation(store);
          
          transaction.oncomplete = () => resolve(request.result ?? null);
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(new Error('Transaction aborted'));
          
          request.onerror = () => reject(request.error);
        } catch (error) {
          // Handle "database connection is closing" error
          if (error instanceof Error && error.message.includes('closing')) {
            db = null;
            dbPromise = null;
            reject(error);
          } else {
            reject(error);
          }
        }
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[ZeroPoint] Transaction attempt ${attempt + 1} failed:`, lastError.message);
      
      // Reset connection for next attempt
      db = null;
      dbPromise = null;
      
      // Wait before retry
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
      }
    }
  }
  
  console.error('[ZeroPoint] All transaction attempts failed:', lastError);
  return null;
};

// Generic store operations with safe wrappers
const storeGet = async <T>(storeName: string, key: string): Promise<T | null> => {
  return safeTransaction(storeName, 'readonly', (store) => store.get(key)) as Promise<T | null>;
};

const storeSet = async <T extends { id: string }>(storeName: string, data: T): Promise<void> => {
  await safeTransaction(storeName, 'readwrite', (store) => store.put(data));
};

const storeGetAll = async <T>(storeName: string): Promise<T[]> => {
  const result = await safeTransaction(storeName, 'readonly', (store) => store.getAll());
  return (result as T[]) ?? [];
};

const storeDelete = async (storeName: string, key: string): Promise<void> => {
  await safeTransaction(storeName, 'readwrite', (store) => store.delete(key));
};

const storeClear = async (storeName: string): Promise<void> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const useZeroPointOffline = () => {
  const { user } = useAuth();
  const [state, setState] = useState<OfflineState>({
    isOffline: !navigator.onLine,
    isSyncing: false,
    lastSyncAt: null,
    pendingChanges: 0,
    cacheSize: 0,
    ghostEngineActive: false
  });

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ═══════════════════════════════════════════════════════════════════
  // HYPER-CACHING - Store entire app state
  // ═══════════════════════════════════════════════════════════════════
  const cacheAppState = useCallback(async (stateData: Record<string, any>): Promise<void> => {
    try {
      await storeSet(STORES.STATE, {
        id: 'current_state',
        data: stateData,
        userId: user?.id,
        timestamp: Date.now()
      });
      console.log('[ZeroPoint] App state cached');
    } catch (error) {
      console.error('[ZeroPoint] Cache error:', error);
    }
  }, [user]);

  const getAppState = useCallback(async (): Promise<Record<string, any> | null> => {
    try {
      const cached = await storeGet<{ data: Record<string, any> }>(STORES.STATE, 'current_state');
      return cached?.data || null;
    } catch (error) {
      console.error('[ZeroPoint] Get state error:', error);
      return null;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // VR WORLD STATE - Cache entire VR world
  // ═══════════════════════════════════════════════════════════════════
  const cacheVRWorld = useCallback(async (worldState: VRWorldState): Promise<void> => {
    try {
      await storeSet(STORES.VR_WORLD, {
        ...worldState,
        id: 'vr_world_state'
      });
      console.log('[ZeroPoint] VR world cached:', worldState.assets.length, 'assets');
    } catch (error) {
      console.error('[ZeroPoint] VR cache error:', error);
    }
  }, []);

  const getVRWorld = useCallback(async (): Promise<VRWorldState | null> => {
    try {
      return await storeGet<VRWorldState>(STORES.VR_WORLD, 'vr_world_state');
    } catch {
      return null;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // GHOST ENGINE - Local Zoe logic processing
  // ═══════════════════════════════════════════════════════════════════
  const activateGhostEngine = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, ghostEngineActive: true }));
    
    console.log('[ZeroPoint] GHOST ENGINE activated');
    toast.info('👻 Ghost Engine Active', {
      description: 'Local Zoe processing enabled'
    });

    // Dispatch event for other systems
    window.dispatchEvent(new CustomEvent('ghost-engine-activated', {
      detail: { timestamp: Date.now() }
    }));
  }, []);

  const deactivateGhostEngine = useCallback((): void => {
    setState(prev => ({ ...prev, ghostEngineActive: false }));
    console.log('[ZeroPoint] Ghost Engine deactivated');
  }, []);

  // Ghost engine local processing
  const ghostProcess = useCallback(async (input: string): Promise<string> => {
    if (!state.ghostEngineActive) {
      return 'Ghost Engine not active. Connect to internet for full Zoe capabilities.';
    }

    // Local pattern matching for basic responses
    const patterns: [RegExp, string][] = [
      [/hello|hi|hey/i, "Hello! I'm running in Ghost Mode. Some features are limited offline."],
      [/how are you/i, "I'm operating in offline mode with reduced capabilities, but I'm here to help!"],
      [/time|what time/i, `The current time is ${new Date().toLocaleTimeString()}`],
      [/date|what date/i, `Today is ${new Date().toLocaleDateString()}`],
      [/help/i, "I can help with basic queries while offline. Voice commands, VR navigation, and cached data are available."],
      [/offline|status/i, "You're currently offline. Changes will sync when connection is restored."],
    ];

    for (const [pattern, response] of patterns) {
      if (pattern.test(input)) {
        return response;
      }
    }

    return "I'm in Ghost Mode with limited processing. This query requires online access to Zoe Core.";
  }, [state.ghostEngineActive]);

  // ═══════════════════════════════════════════════════════════════════
  // DELTA COMPRESSION - Track changes for efficient sync
  // ═══════════════════════════════════════════════════════════════════
  const recordDelta = useCallback(async (
    operation: 'create' | 'update' | 'delete',
    table: string,
    data: any
  ): Promise<void> => {
    const delta: SyncDelta = {
      id: crypto.randomUUID(),
      operation,
      table,
      data,
      timestamp: Date.now(),
      synced: false
    };

    await storeSet(STORES.DELTA, delta);
    
    setState(prev => ({
      ...prev,
      pendingChanges: prev.pendingChanges + 1
    }));

    console.log('[ZeroPoint] Delta recorded:', operation, table);
  }, []);

  const getPendingDeltas = useCallback(async (): Promise<SyncDelta[]> => {
    const allDeltas = await storeGetAll<SyncDelta>(STORES.DELTA);
    return allDeltas.filter(d => !d.synced);
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // SATELLITE SYNC - Sync changes when online
  // ═══════════════════════════════════════════════════════════════════
  const satelliteSync = useCallback(async (): Promise<{
    synced: number;
    failed: number;
    compressed: boolean;
  }> => {
    if (!navigator.onLine || !user) {
      return { synced: 0, failed: 0, compressed: false };
    }

    setState(prev => ({ ...prev, isSyncing: true }));
    
    let synced = 0;
    let failed = 0;

    try {
      const pendingDeltas = await getPendingDeltas();
      
      if (pendingDeltas.length === 0) {
        setState(prev => ({ 
          ...prev, 
          isSyncing: false,
          lastSyncAt: Date.now()
        }));
        return { synced: 0, failed: 0, compressed: false };
      }

      console.log(`[ZeroPoint] SATELLITE SYNC: ${pendingDeltas.length} deltas`);

      // Group deltas by table for batch processing (compression)
      const groupedDeltas: Record<string, SyncDelta[]> = {};
      for (const delta of pendingDeltas) {
        if (!groupedDeltas[delta.table]) {
          groupedDeltas[delta.table] = [];
        }
        groupedDeltas[delta.table].push(delta);
      }

      // Process each table's deltas
      for (const [table, deltas] of Object.entries(groupedDeltas)) {
        // Compress: Merge consecutive updates to same record
        const compressedDeltas = compressDeltas(deltas);

        for (const delta of compressedDeltas) {
          try {
            // Use type assertion for dynamic table access
            const tableRef = supabase.from(table as any);
            
            switch (delta.operation) {
              case 'create':
                await tableRef.insert(delta.data);
                break;
              case 'update':
                await tableRef.update(delta.data).eq('id', delta.data.id);
                break;
              case 'delete':
                await tableRef.delete().eq('id', delta.data.id);
                break;
            }

            // Mark as synced
            await storeSet(STORES.DELTA, { ...delta, synced: true });
            synced++;
          } catch (error) {
            console.error('[ZeroPoint] Sync error:', error);
            failed++;
          }
        }
      }

      // Clear synced deltas
      const allDeltas = await storeGetAll<SyncDelta>(STORES.DELTA);
      for (const delta of allDeltas.filter(d => d.synced)) {
        await storeDelete(STORES.DELTA, delta.id);
      }

      setState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: Date.now(),
        pendingChanges: failed
      }));

      if (synced > 0) {
        toast.success(`📡 Satellite Sync Complete`, {
          description: `${synced} changes synchronized`
        });
      }

      return { synced, failed, compressed: true };

    } catch (error) {
      console.error('[ZeroPoint] Satellite sync failed:', error);
      setState(prev => ({ ...prev, isSyncing: false }));
      return { synced, failed, compressed: false };
    }
  }, [user, getPendingDeltas]);

  // Compress deltas for same record
  const compressDeltas = (deltas: SyncDelta[]): SyncDelta[] => {
    const recordMap: Record<string, SyncDelta> = {};

    for (const delta of deltas) {
      const key = delta.data.id || delta.id;
      
      if (!recordMap[key]) {
        recordMap[key] = delta;
      } else {
        // Merge updates
        if (delta.operation === 'delete') {
          recordMap[key] = delta;
        } else if (delta.operation === 'update' && recordMap[key].operation !== 'delete') {
          recordMap[key] = {
            ...recordMap[key],
            data: { ...recordMap[key].data, ...delta.data },
            timestamp: delta.timestamp
          };
        }
      }
    }

    return Object.values(recordMap);
  };

  // ═══════════════════════════════════════════════════════════════════
  // CACHE SIZE CALCULATION
  // ═══════════════════════════════════════════════════════════════════
  const calculateCacheSize = useCallback(async (): Promise<number> => {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usedMB = Math.round((estimate.usage || 0) / (1024 * 1024));
        setState(prev => ({ ...prev, cacheSize: usedMB }));
        return usedMB;
      }
    } catch {
      // Fallback estimation
    }
    return 0;
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // ONLINE/OFFLINE HANDLERS
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    const handleOnline = () => {
      console.log('[ZeroPoint] Connection restored');
      setState(prev => ({ ...prev, isOffline: false }));
      deactivateGhostEngine();
      
      // Auto-sync when back online
      setTimeout(() => {
        satelliteSync();
      }, 2000);

      toast.success('🌐 Connection Restored', {
        description: 'Initiating satellite sync...'
      });
    };

    const handleOffline = () => {
      console.log('[ZeroPoint] Connection lost');
      setState(prev => ({ ...prev, isOffline: true }));
      activateGhostEngine();

      toast.warning('📴 Offline Mode', {
        description: 'Ghost Engine activated. Changes will sync when online.'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize
    initDB().then(() => {
      calculateCacheSize();
    });

    // Periodic sync when online
    syncIntervalRef.current = setInterval(() => {
      if (navigator.onLine) {
        satelliteSync();
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [satelliteSync, activateGhostEngine, deactivateGhostEngine, calculateCacheSize]);

  return {
    // State
    isOffline: state.isOffline,
    isSyncing: state.isSyncing,
    lastSyncAt: state.lastSyncAt,
    pendingChanges: state.pendingChanges,
    cacheSize: state.cacheSize,
    ghostEngineActive: state.ghostEngineActive,

    // Hyper-Caching
    cacheAppState,
    getAppState,
    cacheVRWorld,
    getVRWorld,

    // Ghost Engine
    activateGhostEngine,
    deactivateGhostEngine,
    ghostProcess,

    // Delta & Sync
    recordDelta,
    getPendingDeltas,
    satelliteSync,
    calculateCacheSize
  };
};
