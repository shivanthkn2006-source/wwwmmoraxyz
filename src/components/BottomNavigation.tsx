import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Camera, MessageCircle, Home, Users, Share2, Mic2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRealTimeChat } from '@/hooks/useRealTimeChat';
import { useNewMatches } from '@/hooks/useNewMatches';
import { Badge } from '@/components/ui/badge';
import { triggerHomeRefresh } from '@/lib/homeRefresh';
import { useZoe } from '@/contexts/ZoeContext';
import { useMenuNotifications } from '@/hooks/useMenuNotifications';

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { chatUsers } = useRealTimeChat();
  const { newMatchesCount, markMatchesAsSeen } = useNewMatches();
  const { isListening, isMinimized } = useZoe();
  const { notifications, markFeatureSeen } = useMenuNotifications();
  const [isSearchActive, setIsSearchActive] = React.useState(false);

  const totalUnread = chatUsers.filter(user => (user.unread_count || 0) > 0).length;

  React.useEffect(() => {
    const handleSearchActive = (event: CustomEvent<{ active: boolean }>) => {
      setIsSearchActive(event.detail.active);
    };

    window.addEventListener('search-active', handleSearchActive as EventListener);
    return () => window.removeEventListener('search-active', handleSearchActive as EventListener);
  }, []);

  const handleNavigation = (path: string) => {
    if (path === '/huddle') {
      markMatchesAsSeen();
    }
    if (path === '/home') {
      triggerHomeRefresh();
    }
    if (path === 'search') {
      // Trigger search modal
      window.dispatchEvent(new CustomEvent('open-search'));
      return;
    }
    navigate(path);
  };

  const navItems = [
    { icon: Home, path: '/home', label: 'Home' },
    { icon: Camera, path: '/camera', label: 'Camera' },
    { icon: MessageCircle, path: '/chat', label: 'Chat' },
    { icon: Users, path: '/huddle', label: 'Huddle' },
    { icon: Share2, path: '/webdrop', label: 'Webdrop' },
  ];

  return (
    <div className={cn(
      "bottom-navigation fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300",
      "bg-background/95 backdrop-blur-md border-t border-border",
      "safe-area-pb",
      isSearchActive && "translate-y-full"
    )}>
      {/* Responsive navigation container */}
      <div className={cn(
        "flex justify-around items-center px-2",
        // Height responsive to screen size
        "h-14 xxs:h-14 xs:h-16 sm:h-16 md:h-18 lg:h-16 xl:h-18 2xl:h-20",
        // Padding for safe areas
        "pb-safe-bottom"
      )}>
        {/* Zoe Listening Indicator */}
        {isListening && isMinimized && (
          <div className={cn(
            "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
            "bg-primary rounded-full shadow-lg border-2 border-background",
            "px-2 py-0.5 xxs:px-2 xxs:py-0.5 xs:px-3 xs:py-1",
            "flex items-center gap-1 xxs:gap-1 xs:gap-2"
          )}>
            <Mic2 className="w-2.5 h-2.5 xxs:w-2.5 xxs:h-2.5 xs:w-3 xs:h-3 text-primary-foreground animate-pulse" />
            <span className="text-[10px] xxs:text-[10px] xs:text-xs text-primary-foreground font-medium">
              Zoe Listening
            </span>
          </div>
        )}
        
        {navItems.map(({ icon: Icon, path, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => handleNavigation(path)}
              className={cn(
                "flex flex-col items-center justify-center transition-colors relative",
                // Responsive touch targets - minimum 44px for accessibility
                "min-w-[44px] min-h-[44px]",
                "p-1 xxs:p-1 xs:p-1.5 sm:p-2 md:p-2.5",
                // Responsive spacing
                "space-y-0.5 xxs:space-y-0.5 xs:space-y-1",
                isActive ? "text-white" : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={label}
              data-tutorial={label === 'Huddle' ? 'huddle-nav' : undefined}
            >
              <div className="relative">
                {/* Responsive icon sizes */}
                <Icon className={cn(
                  "w-5 h-5 xxs:w-5 xxs:h-5 xs:w-6 xs:h-6 sm:w-6 sm:h-6 md:w-7 md:h-7",
                  "lg:w-6 lg:h-6 xl:w-7 xl:h-7 2xl:w-8 2xl:h-8"
                )} />
                
                {/* Home notifications */}
                {label === 'Home' && notifications.home > 0 && (
                  <Badge className={cn(
                    "absolute -top-1.5 -right-1.5 xxs:-top-1.5 xxs:-right-1.5 xs:-top-2 xs:-right-2",
                    "h-4 w-4 xxs:h-4 xxs:w-4 xs:h-5 xs:w-5",
                    "flex items-center justify-center p-0",
                    "text-[8px] xxs:text-[8px] xs:text-xs",
                    "bg-gradient-to-r from-pink-500 to-rose-500 text-white border-2 border-background"
                  )}>
                    {notifications.home > 9 ? '9+' : notifications.home}
                  </Badge>
                )}
                
                {/* Camera notifications */}
                {label === 'Camera' && notifications.camera > 0 && (
                  <Badge className={cn(
                    "absolute -top-1.5 -right-1.5 xxs:-top-1.5 xxs:-right-1.5 xs:-top-2 xs:-right-2",
                    "h-4 w-4 xxs:h-4 xxs:w-4 xs:h-5 xs:w-5",
                    "flex items-center justify-center p-0",
                    "text-[8px] xxs:text-[8px] xs:text-xs",
                    "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-2 border-background animate-pulse"
                  )}>
                    {notifications.camera > 9 ? '9+' : notifications.camera}
                  </Badge>
                )}
                
                {/* Chat notifications */}
                {label === 'Chat' && (totalUnread > 0 || notifications.chat > 0) && (
                  <Badge className={cn(
                    "absolute -top-1.5 -right-1.5 xxs:-top-1.5 xxs:-right-1.5 xs:-top-2 xs:-right-2",
                    "h-4 w-4 xxs:h-4 xxs:w-4 xs:h-5 xs:w-5",
                    "flex items-center justify-center p-0",
                    "text-[8px] xxs:text-[8px] xs:text-xs",
                    "bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-2 border-background"
                  )}>
                    {(totalUnread + notifications.chat) > 9 ? '9+' : totalUnread + notifications.chat}
                  </Badge>
                )}
                
                {/* Huddle notifications */}
                {label === 'Huddle' && (newMatchesCount > 0 || notifications.huddle > 0) && (
                  <Badge className={cn(
                    "absolute -top-1.5 -right-1.5 xxs:-top-1.5 xxs:-right-1.5 xs:-top-2 xs:-right-2",
                    "h-4 w-4 xxs:h-4 xxs:w-4 xs:h-5 xs:w-5",
                    "flex items-center justify-center p-0",
                    "text-[8px] xxs:text-[8px] xs:text-xs",
                    "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-2 border-background"
                  )}>
                    {(newMatchesCount + notifications.huddle) > 9 ? '9+' : newMatchesCount + notifications.huddle}
                  </Badge>
                )}
                
                {/* Webdrop notifications */}
                {label === 'Webdrop' && notifications.webdrop > 0 && (
                  <Badge className={cn(
                    "absolute -top-1.5 -right-1.5 xxs:-top-1.5 xxs:-right-1.5 xs:-top-2 xs:-right-2",
                    "h-4 w-4 xxs:h-4 xxs:w-4 xs:h-5 xs:w-5",
                    "flex items-center justify-center p-0",
                    "text-[8px] xxs:text-[8px] xs:text-xs",
                    "bg-gradient-to-r from-purple-500 to-violet-500 text-white border-2 border-background animate-pulse"
                  )}>
                    {notifications.webdrop > 9 ? '9+' : notifications.webdrop}
                  </Badge>
                )}
              </div>
              
              {/* Optional label for larger screens */}
              <span className="hidden sm:hidden md:hidden lg:block text-[10px] font-medium truncate max-w-[60px]">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;
