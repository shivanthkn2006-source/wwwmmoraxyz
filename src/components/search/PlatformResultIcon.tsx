import { Bell, Compass, Home, Lightbulb, MessageCircle, Music, ScanFace, Sparkles, User, Camera } from 'lucide-react';
import { DOCK_EXTRA_DEFS, iconForRoute } from '@/components/home/dockExtraActions';
const primaryIcons = { '/compass': Compass, '/growth-insights': Lightbulb, '/zoe-ai': Sparkles,
  '/chat': MessageCircle, '/camera': Camera, '/profile': User, '/selfie-city': ScanFace,
  '/notification-history': Bell, '/music': Music, '/zoe-omega': Home };
export default function PlatformResultIcon({ route }: { route: string }) {
  const path = route.split('?')[0];
  const Icon = DOCK_EXTRA_DEFS.find((entry) => entry.route === path)?.Icon ?? primaryIcons[path as keyof typeof primaryIcons] ?? iconForRoute(path);
  return <Icon className="h-5 w-5 shrink-0 text-current" aria-hidden />;
}
