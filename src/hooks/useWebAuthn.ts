import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

type WebAuthnStep =
  | 'support_check'
  | 'register_begin'
  | 'register_prompt'
  | 'register_store'
  | 'register_complete'
  | 'auth_begin'
  | 'auth_prompt'
  | 'auth_complete'
  | 'auth_session'
  | 'error';

const redactEmail = (email?: string) => {
  if (!email) return undefined;
  const [name, domain] = email.split('@');
  if (!domain) return 'invalid-email';
  return `${name.slice(0, 2)}***@${domain}`;
};

const getWebAuthnDiagnostics = () => ({
  secureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
  hasPublicKeyCredential: typeof window !== 'undefined' && !!window.PublicKeyCredential,
  hasCredentialsApi: typeof navigator !== 'undefined' && !!navigator.credentials,
  platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  origin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
  rpId: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
});

const logWebAuthn = (step: WebAuthnStep, details: Record<string, unknown> = {}) => {
  const payload = {
    step,
    at: new Date().toISOString(),
    ...getWebAuthnDiagnostics(),
    ...details,
  };
  console.info('[WebAuthn]', payload);
  try {
    const existing = JSON.parse(localStorage.getItem('webauthn_diagnostics') || '[]');
    existing.push(payload);
    localStorage.setItem('webauthn_diagnostics', JSON.stringify(existing.slice(-25)));
  } catch {
    // localStorage diagnostics are best-effort only
  }
};

const toErrorDetails = (error: any) => ({
  name: error?.name,
  message: error?.message || String(error),
  code: error?.code,
  status: error?.status,
});

const base64URLEncode = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const base64URLDecode = (str: string): ArrayBuffer => {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
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
  authenticateWithEmail: (email: string) => Promise<boolean>;
  removeDevice: (credentialId: string) => Promise<boolean>;
  checkEnrollment: () => Promise<boolean>;
  deviceType: 'touchid' | 'faceid' | 'fingerprint' | 'unknown';
}

export const useWebAuthn = (): UseWebAuthnReturn => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [registeredDevices, setRegisteredDevices] = useState<WebAuthnDevice[]>([]);

  const isSupported =
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    !!window.PublicKeyCredential &&
    !!navigator.credentials;

  const getDeviceType = (): 'touchid' | 'faceid' | 'fingerprint' | 'unknown' => {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform?.toLowerCase() || '';
    if (platform.includes('mac') || userAgent.includes('macintosh')) return 'touchid';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'faceid';
    if (userAgent.includes('android')) return 'fingerprint';
    return 'unknown';
  };

  const deviceType = getDeviceType();

  const checkEnrollment = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    try {
      logWebAuthn('support_check', { userId: user.id });
      const { data, error } = await supabase
        .from('webauthn_credentials')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      const devices = (data || []).map((d) => ({
        id: d.id,
        credentialId: d.credential_id,
        deviceName: d.device_name || 'Biometric device',
        createdAt: d.created_at,
        lastUsed: d.last_used_at || d.created_at,
      }));
      setRegisteredDevices(devices);
      return devices.length > 0;
    } catch (error) {
      logWebAuthn('error', { action: 'checkEnrollment', error: toErrorDetails(error) });
      console.error('Error checking biometric enrollment:', error);
      return false;
    }
  }, [user]);

  const registerDevice = useCallback(async (deviceName?: string): Promise<boolean> => {
    if (!isSupported || !user) {
      toast.error('Biometric passkeys require a supported browser and an active login');
      return false;
    }

    setIsLoading(true);
    try {
      logWebAuthn('register_begin', { userId: user.id, deviceType });
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      logWebAuthn('register_prompt', { challengeLength: challenge.byteLength });
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "M'Mora", id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(user.id),
            name: user.email || 'user@mmora.app',
            displayName: user.user_metadata?.display_name || "M'Mora User",
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
          attestation: 'none',
        },
      }) as PublicKeyCredential | null;

      if (!credential) throw new Error('No credential created');
      const response = credential.response as AuthenticatorAttestationResponse;
      const publicKey = response.getPublicKey();
      if (!publicKey) throw new Error('This device did not return a usable public key');

      logWebAuthn('register_store', {
        credentialIdLength: credential.rawId.byteLength,
        publicKeyLength: publicKey.byteLength,
        authenticatorAttachment: credential.authenticatorAttachment,
      });

      const { error } = await supabase.from('webauthn_credentials').insert({
        user_id: user.id,
        credential_id: base64URLEncode(credential.rawId),
        public_key: base64URLEncode(publicKey),
        device_name: deviceName || (deviceType === 'touchid' ? 'Mac Touch ID' : deviceType === 'faceid' ? 'Apple Face ID' : deviceType === 'fingerprint' ? 'Android Fingerprint' : 'Passkey'),
        device_type: 'platform',
        counter: 0,
      });

      if (error) throw error;

      await supabase.from('user_security_settings').upsert({
        user_id: user.id,
        webauthn_enabled: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      await checkEnrollment();
      logWebAuthn('register_complete', { userId: user.id });
      toast.success('Native biometric login enrolled');
      return true;
    } catch (error: any) {
      logWebAuthn('error', { action: 'registerDevice', error: toErrorDetails(error) });
      console.error('Biometric registration error:', error);
      toast.error(error?.name === 'NotAllowedError' ? 'Biometric enrollment was cancelled' : error?.message || 'Failed to enroll biometric login');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkEnrollment, deviceType, isSupported, user]);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) {
      toast.error('Biometric verification requires an active login');
      return false;
    }

    setIsLoading(true);
    try {
      logWebAuthn('auth_begin', { userId: user.id, mode: 'session-verification' });
      const { data: credentials, error } = await supabase
        .from('webauthn_credentials')
        .select('credential_id')
        .eq('user_id', user.id);
      if (error) throw error;
      if (!credentials?.length) throw new Error('No biometric passkeys enrolled');

      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      logWebAuthn('auth_prompt', { allowCredentialCount: credentials.length });
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: credentials.map((c) => ({ type: 'public-key', id: base64URLDecode(c.credential_id), transports: ['internal'] })),
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname,
        },
      }) as PublicKeyCredential | null;

      if (!assertion) throw new Error('Biometric verification failed');
      await supabase.from('webauthn_credentials').update({ last_used_at: new Date().toISOString() }).eq('credential_id', base64URLEncode(assertion.rawId));
      logWebAuthn('auth_complete', { userId: user.id, mode: 'session-verification' });
      toast.success('Biometric verification successful');
      return true;
    } catch (error: any) {
      logWebAuthn('error', { action: 'authenticate', error: toErrorDetails(error) });
      console.error('Biometric verification error:', error);
      toast.error(error?.name === 'NotAllowedError' ? 'Biometric verification was cancelled' : error?.message || 'Biometric verification failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user]);

  const authenticateWithEmail = useCallback(async (email: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!isSupported) {
      toast.error('This browser does not support native biometric login');
      return false;
    }
    if (!cleanEmail) {
      toast.error('Enter your email before using biometric login');
      return false;
    }

    setIsLoading(true);
    try {
      logWebAuthn('auth_begin', { email: redactEmail(cleanEmail), mode: 'primary-login' });
      const { data: beginData, error: beginError } = await supabase.functions.invoke('passkey-auth', {
        body: {
          operation: 'begin_auth',
          email: cleanEmail,
          platform: deviceType,
          diagnostics: getWebAuthnDiagnostics(),
        },
      });
      if (beginError) throw beginError;
      if (!beginData?.success) throw new Error(beginData?.error || 'No biometric passkey is registered for this email');

      logWebAuthn('auth_prompt', {
        email: redactEmail(cleanEmail),
        challengeId: beginData.challengeId,
        allowCredentialCount: beginData.allowCredentials?.length || 0,
      });
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: base64URLDecode(beginData.challenge),
          allowCredentials: (beginData.allowCredentials || []).map((c: any) => ({ type: 'public-key', id: base64URLDecode(c.id), transports: c.transports || ['internal'] })),
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname,
        },
      }) as PublicKeyCredential | null;
      if (!assertion) throw new Error('Biometric verification failed');

      const response = assertion.response as AuthenticatorAssertionResponse;
      logWebAuthn('auth_complete', {
        email: redactEmail(cleanEmail),
        credentialIdLength: assertion.rawId.byteLength,
      });
      const { data: completeData, error: completeError } = await supabase.functions.invoke('passkey-auth', {
        body: {
          operation: 'complete_auth',
          email: cleanEmail,
          challengeId: beginData.challengeId,
          credentialId: base64URLEncode(assertion.rawId),
          authenticatorData: base64URLEncode(response.authenticatorData),
          clientDataJSON: base64URLEncode(response.clientDataJSON),
          signature: base64URLEncode(response.signature),
          platform: deviceType,
          diagnostics: getWebAuthnDiagnostics(),
        },
      });
      if (completeError) throw completeError;
      if (!completeData?.success || !completeData.token) throw new Error(completeData?.error || 'Biometric login failed');

      logWebAuthn('auth_session', { email: redactEmail(cleanEmail), userId: completeData.userId });
      const { error: signInError } = await supabase.auth.verifyOtp({ token_hash: completeData.token, type: 'magiclink' });
      if (signInError) throw signInError;

      toast.success('Biometric login successful');
      return true;
    } catch (error: any) {
      logWebAuthn('error', { action: 'authenticateWithEmail', email: redactEmail(cleanEmail), error: toErrorDetails(error) });
      console.error('Passkey login error:', error);
      toast.error(error?.name === 'NotAllowedError' ? 'Biometric login was cancelled' : error?.message || 'Biometric login failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [deviceType, isSupported]);

  const removeDevice = useCallback(async (credentialId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase.from('webauthn_credentials').delete().eq('credential_id', credentialId).eq('user_id', user.id);
      if (error) throw error;
      const stillEnrolled = await checkEnrollment();
      if (!stillEnrolled) {
        await supabase.from('user_security_settings').upsert({ user_id: user.id, webauthn_enabled: false, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      }
      toast.success('Biometric device removed');
      return true;
    } catch (error) {
      logWebAuthn('error', { action: 'removeDevice', error: toErrorDetails(error) });
      console.error('Error removing biometric device:', error);
      toast.error('Failed to remove biometric device');
      return false;
    }
  }, [checkEnrollment, user]);

  return { isSupported, isLoading, registeredDevices, registerDevice, authenticate, authenticateWithEmail, removeDevice, checkEnrollment, deviceType };
};