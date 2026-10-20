import { Bell, Coins, Compass, Home, Lightbulb, Lock, Mail, MessageCircle, Mic, Music, ScanFace, Sparkles, User, UserCog, Camera } from 'lucide-react';
import { DOCK_EXTRA_DEFS, iconForRoute } from '@/components/home/dockExtraActions';
const primaryIcons = { '/compass': Compass, '/growth-insights': Lightbulb, '/zoe-ai': Sparkles,
  '/chat': MessageCircle, '/camera': Camera, '/profile': User, '/selfie-city': ScanFace,
  '/notification-history': Bell, '/music': Music, '/zoe-omega': Home };
// Profile settings sections, matched by their /profile#section link.
const sectionIcons = { 'quick-unlock': Lock, account: UserCog, 'identity-photo': ScanFace,
  'zoe-email': Mail, 'karma-swap': Coins, faith: Sparkles, 'voice-settings': Mic };
export default function PlatformResultIcon({ route }: { route: string }) {
  const [beforeHash, section = ''] = route.split('#');
  const path = beforeHash.split('?')[0];
  const Icon = (path === '/profile' && sectionIcons[section as keyof typeof sectionIcons])
    || DOCK_EXTRA_DEFS.find((entry) => entry.route === path)?.Icon
    || primaryIcons[path as keyof typeof primaryIcons] || iconForRoute(path);
  return <Icon className="h-5 w-5 shrink-0 text-current" aria-hidden />;
}
