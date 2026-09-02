/**
 * GLOBAL HOME DOCK
 *
 * Mounts the bottom-right glass home dock on every authenticated route except
 * the feed itself (HomePage renders its own feed-aware dock) and the auth /
 * recovery screens. This guarantees the same icon, in the same corner, on all
 * pages — growth insights, admin pages, Zoe surfaces, profile, everything.
 *
 * Purely additive navigation: it renders no feed state and mutates nothing, so
 * it cannot affect any existing page behaviour.
 */
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Lightbulb, Sparkles, MessageCircle, Bell, User, Compass } from 'lucide-react';
import HomeGlassDock from '@/components/home/HomeGlassDock';
import GrowthAlertsPanel from '@/components/growth/GrowthAlertsPanel';
import { useAuth } from '@/lib/auth';
import { useGrowthUnread } from '@/hooks/useGrowthUnread';
import { useNotificationFeatureBadges } from '@/hooks/useNotificationFeatureBadges';
import { buildExtraDockItems } from '@/components/home/dockExtraActions';

/** Routes that own their dock, or must stay chrome-free. */
const EXCLUDED_PREFIXES = [
  '/home',
  '/auth',
  '/voice-auth',
  '/password-recovery',
  '/access-denied',
  // Zoe Infinity is a standalone product surface and intentionally carries
  // no M'Mora navigation chrome.
  '/zoe-infinity',
];

export const GlobalHomeDock: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, session, loading } = useAuth();
  const unread = useGrowthUnread();
  const { counts, total } = useNotificationFeatureBadges();
  const [alertsOpen, setAlertsOpen] = useState(false);

  const confirmedSignedOut = !loading && !user && !session;
  const hidden = confirmedSignedOut ||
    EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (hidden) return null;

  return (
    <>
      <HomeGlassDock
        triggerBadge={total}
        items={[
          {
            id: 'global-home',
            label: 'Home feed',
            icon: <Home className="h-[22px] w-[22px]" />,
            badge: counts.feed || undefined,
            onSelect: () => navigate('/home'),
          },
          {
            id: 'global-compass',
            label: "Zoe's DHF",
            icon: <Compass className="h-[22px] w-[22px]" />,
            badge: counts.compass || undefined,
            active: pathname.startsWith('/compass'),
            onSelect: () => navigate('/compass'),
          },
          {
            id: 'global-growth',
            label: 'Growth insights',
            icon: <Lightbulb className="h-[22px] w-[22px]" />,
            badge: (unread + counts.growth) || undefined,
            active: pathname.startsWith('/growth-insights'),
            onSelect: () => setAlertsOpen(true),
          },

          {
            id: 'global-zoe',
            label: 'Zoe AI',
            icon: <Sparkles className="h-[22px] w-[22px]" />,
            badge: counts.zoe || undefined,
            active: pathname.startsWith('/zoe-ai'),
            onSelect: () => navigate('/zoe-ai'),
          },
          {
            id: 'global-chat',
            label: 'Messages',
            icon: <MessageCircle className="h-[22px] w-[22px]" />,
            badge: counts.messages || undefined,
            active: pathname.startsWith('/chat'),
            onSelect: () => navigate('/chat'),
          },
          {
            id: 'global-notifications',
            label: 'Notifications',
            icon: <Bell className="h-[22px] w-[22px]" />,
            badge: total || undefined,
            active: pathname.startsWith('/notification-history'),
            onSelect: () => navigate('/notification-history'),
          },
          {
            id: 'global-profile',
            label: 'Profile',
            icon: <User className="h-[22px] w-[22px]" />,
            badge: counts.friends || undefined,
            active: pathname === '/profile',
            onSelect: () => navigate('/profile'),
          },
          ...buildExtraDockItems(navigate, [
            '/home',
            '/compass',
            '/growth-insights',
            '/zoe-ai',
            '/chat',
            '/notification-history',
            '/profile',
          ]),
        ]}
      />
      <GrowthAlertsPanel open={alertsOpen} onOpenChange={setAlertsOpen} />
    </>
  );
};

export default GlobalHomeDock;
