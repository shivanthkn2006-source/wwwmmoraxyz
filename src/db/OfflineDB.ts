/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY — OFFLINE DATABASE (IndexedDB via Dexie)
 * Local-first persistence layer with cloud sync capability
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import Dexie from 'dexie/dist/dexie.mjs';

const DexieRuntime = Dexie as any;
type Table<T, Key> = any;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface OfflineMessage {
  id: string;
  localId?: string; // Client-generated ID for optimistic updates
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  syncedAt?: Date; // When synced to cloud
  syncStatus: 'pending' | 'synced' | 'conflict' | 'failed';
}

export interface OfflineProfile {
  id: string;
  userId: string;
  username?: string;
  displayName?: string;
  nickname?: string;
  dateOfBirth?: string;
  timezone?: string;
  preferences?: Record<string, any>;
  lastUpdated: Date;
  syncStatus: 'pending' | 'synced' | 'conflict';
}

export interface OfflineMail {
  id: string;
  userId: string;
  fromUserId: string;
  fromUsername?: string;
  subject?: string;
  content: string;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  createdAt: Date;
  syncStatus: 'pending' | 'synced' | 'conflict';
}

export interface SyncQueueItem {
  id?: number;
  table: string;
  recordId: string;
  operation: 'create' | 'update' | 'delete';
  payload: any;
  createdAt: Date;
  attempts: number;
  lastAttempt?: Date;
  error?: string;
}

export interface OfflineSettings {
  key: string;
  value: any;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

class ZoeOfflineDB extends DexieRuntime {
  messages!: Table<OfflineMessage, string>;
  profiles!: Table<OfflineProfile, string>;
  mail!: Table<OfflineMail, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  settings!: Table<OfflineSettings, string>;

  constructor() {
    super('ZoeInfinityOffline');

    this.version(1).stores({
      // Primary key, then indexed fields
      messages: 'id, localId, userId, createdAt, syncStatus, [userId+createdAt]',
      profiles: 'id, userId, syncStatus',
      mail: 'id, userId, fromUserId, createdAt, isRead, isArchived, syncStatus, [userId+createdAt]',
      syncQueue: '++id, table, recordId, createdAt, attempts',
      settings: 'key',
    });
  }
}

// Singleton instance
export const offlineDB = new ZoeOfflineDB();

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const offlineMessages = {
  /**
   * Add a new message (offline-first)
   * BUG FIX: skipSyncQueue option added to prevent duplicate sync when caller handles cloud save
   */
  async add(message: Omit<OfflineMessage, 'syncStatus'>, options?: { skipSyncQueue?: boolean }): Promise<string> {
    // BUG FIX: When skipSyncQueue is true, it means caller handles cloud sync directly.
    // The status should still be 'pending' until markSynced() is called after successful cloud save.
    // Setting it to 'synced' prematurely was causing sync state inconsistency.
    const record: OfflineMessage = {
      ...message,
      syncStatus: 'pending', // Always start as pending - markSynced() will update after cloud confirms
      localId: message.localId || `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    };

    await offlineDB.messages.put(record);

    // Only queue for sync if not skipped (caller may handle cloud sync directly)
    if (!options?.skipSyncQueue) {
      await offlineDB.syncQueue.add({
        table: 'messages',
        recordId: record.id,
        operation: 'create',
        payload: record,
        createdAt: new Date(),
        attempts: 0,
      });
    }

    return record.id;
  },

  /**
   * Get all messages for a user (sorted by date)
   */
  async getByUser(userId: string, limit = 100): Promise<OfflineMessage[]> {
    return offlineDB.messages
      .where('[userId+createdAt]')
      .between([userId, DexieRuntime.minKey], [userId, DexieRuntime.maxKey])
      .reverse()
      .limit(limit)
      .toArray();
  },

  /**
   * Get message count
   */
  async count(userId: string): Promise<number> {
    return offlineDB.messages.where('userId').equals(userId).count();
  },

  /**
   * Mark messages as synced
   */
  async markSynced(ids: string[]): Promise<void> {
    await offlineDB.messages
      .where('id')
      .anyOf(ids)
      .modify({ syncStatus: 'synced', syncedAt: new Date() });
  },

  /**
   * Get pending messages for sync
   */
  async getPending(userId: string): Promise<OfflineMessage[]> {
    return offlineDB.messages
      .where({ userId, syncStatus: 'pending' })
      .toArray();
  },

  /**
   * Bulk upsert from cloud sync
   */
  async bulkUpsert(messages: OfflineMessage[]): Promise<void> {
    await offlineDB.messages.bulkPut(
      messages.map(m => ({ ...m, syncStatus: 'synced' as const }))
    );
  },

  /**
   * Clear all messages for a user
   */
  async clear(userId: string): Promise<void> {
    await offlineDB.messages.where('userId').equals(userId).delete();
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const offlineProfiles = {
  /**
   * Get or create profile
   */
  async get(userId: string): Promise<OfflineProfile | undefined> {
    return offlineDB.profiles.where('userId').equals(userId).first();
  },

  /**
   * Update profile (offline-first)
   */
  async update(userId: string, updates: Partial<OfflineProfile>): Promise<void> {
    const existing = await this.get(userId);

    const record: OfflineProfile = {
      id: existing?.id || userId,
      userId,
      ...existing,
      ...updates,
      lastUpdated: new Date(),
      syncStatus: 'pending',
    };

    await offlineDB.profiles.put(record);

    // Queue for sync
    await offlineDB.syncQueue.add({
      table: 'profiles',
      recordId: record.id,
      operation: existing ? 'update' : 'create',
      payload: record,
      createdAt: new Date(),
      attempts: 0,
    });
  },

  /**
   * Sync from cloud
   */
  async syncFromCloud(profile: OfflineProfile): Promise<void> {
    await offlineDB.profiles.put({ ...profile, syncStatus: 'synced' });
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC QUEUE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const syncQueue = {
  /**
   * Get pending items to sync
   */
  async getPending(limit = 50): Promise<SyncQueueItem[]> {
    return offlineDB.syncQueue
      .where('attempts')
      .below(5) // Max 5 retry attempts
      .limit(limit)
      .toArray();
  },

  /**
   * Mark item as failed
   */
  async markFailed(id: number, error: string): Promise<void> {
    const current = await offlineDB.syncQueue.get(id);
    await offlineDB.syncQueue.update(id, {
      attempts: (current?.attempts || 0) + 1,
      lastAttempt: new Date(),
      error,
    });
  },

  /**
   * Remove synced item
   */
  async remove(id: number): Promise<void> {
    await offlineDB.syncQueue.delete(id);
  },

  /**
   * Clear all failed items
   */
  async clearFailed(): Promise<void> {
    await offlineDB.syncQueue.where('attempts').aboveOrEqual(5).delete();
  },

  /**
   * Get queue size
   */
  async size(): Promise<number> {
    return offlineDB.syncQueue.count();
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const offlineSettings = {
  async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const record = await offlineDB.settings.get(key);
    return (record?.value as T) ?? defaultValue;
  },

  async set(key: string, value: any): Promise<void> {
    await offlineDB.settings.put({
      key,
      value,
      updatedAt: new Date(),
    });
  },

  async remove(key: string): Promise<void> {
    await offlineDB.settings.delete(key);
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

export const dbUtils = {
  /**
   * Get database storage usage estimate
   */
  async getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return null;
  },

  /**
   * Check if offline storage is available
   */
  isAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  },

  /**
   * Request persistent storage (prevents browser from clearing)
   */
  async requestPersistence(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      return navigator.storage.persist();
    }
    return false;
  },

  /**
   * Check if storage is persistent
   */
  async isPersisted(): Promise<boolean> {
    if ('storage' in navigator && 'persisted' in navigator.storage) {
      return navigator.storage.persisted();
    }
    return false;
  },

  /**
   * Export all data for backup
   */
  async exportAll(userId: string): Promise<{
    messages: OfflineMessage[];
    profile: OfflineProfile | undefined;
    mail: OfflineMail[];
  }> {
    const [messages, profile, mail] = await Promise.all([
      offlineMessages.getByUser(userId, 10000),
      offlineProfiles.get(userId),
      offlineDB.mail.where('userId').equals(userId).toArray(),
    ]);

    return { messages, profile, mail };
  },

  /**
   * Clear all local data
   */
  async clearAll(): Promise<void> {
    await offlineDB.delete();
    await offlineDB.open();
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// NETWORK STATUS UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

export const networkStatus = {
  isOnline: () => navigator.onLine,

  /**
   * Subscribe to online/offline events
   */
  subscribe(callback: (online: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },
};

export default offlineDB;
