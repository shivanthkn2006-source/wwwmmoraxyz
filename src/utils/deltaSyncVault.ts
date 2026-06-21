/**
 * DELTA SYNC VAULT - THE BANDWIDTH SAVER
 * Protocol 3: Timestamp-based sync + IndexedDB caching
 * 
 * Features:
 * 1. Only download data changed since last_synced_timestamp
 * 2. Store Profile, Timeline, Chats in IndexedDB (The Vault)
 * 3. 24-hour stale time for static data (Birth Charts, etc.)
 * 4. Manual refresh override capability
 */

// ═══════════════════════════════════════════════════════════════════════════════
// DELTA SYNC CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const DB_NAME = 'ZoeDeltaVault';
const DB_VERSION = 1;

// Stale times (in milliseconds)
export const STALE_TIMES = {
  PROFILE: 24 * 60 * 60 * 1000,        // 24 hours - User profile rarely changes
  BIRTH_CHART: 7 * 24 * 60 * 60 * 1000, // 7 days - Birth chart never changes
  SOUL_CODEX: 24 * 60 * 60 * 1000,      // 24 hours - Soul codex updates slowly
  TIMELINE: 60 * 60 * 1000,              // 1 hour - Timeline updates moderately
  CHAT_HISTORY: 5 * 60 * 1000,           // 5 minutes - Chats update frequently
  RELATIONSHIPS: 12 * 60 * 60 * 1000,    // 12 hours - Relationships stable
  ECN_STATE: 30 * 60 * 1000,             // 30 minutes - ECN updates moderately
} as const;

// Store names
const STORES = {
  PROFILE: 'user_profile',
  SOUL_CODEX: 'soul_codex',
  TIMELINE: 'timeline_data',
  CHAT_HISTORY: 'chat_history',
  RELATIONSHIPS: 'relationships',
  SYNC_METADATA: 'sync_metadata',
  BIRTH_CHART: 'birth_chart',
  ECN_STATE: 'ecn_state',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SyncMetadata {
  id: string;
  storeName: string;
  lastSyncTimestamp: string;
  dataHash?: string;
  rowCount: number;
}

export interface CachedData<T> {
  id: string;
  userId: string;
  data: T;
  cachedAt: number;
  staleTime: number;
}

export interface DeltaSyncResult<T> {
  data: T | null;
  fromCache: boolean;
  isStale: boolean;
  lastSync: string | null;
  deltaCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDEXEDDB INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

let db: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

const initDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  if (db) return Promise.resolve(db);

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      
      db.onclose = () => {
        db = null;
        dbPromise = null;
      };

      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create stores for each data type
      Object.values(STORES).forEach(storeName => {
        if (!database.objectStoreNames.contains(storeName)) {
          const store = database.createObjectStore(storeName, { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('cachedAt', 'cachedAt', { unique: false });
        }
      });
    };
  });

  return dbPromise;
};

// ═══════════════════════════════════════════════════════════════════════════════
// VAULT OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export class DeltaSyncVault {
  // Get cached data from vault
  static async get<T>(storeName: string, userId: string): Promise<CachedData<T> | null> {
    try {
      const database = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(`${userId}_${storeName}`);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[DeltaVault] Get error:', error);
      return null;
    }
  }

  // Store data in vault
  static async set<T>(
    storeName: string, 
    userId: string, 
    data: T, 
    staleTime: number
  ): Promise<void> {
    try {
      const database = await initDB();
      const cached: CachedData<T> = {
        id: `${userId}_${storeName}`,
        userId,
        data,
        cachedAt: Date.now(),
        staleTime,
      };

      return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(cached);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[DeltaVault] Set error:', error);
    }
  }

  // Check if data is stale
  static isStale(cached: CachedData<any> | null): boolean {
    if (!cached) return true;
    return Date.now() - cached.cachedAt > cached.staleTime;
  }

  // Get sync metadata
  static async getSyncMetadata(storeName: string, userId: string): Promise<SyncMetadata | null> {
    try {
      const database = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORES.SYNC_METADATA, 'readonly');
        const store = transaction.objectStore(STORES.SYNC_METADATA);
        const request = store.get(`${userId}_${storeName}`);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return null;
    }
  }

  // Update sync metadata
  static async updateSyncMetadata(
    storeName: string, 
    userId: string, 
    rowCount: number
  ): Promise<void> {
    try {
      const database = await initDB();
      const metadata: SyncMetadata = {
        id: `${userId}_${storeName}`,
        storeName,
        lastSyncTimestamp: new Date().toISOString(),
        rowCount,
      };

      return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORES.SYNC_METADATA, 'readwrite');
        const store = transaction.objectStore(STORES.SYNC_METADATA);
        const request = store.put(metadata);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[DeltaVault] Metadata update error:', error);
    }
  }

  // Clear specific cache
  static async clearCache(storeName: string, userId: string): Promise<void> {
    try {
      const database = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction([storeName, STORES.SYNC_METADATA], 'readwrite');
        
        const dataStore = transaction.objectStore(storeName);
        dataStore.delete(`${userId}_${storeName}`);
        
        const metaStore = transaction.objectStore(STORES.SYNC_METADATA);
        metaStore.delete(`${userId}_${storeName}`);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('[DeltaVault] Clear cache error:', error);
    }
  }

  // Clear all user caches
  static async clearAllUserCaches(userId: string): Promise<void> {
    for (const storeName of Object.values(STORES)) {
      await this.clearCache(storeName, userId);
    }
    console.log('[DeltaVault] All user caches cleared');
  }

  // Get vault statistics
  static async getStats(userId: string): Promise<{
    totalCached: number;
    staleCount: number;
    totalSize: number;
  }> {
    let totalCached = 0;
    let staleCount = 0;

    for (const storeName of Object.values(STORES)) {
      if (storeName === STORES.SYNC_METADATA) continue;
      
      const cached = await this.get(storeName, userId);
      if (cached) {
        totalCached++;
        if (this.isStale(cached)) staleCount++;
      }
    }

    // Estimate storage size
    let totalSize = 0;
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      totalSize = estimate.usage || 0;
    }

    return { totalCached, staleCount, totalSize };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELTA SYNC FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Delta sync a table - only fetches rows modified after last sync
 */
export async function deltaSync<T>(
  userId: string,
  table: string,
  storeName: string,
  staleTime: number,
  fetchFn: (lastSync: string | null) => Promise<T[]>,
  forceRefresh: boolean = false
): Promise<DeltaSyncResult<T[]>> {
  // Check cache first
  const cached = await DeltaSyncVault.get<T[]>(storeName, userId);
  const metadata = await DeltaSyncVault.getSyncMetadata(storeName, userId);

  // Return cached data if not stale and not forcing refresh
  if (cached && !DeltaSyncVault.isStale(cached) && !forceRefresh) {
    console.log(`[DeltaSync] ${table}: Using cached data (${cached.data?.length || 0} rows)`);
    return {
      data: cached.data,
      fromCache: true,
      isStale: false,
      lastSync: metadata?.lastSyncTimestamp || null,
      deltaCount: 0,
    };
  }

  try {
    // Fetch only changes since last sync (delta)
    const lastSync = forceRefresh ? null : metadata?.lastSyncTimestamp || null;
    const deltaData = await fetchFn(lastSync);

    // Merge with existing data if doing delta update
    let finalData: T[];
    if (cached?.data && lastSync && deltaData.length > 0) {
      // Merge: Remove old versions, add new ones
      const existingMap = new Map<string, T>();
      for (const item of cached.data as any[]) {
        existingMap.set(item.id, item);
      }
      for (const item of deltaData as any[]) {
        existingMap.set(item.id, item);
      }
      finalData = Array.from(existingMap.values());
      console.log(`[DeltaSync] ${table}: Merged ${deltaData.length} new rows with ${cached.data.length} cached`);
    } else if (deltaData.length > 0) {
      finalData = deltaData;
      console.log(`[DeltaSync] ${table}: Fresh fetch (${deltaData.length} rows)`);
    } else if (cached?.data) {
      // No new data, but cache exists - keep it
      finalData = cached.data;
      console.log(`[DeltaSync] ${table}: No new data, keeping cache`);
    } else {
      finalData = [];
    }

    // Update cache
    await DeltaSyncVault.set(storeName, userId, finalData, staleTime);
    await DeltaSyncVault.updateSyncMetadata(storeName, userId, finalData.length);

    return {
      data: finalData,
      fromCache: false,
      isStale: false,
      lastSync: new Date().toISOString(),
      deltaCount: deltaData.length,
    };
  } catch (error) {
    console.error(`[DeltaSync] ${table} error:`, error);
    
    // Return stale cache if available
    if (cached) {
      return {
        data: cached.data,
        fromCache: true,
        isStale: true,
        lastSync: metadata?.lastSyncTimestamp || null,
        deltaCount: 0,
      };
    }

    return {
      data: null,
      fromCache: false,
      isStale: true,
      lastSync: null,
      deltaCount: 0,
    };
  }
}

/**
 * Delta sync a single record
 */
export async function deltaSyncSingle<T>(
  userId: string,
  table: string,
  storeName: string,
  staleTime: number,
  fetchFn: () => Promise<T | null>,
  forceRefresh: boolean = false
): Promise<DeltaSyncResult<T>> {
  const cached = await DeltaSyncVault.get<T>(storeName, userId);
  const metadata = await DeltaSyncVault.getSyncMetadata(storeName, userId);

  // Return cached if not stale
  if (cached && !DeltaSyncVault.isStale(cached) && !forceRefresh) {
    console.log(`[DeltaSync] ${table}: Using cached single record`);
    return {
      data: cached.data,
      fromCache: true,
      isStale: false,
      lastSync: metadata?.lastSyncTimestamp || null,
      deltaCount: 0,
    };
  }

  try {
    const data = await fetchFn();

    if (data) {
      await DeltaSyncVault.set(storeName, userId, data, staleTime);
      await DeltaSyncVault.updateSyncMetadata(storeName, userId, 1);
    }

    return {
      data,
      fromCache: false,
      isStale: false,
      lastSync: new Date().toISOString(),
      deltaCount: data ? 1 : 0,
    };
  } catch (error) {
    console.error(`[DeltaSync] ${table} single error:`, error);
    
    if (cached) {
      return {
        data: cached.data,
        fromCache: true,
        isStale: true,
        lastSync: metadata?.lastSyncTimestamp || null,
        deltaCount: 0,
      };
    }

    return {
      data: null,
      fromCache: false,
      isStale: true,
      lastSync: null,
      deltaCount: 0,
    };
  }
}

export { STORES };
