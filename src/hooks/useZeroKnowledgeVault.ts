// ═══════════════════════════════════════════════════════════════════════════════
// ZERO-KNOWLEDGE SHIELD - Voice-Derived Key Encryption
// Military-Grade Offline Authentication via IndexedDB
// Key is NEVER stored - it's derived from voice itself
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useState } from 'react';
import type { VoiceDNA } from './useVoiceBioResonance';

const DB_NAME = 'VoiceCitadelVault';
const DB_VERSION = 1;
const STORE_NAME = 'encrypted_tokens';

export interface EncryptedSessionToken {
  userId: string;
  encryptedData: ArrayBuffer;
  iv: Uint8Array;
  salt: Uint8Array;
  createdAt: string;
  expiresAt: string;
  deviceFingerprint: string;
}

export interface VaultStatus {
  hasStoredToken: boolean;
  tokenExpired: boolean;
  lastAccess: string | null;
  failedAttempts: number;
}

export function useZeroKnowledgeVault() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // INDEXEDDB SETUP
  // ═══════════════════════════════════════════════════════════════════════════
  const openDatabase = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
        }
      };
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVE ENCRYPTION KEY FROM VOICE DNA
  // The key is NEVER stored - it's computed from voice features
  // ═══════════════════════════════════════════════════════════════════════════
  const deriveKeyFromVoice = useCallback(async (
    voiceDNA: VoiceDNA,
    salt: Uint8Array
  ): Promise<CryptoKey> => {
    // Create deterministic key material from voice features
    const keyMaterial = [
      voiceDNA.pitch.toFixed(1),
      voiceDNA.tempo.toFixed(2),
      voiceDNA.spectralCentroid.toString(),
      voiceDNA.mfccHash.slice(0, 32)
    ].join('|');
    
    console.log('[ZERO-KNOWLEDGE] Deriving key from Voice DNA...');
    
    // Import as raw key material
    const rawKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(keyMaterial),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    // Derive AES-GCM key using PBKDF2 - create a new ArrayBuffer copy
    const saltCopy = new ArrayBuffer(salt.byteLength);
    new Uint8Array(saltCopy).set(salt);
    
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltCopy,
        iterations: 100000,
        hash: 'SHA-256'
      },
      rawKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    
    return derivedKey;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // ENCRYPT SESSION TOKEN WITH VOICE-DERIVED KEY
  // ═══════════════════════════════════════════════════════════════════════════
  const encryptToken = useCallback(async (
    voiceDNA: VoiceDNA,
    sessionToken: string,
    userId: string,
    deviceFingerprint: string,
    expirationHours: number = 24
  ): Promise<boolean> => {
    setIsProcessing(true);
    
    try {
      // Generate random salt and IV
      const salt = new Uint8Array(16);
      crypto.getRandomValues(salt);
      const iv = new Uint8Array(12);
      crypto.getRandomValues(iv);
      
      // Derive key from voice
      const key = await deriveKeyFromVoice(voiceDNA, new Uint8Array(salt.buffer));
      
      // Encrypt the session token
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv.buffer) },
        key,
        new TextEncoder().encode(sessionToken)
      );
      
      // Store in IndexedDB
      const db = await openDatabase();
      
      const token: EncryptedSessionToken = {
        userId,
        encryptedData,
        iv,
        salt,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + expirationHours * 60 * 60 * 1000).toISOString(),
        deviceFingerprint
      };
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(token);
        
        request.onsuccess = () => {
          console.log('[ZERO-KNOWLEDGE] Token encrypted and stored in vault');
          resolve(true);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[ZERO-KNOWLEDGE] Encryption failed:', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [deriveKeyFromVoice, openDatabase]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DECRYPT SESSION TOKEN WITH VOICE-DERIVED KEY
  // If voice is wrong, decryption FAILS - key won't work
  // ═══════════════════════════════════════════════════════════════════════════
  const decryptToken = useCallback(async (
    voiceDNA: VoiceDNA,
    userId: string
  ): Promise<{ success: boolean; token?: string; reason?: string }> => {
    if (isLocked) {
      return { success: false, reason: 'Vault locked after too many failed attempts' };
    }
    
    setIsProcessing(true);
    
    try {
      const db = await openDatabase();
      
      const storedToken = await new Promise<EncryptedSessionToken | null>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(userId);
        
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
      
      if (!storedToken) {
        return { success: false, reason: 'No stored token found' };
      }
      
      // Check expiration
      if (new Date(storedToken.expiresAt) < new Date()) {
        await deleteToken(userId);
        return { success: false, reason: 'Token expired' };
      }
      
      // Derive key from current voice
      const key = await deriveKeyFromVoice(voiceDNA, new Uint8Array(storedToken.salt));
      
      try {
        // Attempt decryption - this FAILS if voice is different
        const decryptedData = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: new Uint8Array(storedToken.iv) },
          key,
          storedToken.encryptedData
        );
        
        const token = new TextDecoder().decode(decryptedData);
        
        // Reset failed attempts on success
        setFailedAttempts(0);
        
        console.log('[ZERO-KNOWLEDGE] ✓ Token decrypted successfully');
        return { success: true, token };
        
      } catch (decryptError) {
        // Decryption failed - wrong voice
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        
        console.warn(`[ZERO-KNOWLEDGE] Decryption failed (attempt ${newFailedAttempts}/3)`);
        
        // Lock after 3 failed attempts
        if (newFailedAttempts >= 3) {
          setIsLocked(true);
          console.error('[ZERO-KNOWLEDGE] Vault LOCKED - too many failed attempts');
          return { success: false, reason: 'Vault locked - use biometric fallback or PIN' };
        }
        
        return { success: false, reason: `Voice not recognized (${3 - newFailedAttempts} attempts remaining)` };
      }
    } catch (error) {
      console.error('[ZERO-KNOWLEDGE] Decryption error:', error);
      return { success: false, reason: 'Vault access error' };
    } finally {
      setIsProcessing(false);
    }
  }, [deriveKeyFromVoice, openDatabase, failedAttempts, isLocked]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE STORED TOKEN
  // ═══════════════════════════════════════════════════════════════════════════
  const deleteToken = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const db = await openDatabase();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(userId);
        
        request.onsuccess = () => {
          console.log('[ZERO-KNOWLEDGE] Token deleted from vault');
          resolve(true);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[ZERO-KNOWLEDGE] Delete failed:', error);
      return false;
    }
  }, [openDatabase]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK VAULT STATUS
  // ═══════════════════════════════════════════════════════════════════════════
  const getVaultStatus = useCallback(async (userId: string): Promise<VaultStatus> => {
    try {
      const db = await openDatabase();
      
      const storedToken = await new Promise<EncryptedSessionToken | null>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(userId);
        
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
      
      if (!storedToken) {
        return {
          hasStoredToken: false,
          tokenExpired: false,
          lastAccess: null,
          failedAttempts
        };
      }
      
      return {
        hasStoredToken: true,
        tokenExpired: new Date(storedToken.expiresAt) < new Date(),
        lastAccess: storedToken.createdAt,
        failedAttempts
      };
    } catch {
      return {
        hasStoredToken: false,
        tokenExpired: false,
        lastAccess: null,
        failedAttempts
      };
    }
  }, [openDatabase, failedAttempts]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET VAULT LOCK (requires external verification like PIN)
  // ═══════════════════════════════════════════════════════════════════════════
  const resetVaultLock = useCallback(() => {
    setIsLocked(false);
    setFailedAttempts(0);
    console.log('[ZERO-KNOWLEDGE] Vault lock reset');
  }, []);

  return {
    // State
    isProcessing,
    isLocked,
    failedAttempts,
    
    // Actions
    encryptToken,
    decryptToken,
    deleteToken,
    getVaultStatus,
    resetVaultLock
  };
}
