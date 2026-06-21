import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, Zap, Store, ChevronRight, Bell, Navigation, Percent, Crown, Coffee, ShoppingBag, Bookmark, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface OnRouteNotification {
  id: string;
  type: 'deal' | 'friend' | 'brand' | 'premium' | 'divine';
  title: string;
  description: string;
  brandName: string;
  brandLogo?: string;
  distance: number;
  direction: 'left' | 'right' | 'ahead';
  discount?: string;
  expiresIn?: string;
  category: string;
  isNew?: boolean;
  isPremium?: boolean;
  isDivineIntervention?: boolean;
  matchReason?: string;
  timestamp: string;
}

interface OnRouteNotificationsProps {
  notifications: OnRouteNotification[];
}

const categoryIcons: Record<string, typeof MapPin> = {
  'Food': Coffee,
  'Fashion': ShoppingBag,
  'Premium': Crown,
  'Sale': Percent,
  'Divine': Zap,
  'default': Store
};

const OnRouteNotifications: React.FC<OnRouteNotificationsProps> = ({ notifications }) => {
  const getDirectionText = (direction: string, distance: number) => {
    const dirText = direction === 'ahead' ? 'ahead' : `on your ${direction}`;
    return `${distance}m ${dirText}`;
  };

  const getCategoryIcon = (category: string) => {
    const Icon = categoryIcons[category] || categoryIcons['default'];
    return Icon;
  };

  const handleSave = useCallback((notification: OnRouteNotification) => {
    toast.success(`Saved ${notification.brandName} deal!`, {
      description: 'Added to your saved deals'
    });
  }, []);

  const handleShare = useCallback((notification: OnRouteNotification) => {
    if (navigator.share) {
      navigator.share({
        title: notification.title,
        text: `Check out this deal at ${notification.brandName}: ${notification.discount || 'Special offer'}`,
      }).catch(() => {});
    } else {
      toast.success('Link copied!');
    }
  }, []);

  const handleNavigate = useCallback((notification: OnRouteNotification) => {
    toast.success(`Navigating to ${notification.brandName}`, {
      description: `${notification.distance}m ${notification.direction}`
    });
  }, []);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-4">
        {/* Active Route Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl p-3 border border-primary/30"
        >
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Route Tracking Active</p>
              <p className="text-xs text-muted-foreground">Zoe is watching for deals on your path</p>
            </div>
          </div>
        </motion.div>

        {/* Notifications List */}
        <AnimatePresence mode="popLayout">
          {notifications.map((notification, index) => {
            const CategoryIcon = getCategoryIcon(notification.category);
            
            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                layout
                className={`glass-panel-2120 rounded-xl overflow-hidden ${
                  notification.isDivineIntervention 
                    ? 'border-2 border-primary/50 ring-2 ring-primary/20' 
                    : notification.isPremium 
                      ? 'border border-amber-500/30' 
                      : ''
                }`}
              >
                {/* Notification Header */}
                <div className="p-3 flex items-start gap-3">
                  {/* Brand Logo / Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    notification.isDivineIntervention
                      ? 'bg-gradient-to-br from-primary/40 to-secondary/30 animate-pulse'
                      : notification.isPremium 
                        ? 'bg-gradient-to-br from-amber-500/30 to-amber-600/20' 
                        : 'bg-primary/20'
                  }`}>
                    {notification.brandLogo ? (
                      <img 
                        src={notification.brandLogo} 
                        alt={notification.brandName} 
                        className="w-8 h-8 object-contain"
                      />
                    ) : (
                      <CategoryIcon className={`w-6 h-6 ${
                        notification.isDivineIntervention
                          ? 'text-primary'
                          : notification.isPremium 
                            ? 'text-amber-400' 
                            : 'text-primary'
                      }`} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground truncate">
                        {notification.brandName}
                      </span>
                      {notification.isDivineIntervention && (
                        <Badge className="bg-primary/20 text-primary text-[9px] px-1">
                          <Zap className="w-2 h-2 mr-0.5" />
                          DIVINE
                        </Badge>
                      )}
                      {notification.isNew && !notification.isDivineIntervention && (
                        <Badge className="bg-primary text-primary-foreground text-[9px] px-1">
                          NEW
                        </Badge>
                      )}
                      {notification.isPremium && (
                        <Badge className="bg-amber-500/20 text-amber-400 text-[9px] px-1">
                          <Crown className="w-2 h-2 mr-0.5" />
                          VIP
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-foreground/90 mt-0.5">{notification.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{notification.description}</p>
                    
                    {notification.matchReason && (
                      <p className="text-xs text-primary mt-1 italic">{notification.matchReason}</p>
                    )}

                    {/* Meta Info */}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-primary flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {getDirectionText(notification.direction, notification.distance)}
                      </span>
                      {notification.discount && (
                        <span className="text-xs text-destructive flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {notification.discount}
                        </span>
                      )}
                      {notification.expiresIn && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {notification.expiresIn}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>

                {/* Action Bar */}
                <div className="px-3 pb-3 flex gap-2">
                  <Button 
                    size="sm" 
                    className="flex-1 bg-primary text-primary-foreground"
                    onClick={() => handleNavigate(notification)}
                  >
                    <Navigation className="w-3 h-3 mr-1" />
                    Navigate
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-primary/30 text-primary"
                    onClick={() => handleSave(notification)}
                  >
                    <Bookmark className="w-3 h-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-primary/30 text-primary"
                    onClick={() => handleShare(notification)}
                  >
                    <Share2 className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {notifications.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Bell className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground text-sm">No deals on your route yet</p>
            <p className="text-muted-foreground/50 text-xs mt-1">
              Walk around to discover nearby offers
            </p>
          </motion.div>
        )}
      </div>
    </ScrollArea>
  );
};

export default OnRouteNotifications;
