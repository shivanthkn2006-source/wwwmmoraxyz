/**
 * Headless host that keeps platform-wide notification alerts (sound + haptics
 * + toast) running on every route. Renders nothing.
 *
 * forwardRef so error-boundary wrappers that attach refs never warn.
 */
import { forwardRef } from 'react';
import useGlobalNotificationAlerts from '@/hooks/useGlobalNotificationAlerts';

export const NotificationAlertHost = forwardRef<HTMLDivElement>((_props, _ref) => {
  useGlobalNotificationAlerts();
  return null;
});
NotificationAlertHost.displayName = 'NotificationAlertHost';

export default NotificationAlertHost;
