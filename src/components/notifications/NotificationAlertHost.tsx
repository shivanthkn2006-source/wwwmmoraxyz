/**
 * Headless host that keeps platform-wide notification alerts (sound + haptics
 * + toast) running on every route. Renders nothing.
 */
import useGlobalNotificationAlerts from '@/hooks/useGlobalNotificationAlerts';

export const NotificationAlertHost = () => {
  useGlobalNotificationAlerts();
  return null;
};

export default NotificationAlertHost;
