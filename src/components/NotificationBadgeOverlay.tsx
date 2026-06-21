import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSymbolById, getNotificationPriority } from '@/data/universalSymbols';

interface UserNotification {
  symbolId: string;
  count?: number;
  timestamp: Date;
}

interface NotificationBadgeOverlayProps {
  notifications: UserNotification[];
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Notification Badge Overlay Component
 * Displays universal symbol badges on user markers in Huddle map
 * Uses glassmorphism design with translucent background
 */
export const NotificationBadgeOverlay: React.FC<NotificationBadgeOverlayProps> = ({ 
  notifications, 
  size = 'md' 
}) => {
  if (!notifications || notifications.length === 0) return null;

  // Sort by priority and show top 3 most important notifications
  const sortedNotifications = [...notifications]
    .sort((a, b) => getNotificationPriority(b.symbolId) - getNotificationPriority(a.symbolId))
    .slice(0, 3);

  const sizeConfig = {
    sm: { 
      badge: 'w-5 h-5 text-[10px]', 
      count: 'text-[7px]',
      gap: 'gap-0.5',
      padding: 'p-0.5'
    },
    md: { 
      badge: 'w-6 h-6 text-xs', 
      count: 'text-[8px]',
      gap: 'gap-1',
      padding: 'p-1'
    },
    lg: { 
      badge: 'w-7 h-7 text-sm', 
      count: 'text-[9px]',
      gap: 'gap-1',
      padding: 'p-1'
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`absolute -top-1 -right-1 flex ${sizeConfig[size].gap} z-20`}
      style={{ pointerEvents: 'none' }}
    >
      <AnimatePresence mode="popLayout">
        {sortedNotifications.map((notification, index) => {
          const symbol = getSymbolById(notification.symbolId);
          if (!symbol) return null;

          return (
            <motion.div
              key={`${notification.symbolId}-${index}`}
              initial={{ opacity: 0, scale: 0, rotate: -180 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0, rotate: 180 }}
              transition={{ 
                duration: 0.4, 
                delay: index * 0.05,
                type: 'spring',
                stiffness: 200,
                damping: 15
              }}
              className={`
                ${sizeConfig[size].badge} 
                ${sizeConfig[size].padding}
                rounded-full 
                flex items-center justify-center 
                relative
                backdrop-blur-xl
                border border-white/30
                shadow-lg
              `}
              style={{
                background: `linear-gradient(135deg, ${symbol.color}15, ${symbol.color}30)`,
                boxShadow: `0 0 15px ${symbol.color}40, inset 0 1px 2px rgba(255,255,255,0.3)`,
              }}
            >
              {/* Glow effect - CSS animation */}
              <div
                className="absolute inset-0 rounded-full animate-gpu-pulse-scale"
                style={{
                  background: `radial-gradient(circle, ${symbol.color}60 0%, transparent 70%)`,
                  filter: 'blur(4px)',
                }}
              />

              {/* Symbol */}
              <span className="relative z-10" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}>
                {symbol.symbol}
              </span>

              {/* Count badge */}
              {notification.count && notification.count > 1 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`
                    absolute -top-1 -right-1 
                    ${sizeConfig[size].count}
                    bg-gradient-to-br from-red-500 to-red-600
                    text-white 
                    rounded-full 
                    min-w-[14px] h-[14px]
                    flex items-center justify-center 
                    font-bold
                    border border-white/50
                    shadow-md
                  `}
                  style={{
                    padding: '1px 3px',
                    lineHeight: 1,
                  }}
                >
                  {notification.count > 9 ? '9+' : notification.count}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
};
