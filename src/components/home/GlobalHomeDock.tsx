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
import { Lightbulb, Sparkles, MessageCircle, Bell, User, Compass, Headphones, Music, Camera, ScanFace, Glasses } from 'lucide-react';
import HomeGlassDock from '@/components/home/HomeGlassDock';
import GrowthAlertsPanel from '@/components/growth/GrowthAlertsPanel';
import { useAuth } from '@/lib/auth';
import { useGrowthUnread } from '@/hooks/useGrowthUnread';
import { useNotificationFeatureBadges } from '@/hooks/useNotificationFeatureBadges';
import { buildExtraDockItems, DOCK_RESERVED_ROUTES } from '@/components/home/dockExtraActions';
import ZoeCallsIcon from '@/components/icons/ZoeCallsIcon';

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
        onHomeSelect={() => navigate('/home')}
        items={[
          {
            id: 'global-compass',
            label: 'DHF Neural Feed',
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
            label: 'Zoe AI chat',
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
            id: 'global-camera',
            label: 'Camera',
            icon: <Camera className="h-[22px] w-[22px]" />,
            active: pathname.startsWith('/camera'),
            onSelect: () => navigate('/camera'),
          },
          {
            id: 'global-selfie-city',
            label: 'Selfie City',
            icon: <ScanFace className="h-[22px] w-[22px]" />,
            active: pathname.startsWith('/selfie-city'),
            onSelect: () => navigate('/selfie-city'),
          },
          {
            id: 'global-vr-world',
            label: 'VR World',
            icon: <Glasses className="h-[22px] w-[22px]" />,
            active: pathname.startsWith('/zoe-omega'),
            onSelect: () => navigate('/zoe-omega?vr=1'),
          },
          {
            id: 'global-calls',
            label: 'Audio & video calls',
            icon: <ZoeCallsIcon className="h-[24px] w-[24px]" />,
            active: pathname.startsWith('/calls'),
            onSelect: () => navigate('/calls'),
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
          {
            id: 'global-music',
            label: 'Music',
            icon: <Music className="h-[22px] w-[22px]" />,
            active: pathname.startsWith('/music'),
            onSelect: () => navigate('/music'),
          },
          {
            id: 'global-zoe-audio',
            label: 'Zoe audio & Bluetooth',
            icon: <Headphones className="h-[22px] w-[22px]" />,
            active: pathname.startsWith('/zoe-audio'),
            onSelect: () => navigate('/zoe-audio'),
          },
          ...buildExtraDockItems(navigate, DOCK_RESERVED_ROUTES),
        ]}

      />
      <GrowthAlertsPanel open={alertsOpen} onOpenChange={setAlertsOpen} />
    </>
  );
};

export default GlobalHomeDock;
