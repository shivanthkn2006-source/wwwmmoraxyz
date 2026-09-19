/* Background ring handler. Imported by the app's service worker so an incoming
   call can ring even when the app is closed or the phone is asleep. */
/* eslint-disable no-undef */

self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_error) {
    payload = {};
  }

  const title = payload.title || 'Incoming call';
  const body = payload.body || 'Someone is calling you.';
  const url = payload.url || '/calls';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: payload.tag || 'mmora-call',
      renotify: true,
      requireInteraction: true,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [400, 200, 400, 200, 400],
      data: { url },
    }),
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/calls';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
