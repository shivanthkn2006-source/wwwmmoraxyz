/**
 * Network Status Indicator
 * ========================
 * Subtle visual indicator showing online/offline/slow connection status.
 * Non-intrusive design for Zoe Infinity's minimalist UI.
 */

import React from 'react';
import { Wifi, WifiOff, Signal } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { cn } from '@/lib/utils';

interface NetworkStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
  minimal?: boolean;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  className,
  showLabel = false,
  minimal = true,
}) => {
  const status = useNetworkStatus();
  
  // Don't show anything when online and connection is good (minimal mode)
  if (minimal && status.isOnline && !status.isSlowConnection) {
    return null;
  }
  
  const getStatusInfo = () => {
    if (!status.isOnline) {
      return {
        icon: WifiOff,
        label: 'Offline',
        color: 'text-warning',
        bgColor: 'bg-warning/10',
        pulse: false,
      };
    }
    
    if (status.isSlowConnection) {
      return {
        icon: Signal,
        label: 'Slow Connection',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted/50',
        pulse: true,
      };
    }
    
    return {
      icon: Wifi,
      label: 'Online',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      pulse: false,
    };
  };
  
  const { icon: Icon, label, color, bgColor, pulse } = getStatusInfo();
  
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300',
        bgColor,
        color,
        pulse && 'animate-pulse',
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {showLabel && <span>{label}</span>}
    </div>
  );
};

/**
 * Offline Banner - Shows when user goes offline
 */
export const OfflineBanner: React.FC<{ className?: string }> = ({ className }) => {
  const status = useNetworkStatus();
  
  if (status.isOnline) return null;
  
  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 bg-warning/90 backdrop-blur-sm text-warning-foreground text-center py-2 px-4 text-sm font-medium',
        'animate-in slide-in-from-top duration-300',
        className
      )}
    >
      <WifiOff className="w-4 h-4 inline-block mr-2" />
      You're offline. Zoe will continue working with local data.
    </div>
  );
};

export default NetworkStatusIndicator;
