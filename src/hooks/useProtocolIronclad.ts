// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL IRONCLAD - AUTO-ENCRYPTION FOR NEW USERS
// ═══════════════════════════════════════════════════════════════════════════════
// 
// Automatically activates encryption for all new user registrations.
// This ensures that from the moment a user joins, their data is protected.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { 
  initializeUserEncryption, 
  retrieveEncryptionKey,
  storeEncryptionKey,
  generateEncryptionKey 
} from '@/core/security/SoulEncryption';

export interface IroncladStatus {
  isActive: boolean;
  encryptionReady: boolean;
  protectionLevel: 'NONE' | 'BASIC' | 'IRONCLAD';
  activatedAt: string | null;
  keyFingerprint: string | null;
}

export interface UseProtocolIroncladReturn {
  status: IroncladStatus;
  activateIronclad: () => Promise<boolean>;
  isLoading: boolean;
}

/**
 * Hook to manage Protocol Ironclad - automatic encryption for users
 */
export function useProtocolIronclad(): UseProtocolIroncladReturn {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<IroncladStatus>({
    isActive: false,
    encryptionReady: false,
    protectionLevel: 'NONE',
    activatedAt: null,
    keyFingerprint: null,
  });

  // Auto-activate encryption for new users
  const activateIronclad = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setIsLoading(true);
    try {
      // Check if user already has encryption
      let key = await retrieveEncryptionKey(user.id);
      
      if (!key) {
        // Generate new encryption key for user
        key = await generateEncryptionKey();
        await storeEncryptionKey(user.id, key);
        
        console.log('[PROTOCOL IRONCLAD] ✓ New encryption key generated for user:', user.id);
      }

      // Get key fingerprint for display
      const exported = await crypto.subtle.exportKey('raw', key);
      const hashBuffer = await crypto.subtle.digest('SHA-256', exported);
      const fingerprint = Array.from(new Uint8Array(hashBuffer).slice(0, 8))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(':');

      const activatedAt = new Date().toISOString();
      
      // Store activation status
      localStorage.setItem(`ironclad_activated_${user.id}`, activatedAt);

      setStatus({
        isActive: true,
        encryptionReady: true,
        protectionLevel: 'IRONCLAD',
        activatedAt,
        keyFingerprint: fingerprint,
      });

      console.log('[PROTOCOL IRONCLAD] ✓ Shields raised for user:', user.id);
      return true;

    } catch (error) {
      console.error('[PROTOCOL IRONCLAD] Activation failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Auto-initialize on mount for logged-in users
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const initializeIronclad = async () => {
      // Check if already activated
      const activatedAt = localStorage.getItem(`ironclad_activated_${user.id}`);
      
      if (activatedAt) {
        // Verify encryption key exists
        const key = await retrieveEncryptionKey(user.id);
        
        if (key) {
          // Get fingerprint
          const exported = await crypto.subtle.exportKey('raw', key);
          const hashBuffer = await crypto.subtle.digest('SHA-256', exported);
          const fingerprint = Array.from(new Uint8Array(hashBuffer).slice(0, 8))
            .map(b => b.toString(16).padStart(2, '0'))
            .join(':');

          setStatus({
            isActive: true,
            encryptionReady: true,
            protectionLevel: 'IRONCLAD',
            activatedAt,
            keyFingerprint: fingerprint,
          });
          setIsLoading(false);
          return;
        }
      }

      // Auto-activate for new users
      await activateIronclad();
    };

    initializeIronclad();
  }, [user, activateIronclad]);

  return {
    status,
    activateIronclad,
    isLoading,
  };
}

export default useProtocolIronclad;
