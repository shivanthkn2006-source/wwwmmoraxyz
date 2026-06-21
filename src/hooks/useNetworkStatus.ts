/**
 * Network Status Detection Hook
 * ==============================
 * Tracks online/offline state with connection quality indicators.
 * Essential for Zoe Infinity's offline-first architecture.
 */

import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string | null;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  lastChecked: number;
}

interface NetworkInformation extends EventTarget {
  effectiveType?: string;
  type?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

const getNetworkInfo = (): Partial<NetworkStatus> => {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  if (!connection) {
    return {
      connectionType: null,
      effectiveType: null,
      downlink: null,
      rtt: null,
    };
  }
  
  return {
    connectionType: connection.type || null,
    effectiveType: connection.effectiveType || null,
    downlink: connection.downlink || null,
    rtt: connection.rtt || null,
  };
};

const isSlowNetwork = (info: Partial<NetworkStatus>): boolean => {
  // Consider slow if:
  // - 2g or slow-2g effective type
  // - RTT > 500ms
  // - Downlink < 0.5 Mbps
  if (info.effectiveType === 'slow-2g' || info.effectiveType === '2g') return true;
  if (info.rtt && info.rtt > 500) return true;
  if (info.downlink && info.downlink < 0.5) return true;
  return false;
};

export const useNetworkStatus = (): NetworkStatus => {
  const [status, setStatus] = useState<NetworkStatus>(() => {
    const networkInfo = getNetworkInfo();
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSlowConnection: isSlowNetwork(networkInfo),
      connectionType: networkInfo.connectionType ?? null,
      effectiveType: networkInfo.effectiveType ?? null,
      downlink: networkInfo.downlink ?? null,
      rtt: networkInfo.rtt ?? null,
      lastChecked: Date.now(),
    };
  });
  
  const updateNetworkStatus = useCallback(() => {
    const networkInfo = getNetworkInfo();
    setStatus({
      isOnline: navigator.onLine,
      isSlowConnection: isSlowNetwork(networkInfo),
      connectionType: networkInfo.connectionType ?? null,
      effectiveType: networkInfo.effectiveType ?? null,
      downlink: networkInfo.downlink ?? null,
      rtt: networkInfo.rtt ?? null,
      lastChecked: Date.now(),
    });
  }, []);
  
  useEffect(() => {
    // Online/Offline events
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    // Connection change events (if supported)
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }
    
    // Periodic check every 30 seconds
    const interval = setInterval(updateNetworkStatus, 30000);
    
    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
      clearInterval(interval);
    };
  }, [updateNetworkStatus]);
  
  return status;
};

/**
 * Simple hook for just online/offline status
 */
export const useIsOnline = (): boolean => {
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
};

/**
 * Check network status synchronously (for non-hook contexts)
 */
export const checkNetworkStatus = (): NetworkStatus => {
  const networkInfo = getNetworkInfo();
  return {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlowConnection: isSlowNetwork(networkInfo),
    ...networkInfo,
    lastChecked: Date.now(),
  } as NetworkStatus;
};
