import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

// Base64URL encoding/decoding utilities
const base64URLEncode = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

const base64URLDecode = (str: string): ArrayBuffer => {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

interface WebAuthnDevice {
  id: string;
  credentialId: string;
  deviceName: string;
  createdAt: string;
  lastUsed: string;
}

interface UseWebAuthnReturn {
  isSupported: boolean;
  isLoading: boolean;
  registeredDevices: WebAuthnDevice[];
  registerDevice: (deviceName?: string) => Promise<boolean>;
  authenticate: () => Promise<boolean>;
  removeDevice: (credentialId: string) => Promise<boolean>;
  checkEnrollment: () => Promise<boolean>;
  deviceType: 'touchid' | 'faceid' | 'fingerprint' | 'unknown';
}

export const useWebAuthn = (): UseWebAuthnReturn => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [registeredDevices, setRegisteredDevices] = useState<WebAuthnDevice[]>([]);

  // Check WebAuthn support
  const isSupported = typeof window !== 'undefined' && 
    !!window.PublicKeyCredential && 
    typeof window.PublicKeyCredential === 'function';

  // Detect device type for UI
  const getDeviceType = (): 'touchid' | 'faceid' | 'fingerprint' | 'unknown' => {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform?.toLowerCase() || '';
    
    if (platform.includes('mac') || userAgent.includes('macintosh')) {
      return 'touchid';
    }
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 'faceid';
    }
    if (userAgent.includes('android')) {
      return 'fingerprint';
    }
    return 'unknown';
  };

  const deviceType = getDeviceType();

  // Check if user has enrolled credentials
  const checkEnrollment = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { data, error } = await supabase
        .from('webauthn_credentials')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setRegisteredDevices(data.map(d => ({
          id: d.id,
          credentialId: d.credential_id,
          deviceName: d.device_name || 'Unknown Device',
          createdAt: d.created_at,
          lastUsed: d.last_used_at || d.created_at
        })));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking enrollment:', error);
      return false;
    }
  }, [user]);

  // Register a new biometric device
  const registerDevice = useCallback(async (deviceName?: string): Promise<boolean> => {
    if (!isSupported || !user) {
      toast.error('WebAuthn not supported or user not authenticated');
      return false;
    }

    setIsLoading(true);
    
    try {
      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      
      const userId = new TextEncoder().encode(user.id);
      
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'ZOE Platform',
          id: window.location.hostname
        },
        user: {
          id: userId,
          name: user.email || 'user@zoe.platform',
          displayName: user.user_metadata?.display_name || 'ZOE User'
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' }  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred'
        },
        timeout: 60000,
        attestation: 'none'
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      
      // Store credential in database
      const { error } = await supabase
        .from('webauthn_credentials')
        .insert({
          user_id: user.id,
          credential_id: base64URLEncode(credential.rawId),
          public_key: base64URLEncode(response.getPublicKey() || new ArrayBuffer(0)),
          device_name: deviceName || `${deviceType === 'touchid' ? 'MacBook TouchID' : deviceType === 'faceid' ? 'iPhone FaceID' : 'Biometric Device'}`,
          counter: 0
        });

      if (error) throw error;

      await checkEnrollment();
      toast.success('Biometric authentication registered successfully');
      return true;
      
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Biometric registration was cancelled');
      } else if (error.name === 'NotSupportedError') {
        toast.error('This device does not support biometric authentication');
      } else {
        toast.error('Failed to register biometric: ' + error.message);
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user, deviceType, checkEnrollment]);

  // Authenticate using registered biometric
  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) {
      toast.error('WebAuthn not supported or user not authenticated');
      return false;
    }

    setIsLoading(true);
    
    try {
      // Get user's registered credentials
      const { data: credentials, error: fetchError } = await supabase
        .from('webauthn_credentials')
        .select('credential_id')
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;
      
      if (!credentials || credentials.length === 0) {
        toast.error('No biometric credentials registered. Please enroll first.');
        return false;
      }

      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const allowCredentials: PublicKeyCredentialDescriptor[] = credentials.map(c => ({
        type: 'public-key',
        id: base64URLDecode(c.credential_id),
        transports: ['internal']
      }));

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials,
        timeout: 60000,
        userVerification: 'required',
        rpId: window.location.hostname
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      }) as PublicKeyCredential;

      if (!assertion) {
        throw new Error('Authentication failed');
      }

      // Update last used timestamp
      await supabase
        .from('webauthn_credentials')
        .update({ last_used_at: new Date().toISOString() })
        .eq('credential_id', base64URLEncode(assertion.rawId));

      toast.success('Biometric verification successful');
      return true;
      
    } catch (error: any) {
      console.error('Authentication error:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Biometric verification was cancelled');
      } else {
        toast.error('Biometric verification failed');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user]);

  // Remove a registered device
  const removeDevice = useCallback(async (credentialId: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('webauthn_credentials')
        .delete()
        .eq('credential_id', credentialId)
        .eq('user_id', user.id);

      if (error) throw error;

      await checkEnrollment();
      toast.success('Device removed successfully');
      return true;
    } catch (error) {
      console.error('Error removing device:', error);
      toast.error('Failed to remove device');
      return false;
    }
  }, [user, checkEnrollment]);

  return {
    isSupported,
    isLoading,
    registeredDevices,
    registerDevice,
    authenticate,
    removeDevice,
    checkEnrollment,
    deviceType
  };
};
