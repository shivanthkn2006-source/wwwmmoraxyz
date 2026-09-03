/**
 * EXTRA DOCK ACTIONS
 *
 * Real, wired platform destinations used to fill the home dock grid.
 * Every entry navigates to an existing route and uses a unique icon so no
 * symbol is ever repeated inside the dock panel.
 *
 * Presentation only — no state, no side effects beyond navigation.
 */
import React from 'react';
import {
  Compass,
  History,
  Mic,
  Star,
  LayoutDashboard,
  PhoneCall,
  Share2,
  Aperture,
  BarChart3,
  SlidersHorizontal,
  Download,
  Info,
  Smartphone,
  Layers,
  ShoppingBag,
  Briefcase,
  Ruler,
  Network,
  Orbit,
  Brain,
  Home,
  Scale,
  Building2,
  FileSearch,
  Clock,
  Bot,
  Bug,
} from 'lucide-react';
import type { GlassDockItem } from '@/components/home/HomeGlassDock';

const ICON_CLASS = 'h-[22px] w-[22px]';

interface ExtraDef {
  id: string;
  label: string;
  route: string;
  Icon: React.ComponentType<{ className?: string }>;
}

/** Ordered by usefulness — the dock trims from the end when space runs out. */
export const DOCK_EXTRA_DEFS: ExtraDef[] = [
  { id: 'dock-compass', label: 'DHF Neural Feed', route: '/compass', Icon: Compass },
  { id: 'dock-bug-report', label: 'Report a problem', route: '/bug-report', Icon: Bug },
  { id: 'dock-timeline', label: 'Universal timeline', route: '/universal-timeline', Icon: History },
  { id: 'dock-voice-commands', label: 'Voice commands', route: '/voice-commands', Icon: Mic },
  { id: 'dock-zoe-astro', label: 'Zoe Astro', route: '/zoe-astro', Icon: Star },
  { id: 'dock-dhf-dashboard', label: 'DHF dashboard', route: '/dhf-dashboard', Icon: LayoutDashboard },
  { id: 'dock-huddle', label: 'Huddle call', route: '/huddle', Icon: PhoneCall },
  { id: 'dock-webdrop', label: 'WebDrop share', route: '/webdrop', Icon: Share2 },
  { id: 'dock-quantum-camera', label: 'Quantum camera', route: '/quantum-camera', Icon: Aperture },
  { id: 'dock-analytics', label: 'Analytics', route: '/analytics-dashboard', Icon: BarChart3 },
  { id: 'dock-notification-prefs', label: 'Notification preferences', route: '/notification-preferences', Icon: SlidersHorizontal },
  { id: 'dock-activity-export', label: 'Activity export', route: '/activity-export', Icon: Download },
  { id: 'dock-zoe-ai-page', label: 'Zoe AI workspace', route: '/zoe-ai', Icon: Bot },
  { id: 'dock-agent-memory', label: 'Agent memory', route: '/agent-memory', Icon: Brain },
  { id: 'dock-home-return', label: 'Home feed', route: '/home', Icon: Home },
  { id: 'dock-platform-overview', label: 'Platform overview', route: '/platform-overview', Icon: Layers },
  { id: 'dock-merchant', label: 'Merchant', route: '/merchant', Icon: ShoppingBag },
  { id: 'dock-career', label: 'Career divinity', route: '/career-divinity', Icon: Briefcase },
  { id: 'dock-vitruvian', label: 'Vitruvian', route: '/vitruvian', Icon: Ruler },
  { id: 'dock-zoe-nexus', label: 'Zoe Nexus', route: '/zoe-nexus', Icon: Network },
  { id: 'dock-orbital', label: 'Orbital command', route: '/orbital-command', Icon: Orbit },
  { id: 'dock-legal-nexus', label: 'Legal nexus', route: '/legal-nexus', Icon: Scale },
  { id: 'dock-contract-scanner', label: 'Contract scanner', route: '/contract-scanner', Icon: FileSearch },
  { id: 'dock-vastu', label: 'Vastu scan', route: '/vastu-scan', Icon: Building2 },
  { id: 'dock-kronos', label: 'Kronos Anima', route: '/kronos-anima', Icon: Clock },
  { id: 'dock-install', label: 'Install app', route: '/install', Icon: Smartphone },
  { id: 'dock-about', label: 'About M\u2019Mora', route: '/about', Icon: Info },
];

/**
 * Routes rendered as primary dock items somewhere in the app. Every dock passes
 * this same list so the extra rows show identical icons and identical labels on
 * all 70+ pages.
 */
export const DOCK_RESERVED_ROUTES = [
  '/camera',
  '/chat',
  '/growth-insights',
  '/profile',
  '/selfie-city',
  '/compass',
  '/zoe-ai',
  '/notification-history',
];



/**
 * Builds real dock items for the extra rows, skipping any destination that the
 * caller already renders (matched by route) so no icon is ever duplicated.
 */
export function buildExtraDockItems(
  navigate: (path: string) => void,
  usedRoutes: string[] = [],
  limit = 32,
): GlassDockItem[] {
  const taken = new Set(usedRoutes);
  return DOCK_EXTRA_DEFS.filter((def) => !taken.has(def.route))
    .slice(0, limit)
    .map(({ id, label, route, Icon }) => ({
      id,
      label,
      icon: <Icon className={ICON_CLASS} />,
      onSelect: () => navigate(route),
    }));
}
