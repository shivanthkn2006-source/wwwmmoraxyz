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

  const navItems: Array<{ icon: any; label: string; path: string; badge?: number; section?: string; color?: string }> = [
    // Core
    { icon: Home, label: 'Home', path: '/home', section: 'Core' },
    { icon: Camera, label: 'Camera', path: '/camera' },
    { icon: Atom, label: 'Quantum Camera', path: '/quantum-camera' },
    { icon: MessageCircle, label: 'Chat', path: '/chat', badge: unreadMessages },
    { icon: Users, label: 'Huddle', path: '/huddle', badge: newMatches },
    { icon: Globe, label: 'Webdrop', path: '/webdrop' },
    { icon: MapPin, label: 'Selfie City', path: '/selfie-city' },
    { icon: User, label: 'Profile', path: '/profile' },

    // Zoe Universe
    { icon: Sparkles, label: 'Zoe Infinity', path: '/zoe-infinity', section: 'Zoe Universe', color: 'text-blue-400' },
    { icon: Brain, label: 'Zoe AI', path: '/zoe-ai', color: 'text-blue-400' },
    { icon: Infinity, label: 'Zoe Omega', path: '/zoe-omega', color: 'text-blue-400' },
    { icon: Network, label: 'Zoe Nexus', path: '/zoe-nexus', color: 'text-blue-400' },
    { icon: CircuitBoard, label: 'Nexus Control', path: '/zoe-nexus-control', color: 'text-blue-400' },
    { icon: Layers, label: 'Zoe Architecture', path: '/zoe-architecture', color: 'text-blue-400' },
    { icon: Crown, label: 'God Mode', path: '/god-mode', color: 'text-amber-400' },
    { icon: Zap, label: 'God Mode Evolution', path: '/god-mode/evolution', color: 'text-amber-400' },
    { icon: Rocket, label: 'Omega Evolution', path: '/omega-evolution', color: 'text-blue-400' },
    { icon: Flame, label: 'Phoenix Core', path: '/phoenix-core', color: 'text-orange-400' },
    { icon: Gem, label: 'Genesis Imprint', path: '/genesis-imprint', color: 'text-blue-400' },

    // Companion & Wellness
    { icon: Heart, label: 'AI Companion', path: '/ai-companion', section: 'Companion', color: 'text-yellow-400' },
    { icon: Dna, label: 'Bio-Sync (Vitruvian)', path: '/vitruvian', color: 'text-cyan-400' },
    { icon: BookOpen, label: 'Universal Timeline', path: '/universal-timeline' },
    { icon: Clock, label: 'Kronos Anima', path: '/kronos-anima' },
    { icon: Sunrise, label: 'M\'mora', path: '/mmora' },

    // Career & Life
    { icon: Sparkles, label: 'Re-Sleeve', path: '/resleeve', section: 'Career & Life', color: 'text-blue-400' },
    { icon: Star, label: 'Career Divinity', path: '/career-divinity', color: 'text-amber-400' },
    { icon: Briefcase, label: 'Merchant Center', path: '/merchant' },

    // Legal & Scan
    { icon: Scale, label: 'Legal Nexus', path: '/legal-nexus', section: 'Legal & Scan', color: 'text-emerald-400' },
    { icon: ScrollText, label: 'Contract Scanner', path: '/contract-scanner', color: 'text-emerald-400' },
    { icon: BookOpen, label: 'Anka Shastra', path: '/anka-shastra' },
    { icon: Building2, label: 'Vastu Scan', path: '/vastu-scan' },
    { icon: Eye, label: 'Agasthya Vision', path: '/agasthya-vision' },

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
    { icon: ShieldCheck, label: 'Security', path: '/security', section: 'Diagnostics', color: 'text-emerald-400' },
    { icon: Shield, label: 'Sentinel', path: '/sentinel', color: 'text-emerald-400' },
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
          "fixed top-14 left-4 z-[101] w-56 max-h-[80vh] overflow-y-auto",
          "bg-black/70 backdrop-blur-2xl rounded-lg border border-white/10 shadow-2xl",
          "animate-in slide-in-from-top-2 fade-in duration-200"
        )}
      >
        <div className="p-2 space-y-0.5">
          {/* Search Button */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-search'));
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            <Search className="w-4 h-4" />
            <span className="text-xs font-medium">Search</span>
          </button>

          {/* Divider */}
          <div className="h-px bg-white/10 my-1" />

          {/* Navigation Items */}
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <React.Fragment key={item.path}>
                {item.section && (
                  <div className="px-2 pt-2 pb-1 text-[9px] uppercase tracking-wider text-white/30">
                    {item.section}
                  </div>
                )}
                <button
                  onClick={() => handleNavigation(item.path)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-all duration-200",
                    isActive
                      ? "bg-white/20 text-white"
                      : cn("hover:bg-white/10 hover:text-white", item.color || "text-white/70")
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-medium truncate">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <Badge className="ml-auto h-4 min-w-[16px] px-1 flex items-center justify-center text-[9px] bg-primary text-primary-foreground rounded-full">
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  )}
                </button>
              </React.Fragment>
            );
          })}

          {/* Divider */}
          <div className="h-px bg-white/10 my-1" />

          {/* Feed Selector - Text Only Highlight */}
          <div className="flex items-center gap-1 px-2 py-0.5">
            <span className="text-[10px] text-white/40">Feed:</span>
            <div className="flex gap-1">
              <button
                onClick={() => handleFeedChange('global')}
                className={cn(
                  "px-1 text-xs transition-all",
                  activeTab === 'global'
                    ? "text-white font-semibold"
                    : "text-white/40 hover:text-white/70"
                )}
              >
                Global
              </button>
              <span className="text-white/30 text-xs">/</span>
              <button
                onClick={() => handleFeedChange('personal')}
                className={cn(
                  "px-1 text-xs transition-all",
                  activeTab === 'personal'
                    ? "text-white font-semibold"
                    : "text-white/40 hover:text-white/70"
                )}
              >
                Friends
              </button>
              <span className="text-white/30 text-xs">/</span>
              <button
                onClick={() => handleFeedChange('selfiecity')}
                className={cn(
                  "px-1 text-xs transition-all flex items-center gap-0.5",
                    activeTab === 'selfiecity'
                      ? "text-yellow-400 font-semibold"
                      : "text-white/40 hover:text-yellow-300"
                )}
              >
                <MapPin className="w-3 h-3" />
                Selfie City
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/10 my-1" />

          {/* ATLAS (Smith HUD) */}
          {onOpenAtlas && (
            <button
              onClick={() => {
                onOpenAtlas();
                onClose();
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-atlas-cyan/80 hover:bg-atlas-cyan/10 hover:text-atlas-cyan transition-all duration-200"
            >
              <Orbit className="w-4 h-4" />
              <span className="text-xs font-medium">ATLAS</span>
            </button>
          )}

          {/* Divider */}
          <div className="h-px bg-white/10 my-1" />
          <button
            onClick={() => {
              onNotificationClick();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            <Bell className="w-4 h-4" />
            <span className="text-xs font-medium">Notifications</span>
            {unreadNotifications > 0 && (
              <Badge className="ml-auto h-4 min-w-[16px] px-1 flex items-center justify-center text-[9px] bg-rose-500 text-white rounded-full">
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </Badge>
            )}
          </button>

          {/* Private Timelines */}
          <button
            onClick={() => {
              onPrivateTimelineClick();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            <Heart className="w-4 h-4 text-blue-400 fill-blue-400" />
            <span className="text-xs font-medium">Private Feed</span>
          </button>

          {/* Bio-Sync / Vitruvian */}
          <button
            onClick={() => handleNavigation('/vitruvian')}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-cyan-400/70 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all duration-200"
          >
            <Dna className="w-4 h-4" />
            <span className="text-xs font-medium">Bio-Sync</span>
          </button>

          {/* Divider */}
          <div className="h-px bg-white/10 my-1" />

          {/* Re-Sleeve - Career Transformation */}
          <button
            onClick={() => handleNavigation('/resleeve')}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-blue-400/70 hover:bg-blue-500/10 hover:text-blue-400 transition-all duration-200"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-medium">Re-Sleeve</span>
          </button>

          {/* Career Divinity */}
          <button
            onClick={() => handleNavigation('/career-divinity')}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-amber-400/70 hover:bg-amber-500/10 hover:text-amber-400 transition-all duration-200"
          >
            <Star className="w-4 h-4" />
            <span className="text-xs font-medium">Career Divinity</span>
          </button>

          {/* Legal Nexus */}
          <button
            onClick={() => handleNavigation('/legal-nexus')}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-emerald-400/70 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all duration-200"
          >
            <Scale className="w-4 h-4" />
            <span className="text-xs font-medium">Legal Nexus</span>
          </button>

          {/* Zoe Infinity - LAST MENU ITEM */}
          <button
            onClick={() => handleNavigation('/zoe-infinity')}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-blue-400/70 hover:bg-blue-500/10 hover:text-blue-400 transition-all duration-200"
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
