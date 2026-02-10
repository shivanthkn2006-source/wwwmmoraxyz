import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Camera, MessageCircle, Users, Globe, Bell, Heart, Search, Dna, MapPin, Sparkles, Star, Orbit, Scale } from 'lucide-react';
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

  const navItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: Camera, label: 'Camera', path: '/camera' },
    { icon: MessageCircle, label: 'Chat', path: '/chat', badge: unreadMessages },
    { icon: Users, label: 'Huddle', path: '/huddle', badge: newMatches },
    { icon: Globe, label: 'Webdrop', path: '/webdrop' },
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
          "fixed top-14 left-4 z-[101] w-40",
          "bg-transparent backdrop-blur-2xl rounded-lg",
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
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-all duration-200",
                  isActive 
                    ? "bg-white/20 text-white" 
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-xs font-medium">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <Badge className="ml-auto h-4 min-w-[16px] px-1 flex items-center justify-center text-[9px] bg-primary text-primary-foreground rounded-full">
                    {item.badge > 99 ? '99+' : item.badge}
                  </Badge>
                )}
              </button>
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
                    ? "text-pink-400 font-semibold"
                    : "text-white/40 hover:text-pink-300"
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
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-violet-400/70 hover:bg-violet-500/10 hover:text-violet-400 transition-all duration-200"
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
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-purple-400/70 hover:bg-purple-500/10 hover:text-purple-400 transition-all duration-200"
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
