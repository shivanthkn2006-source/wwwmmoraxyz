/**
 * Device notification helper for growth cards.
 *
 * Uses the standard Notification API, preferring the service-worker
 * registration (required on Android/Chrome and installed PWAs, where
 * `new Notification()` throws) and falling back to a page notification on
 * desktop. Every call is wrapped: a browser that blocks or lacks notifications
 * simply does nothing, and the in-app top alert still fires.
 */
export type PushPermission = 'unsupported' | 'default' | 'granted' | 'denied';

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function pushPermission(): PushPermission {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission as PushPermission;
}

export async function requestPushPermission(): Promise<PushPermission> {
  if (!pushSupported()) return 'unsupported';
  try {
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      return Notification.permission as PushPermission;
    }
    return (await Notification.requestPermission()) as PushPermission;
  } catch {
    return 'denied';
  }
}

export async function showGrowthPush(opts: {
  title: string;
  body: string;
  tag: string;
  onClickUrl?: string;
}): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  const payload: NotificationOptions & { renotify?: boolean } = {
    body: opts.body.slice(0, 240),
    tag: `growth-${opts.tag}`,
    icon: '/placeholder.svg',
    badge: '/placeholder.svg',
    data: { url: opts.onClickUrl ?? '/growth-insights' },
    renotify: false,
  };
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg?.showNotification) {
      await reg.showNotification(opts.title, payload);
      return true;
    }
  } catch { /* fall through to the page notification */ }
  try {
    const n = new Notification(opts.title, payload);
    n.onclick = () => {
      try {
        window.focus();
        window.location.assign(opts.onClickUrl ?? '/growth-insights');
      } catch { /* ignore */ }
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}
