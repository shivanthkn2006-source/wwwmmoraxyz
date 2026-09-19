/**
 * Registers this device so an incoming call can ring it while the app is closed
 * or the phone is asleep, and asks the backend to ring the other person when a
 * call starts. Every step fails quietly: a browser without push support simply
 * keeps the in-app ring.
 */
import { supabase } from '@/integrations/supabase/client';

export const VAPID_PUBLIC_KEY = 'BH51sn_VqeMVif69q047zfU_nJffyX6iE_rcb4Q-y0T4cVGgtjjugfV6-qnUL3ZPZmJk5K6V06ur94MUuJdYVok';

export const callPushSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export const urlBase64ToUint8Array = (base64: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
};

const keyToBase64 = (key: ArrayBuffer | null): string | null => {
  if (!key) return null;
  const bytes = new Uint8Array(key);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

export const registerCallPushDevice = async (userId: string): Promise<boolean> => {
  if (!callPushSupported() || !userId) return false;
  try {
    if (Notification.permission === 'denied') return false;
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.pushManager) return false;

    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));

    const p256dh = keyToBase64(subscription.getKey('p256dh'));
    const auth = keyToBase64(subscription.getKey('auth'));
    if (!p256dh || !auth) return false;

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent.slice(0, 200),
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    );
    if (error) {
      console.warn('[CallPush] could not save this device', error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('[CallPush] registration skipped', error);
    return false;
  }
};

export const ringReceiverDevice = async (
  receiverId: string,
  callerName: string | undefined,
  withVideo: boolean,
): Promise<void> => {
  try {
    await supabase.functions.invoke('zoe-call-push', {
      body: { receiverId, callerName, withVideo },
    });
  } catch (error) {
    console.warn('[CallPush] ring request failed', error);
  }
};
