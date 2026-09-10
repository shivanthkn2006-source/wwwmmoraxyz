/**
 * Executes Zoe's spoken navigation intents. Renders nothing and touches no
 * existing UI — it only listens for `zoe-navigate` / `zoe-open-notifications`
 * and performs the in-app navigation with the router.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ZoeVoiceIntentHost() {
  const navigate = useNavigate();

  useEffect(() => {
    const onNavigate = (event: Event) => {
      const detail = (event as CustomEvent).detail ?? {};
      const path = detail.path ?? detail.route;
      if (typeof path === 'string' && path.startsWith('/')) navigate(path);
    };
    const onNotifications = () => {
      // Panels listen for this; if none is mounted the bell page still works.
      window.dispatchEvent(new CustomEvent('open-notification-panel'));
    };

    window.addEventListener('zoe-navigate', onNavigate as EventListener);
    window.addEventListener('zoe-open-notifications', onNotifications);
    return () => {
      window.removeEventListener('zoe-navigate', onNavigate as EventListener);
      window.removeEventListener('zoe-open-notifications', onNotifications);
    };
  }, [navigate]);

  return null;
}
