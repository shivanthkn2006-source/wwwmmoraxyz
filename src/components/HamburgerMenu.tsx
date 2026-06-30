import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Camera, MessageCircle, Users, Globe, Bell, Heart, Search, Dna, MapPin,
  Sparkles, Star, Orbit, Scale, Brain, Zap, Shield, User, Settings, BookOpen,
  Eye, Mic, Activity, BarChart3, Clock, FileText, Compass, Rocket, Crown,
  Atom, Infinity, Telescope, Building2, Briefcase, GraduationCap, Map,
  Wand2, Layers, Cpu, Network, Database, Radar, Flame, Gem, TreePine,
  Sunrise, Mountain, Waves, CircuitBoard, ScrollText, BadgeCheck, Wrench,
  ShieldCheck, BellRing, History, Download, Hammer
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Shared menu palette — all colors come from `--menu-*` tokens in index.css.
 * Update those tokens to re-skin every navigation surface in one place.
 */
const MENU_TOKENS = {
  // Surfaces
  panelBg: 'bg-[hsl(var(--menu-bg-overlay)/0.78)] backdrop-blur-2xl',
  panelBorder: 'border border-[hsl(var(--menu-border)/0.25)]',
  divider: 'bg-[hsl(var(--menu-border)/0.18)]',
  // Text
  itemFg: 'text-[hsl(var(--menu-fg))]',
  itemFgMuted: 'text-[hsl(var(--menu-fg-muted))]',
  sectionFg: 'text-[hsl(var(--menu-section-fg)/0.7)]',
  accent: 'text-[hsl(var(--menu-accent))]',
  highlight: 'text-[hsl(var(--menu-highlight))]',
  // States
  hover: 'hover:bg-[hsl(var(--menu-hover-bg)/0.12)] hover:text-[hsl(var(--menu-accent))]',
  active: 'bg-[hsl(var(--menu-active-bg)/0.18)] text-[hsl(var(--menu-highlight))] ring-1 ring-[hsl(var(--menu-highlight)/0.4)]',
  // Badge
  badge:
    'bg-[hsl(var(--menu-badge-bg))] text-[hsl(var(--menu-badge-fg))] ring-1 ring-[hsl(var(--menu-accent)/0.4)]',
} as const;

type MenuTone = 'default' | 'accent' | 'highlight';

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadMessages?: number;
  unreadNotifications?: number;
  newMatches?: number;
  onNotificationClick: () => void;
  onPrivateTimelineClick: () => void;
  onOpenAtlas?: () => void;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  unreadMessages = 0,
  unreadNotifications = 0,
  newMatches = 0,
  onNotificationClick,
  onPrivateTimelineClick,
  onOpenAtlas,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleFeedChange = (tab: string) => {
    onTabChange(tab);
    onClose();
  };

  if (!isOpen) return null;

  const toneClass = (tone: MenuTone = 'default') =>
    tone === 'highlight' ? MENU_TOKENS.highlight
    : tone === 'accent' ? MENU_TOKENS.accent
    : MENU_TOKENS.itemFg;

  const navItems: Array<{ icon: any; label: string; path: string; badge?: number; section?: string; tone?: MenuTone }> = [
    // Core (default = blue)
    { icon: Home, label: 'Home', path: '/home', section: 'Core' },
    { icon: Camera, label: 'Camera', path: '/camera' },
    { icon: Atom, label: 'Quantum Camera', path: '/quantum-camera' },
    { icon: MessageCircle, label: 'Chat', path: '/chat', badge: unreadMessages },
    { icon: Users, label: 'Huddle', path: '/huddle', badge: newMatches },
    { icon: Globe, label: 'Webdrop', path: '/webdrop' },
    { icon: MapPin, label: 'Selfie City', path: '/selfie-city' },
    { icon: User, label: 'Profile', path: '/profile' },

    // Zoe Universe (blue accent; God Mode tier = yellow highlight)
    { icon: Sparkles, label: 'Zoe Infinity', path: '/zoe-infinity', section: 'Zoe Universe', tone: 'accent' },
    { icon: Brain, label: 'Zoe AI', path: '/zoe-ai', tone: 'accent' },
    { icon: Infinity, label: 'Zoe Omega', path: '/zoe-omega', tone: 'accent' },
    { icon: Network, label: 'Zoe Nexus', path: '/zoe-nexus', tone: 'accent' },
    { icon: CircuitBoard, label: 'Nexus Control', path: '/zoe-nexus-control', tone: 'accent' },
    { icon: Layers, label: 'Zoe Architecture', path: '/zoe-architecture', tone: 'accent' },
    { icon: Crown, label: 'God Mode', path: '/god-mode', tone: 'highlight' },
    { icon: Zap, label: 'God Mode Evolution', path: '/god-mode/evolution', tone: 'highlight' },
    { icon: Rocket, label: 'Omega Evolution', path: '/omega-evolution', tone: 'accent' },
    { icon: Flame, label: 'Phoenix Core', path: '/phoenix-core', tone: 'highlight' },
    { icon: Gem, label: 'Genesis Imprint', path: '/genesis-imprint', tone: 'accent' },

    // Companion & Wellness
    { icon: Heart, label: 'AI Companion', path: '/ai-companion', section: 'Companion', tone: 'highlight' },
    { icon: Dna, label: 'Bio-Sync (Vitruvian)', path: '/vitruvian', tone: 'accent' },
    { icon: BookOpen, label: 'Universal Timeline', path: '/universal-timeline' },
    { icon: Clock, label: 'Kronos Anima', path: '/kronos-anima' },
    { icon: Sunrise, label: "M'mora", path: '/mmora' },

    // Career & Life
    { icon: Sparkles, label: 'Re-Sleeve', path: '/resleeve', section: 'Career & Life', tone: 'accent' },
    { icon: Star, label: 'Career Divinity', path: '/career-divinity', tone: 'highlight' },
    { icon: Briefcase, label: 'Merchant Center', path: '/merchant' },

    // Legal & Scan
    { icon: Scale, label: 'Legal Nexus', path: '/legal-nexus', section: 'Legal & Scan', tone: 'accent' },
    { icon: ScrollText, label: 'Contract Scanner', path: '/contract-scanner', tone: 'accent' },
    { icon: BookOpen, label: 'Anka Shastra', path: '/anka-shastra' },
    { icon: Building2, label: 'Vastu Scan', path: '/vastu-scan' },
    { icon: Eye, label: 'Agasthya Vision', path: '/agasthya-vision', tone: 'highlight' },

    // Exodus & Maps
    { icon: Compass, label: 'Exodus', path: '/exodus', section: 'Exodus' },
    { icon: Map, label: 'Exodus Map', path: '/exodus-map' },
    { icon: Telescope, label: 'Orbital Command', path: '/orbital-command' },

    // Voice & Notifications
    { icon: Mic, label: 'Voice Commands', path: '/voice-commands', section: 'Voice & Alerts' },
    { icon: History, label: 'Voice History', path: '/voice-command-history' },
    { icon: BellRing, label: 'Notification Prefs', path: '/notification-preferences' },
    { icon: Bell, label: 'Notification History', path: '/notification-history', badge: unreadNotifications },

    // Diagnostics & Security
    { icon: ShieldCheck, label: 'Security', path: '/security', section: 'Diagnostics', tone: 'accent' },
    { icon: Shield, label: 'Sentinel', path: '/sentinel', tone: 'accent' },
    { icon: Database, label: 'DHF Dashboard', path: '/dhf-dashboard' },
    { icon: BarChart3, label: 'Analytics Dashboard', path: '/analytics-dashboard' },
    { icon: Activity, label: 'Platform Audit', path: '/platform-audit' },
    { icon: Radar, label: 'Root Scan', path: '/root-scan' },
    { icon: Cpu, label: 'VR World Audit', path: '/vr-audit' },
    { icon: Wrench, label: 'Integration Test', path: '/integration-test' },
    { icon: Hammer, label: 'ASI Test', path: '/asi-test' },
    { icon: FileText, label: 'Activity Export', path: '/activity-export' },
    { icon: Download, label: 'Blueprint Download', path: '/blueprint-download' },
    { icon: Wand2, label: 'Ear-Link Blueprint', path: '/ear-link-blueprint' },

    // About
    { icon: BadgeCheck, label: 'About', path: '/about', section: 'About' },
  ];

  const itemBase =
    'w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--menu-highlight)/0.6)]';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div
        className={cn(
          'fixed top-14 left-4 z-[101] w-56 max-h-[80vh] overflow-y-auto rounded-lg shadow-2xl',
          'animate-in slide-in-from-top-2 fade-in duration-200',
          MENU_TOKENS.panelBg,
          MENU_TOKENS.panelBorder
        )}
      >
        <div className="p-2 space-y-0.5">
          {/* Search Button */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-search'));
              onClose();
            }}
            className={cn(itemBase, MENU_TOKENS.itemFg, MENU_TOKENS.hover)}
          >
            <Search className="w-4 h-4" />
            <span className="text-xs font-medium">Search</span>
          </button>

          <div className={cn('h-px my-1', MENU_TOKENS.divider)} />

          {/* Navigation Items */}
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <React.Fragment key={item.path}>
                {item.section && (
                  <div className={cn('px-2 pt-2 pb-1 text-[9px] uppercase tracking-wider', MENU_TOKENS.sectionFg)}>
                    {item.section}
                  </div>
                )}
                <button
                  onClick={() => handleNavigation(item.path)}
                  className={cn(
                    itemBase,
                    isActive ? MENU_TOKENS.active : cn(toneClass(item.tone), MENU_TOKENS.hover)
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-medium truncate">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <Badge
                      className={cn(
                        'ml-auto h-4 min-w-[16px] px-1 flex items-center justify-center text-[9px] rounded-full',
                        MENU_TOKENS.badge
                      )}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  )}
                </button>
              </React.Fragment>
            );
          })}

          <div className={cn('h-px my-1', MENU_TOKENS.divider)} />

          {/* Feed Selector */}
          <div className="flex items-center gap-1 px-2 py-0.5">
            <span className={cn('text-[10px]', MENU_TOKENS.itemFgMuted)}>Feed:</span>
            <div className="flex gap-1">
              {(['global', 'personal', 'selfiecity'] as const).map((tab, idx) => (
                <React.Fragment key={tab}>
                  {idx > 0 && <span className={cn('text-xs', MENU_TOKENS.itemFgMuted)}>/</span>}
                  <button
                    onClick={() => handleFeedChange(tab)}
                    className={cn(
                      'px-1 text-xs transition-all flex items-center gap-0.5',
                      activeTab === tab
                        ? cn(MENU_TOKENS.highlight, 'font-semibold')
                        : cn(MENU_TOKENS.itemFgMuted, 'hover:text-[hsl(var(--menu-accent))]')
                    )}
                  >
                    {tab === 'selfiecity' && <MapPin className="w-3 h-3" />}
                    {tab === 'global' ? 'Global' : tab === 'personal' ? 'Friends' : 'Selfie City'}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className={cn('h-px my-1', MENU_TOKENS.divider)} />

          {/* ATLAS */}
          {onOpenAtlas && (
            <button
              onClick={() => {
                onOpenAtlas();
                onClose();
              }}
              className={cn(itemBase, MENU_TOKENS.accent, MENU_TOKENS.hover)}
            >
              <Orbit className="w-4 h-4" />
              <span className="text-xs font-medium">ATLAS</span>
            </button>
          )}

          <div className={cn('h-px my-1', MENU_TOKENS.divider)} />

          {/* Notifications */}
          <button
            onClick={() => {
              onNotificationClick();
              onClose();
            }}
            className={cn(itemBase, MENU_TOKENS.itemFg, MENU_TOKENS.hover)}
          >
            <Bell className="w-4 h-4" />
            <span className="text-xs font-medium">Notifications</span>
            {unreadNotifications > 0 && (
              <Badge
                className={cn(
                  'ml-auto h-4 min-w-[16px] px-1 flex items-center justify-center text-[9px] rounded-full',
                  MENU_TOKENS.badge
                )}
              >
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </Badge>
            )}
          </button>

          {/* Private Feed */}
          <button
            onClick={() => {
              onPrivateTimelineClick();
              onClose();
            }}
            className={cn(itemBase, MENU_TOKENS.itemFg, MENU_TOKENS.hover)}
          >
            <Heart className="w-4 h-4 text-[hsl(var(--menu-accent))] fill-[hsl(var(--menu-accent))]" />
            <span className="text-xs font-medium">Private Feed</span>
          </button>

          {/* Bio-Sync */}
          <button
            onClick={() => handleNavigation('/vitruvian')}
            className={cn(itemBase, MENU_TOKENS.accent, MENU_TOKENS.hover)}
          >
            <Dna className="w-4 h-4" />
            <span className="text-xs font-medium">Bio-Sync</span>
          </button>

          <div className={cn('h-px my-1', MENU_TOKENS.divider)} />

          {/* Re-Sleeve */}
          <button
            onClick={() => handleNavigation('/resleeve')}
            className={cn(itemBase, MENU_TOKENS.accent, MENU_TOKENS.hover)}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-medium">Re-Sleeve</span>
          </button>

          {/* Career Divinity */}
          <button
            onClick={() => handleNavigation('/career-divinity')}
            className={cn(itemBase, MENU_TOKENS.highlight, MENU_TOKENS.hover)}
          >
            <Star className="w-4 h-4" />
            <span className="text-xs font-medium">Career Divinity</span>
          </button>

          {/* Legal Nexus */}
          <button
            onClick={() => handleNavigation('/legal-nexus')}
            className={cn(itemBase, MENU_TOKENS.accent, MENU_TOKENS.hover)}
          >
            <Scale className="w-4 h-4" />
            <span className="text-xs font-medium">Legal Nexus</span>
          </button>

          {/* Zoe Infinity */}
          <button
            onClick={() => handleNavigation('/zoe-infinity')}
            className={cn(itemBase, MENU_TOKENS.accent, MENU_TOKENS.hover)}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-medium">Zoe Infinity</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default HamburgerMenu;
