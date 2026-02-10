/**
 * Navigation Bus Context - Phase 2 "Grand Unification"
 * Bridges Search Intent → 3D Globe → Product Details
 * 
 * This global state holds the searchTarget that coordinates:
 * 1. Voice Search → Database Query → Coordinates
 * 2. Globe Camera flyTo animation
 * 3. Auto-open Product Details Modal after landing
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export interface SearchTarget {
  lat: number;
  lng: number;
  zoom?: number;
  productId?: string;
  type: 'product' | 'brand' | 'seller' | 'location' | 'offer' | 'category' | 'user';
  name: string;
  metadata?: {
    brand?: string;
    category?: string;
    discount?: string;
    storeName?: string;
    imageUrl?: string;
    description?: string;
    price_range?: string;
    rating?: number;
  };
}

interface NavigationBusState {
  searchTarget: SearchTarget | null;
  isFlying: boolean;
  flightProgress: number;
  lastSearchQuery: string;
  pendingProductModal: SearchTarget | null;
}

interface NavigationBusContextValue extends NavigationBusState {
  // Actions
  setSearchTarget: (target: SearchTarget | null) => void;
  startFlight: (target: SearchTarget) => void;
  completeFlight: () => void;
  cancelFlight: () => void;
  clearTarget: () => void;
  setFlightProgress: (progress: number) => void;
  
  // Modal control
  showProductModal: () => void;
  dismissProductModal: () => void;
}

const NavigationBusContext = createContext<NavigationBusContextValue | null>(null);

export const NavigationBusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<NavigationBusState>({
    searchTarget: null,
    isFlying: false,
    flightProgress: 0,
    lastSearchQuery: '',
    pendingProductModal: null,
  });
  
  const flightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const setSearchTarget = useCallback((target: SearchTarget | null) => {
    setState(prev => ({
      ...prev,
      searchTarget: target,
      lastSearchQuery: target?.name || prev.lastSearchQuery,
    }));
    
    // Dispatch event for globe and other consumers
    if (target) {
      console.log('[NavigationBus] New search target:', target);
      window.dispatchEvent(new CustomEvent('navigation-bus-target', {
        detail: target
      }));
    }
  }, []);
  
  const startFlight = useCallback((target: SearchTarget) => {
    setState(prev => ({
      ...prev,
      searchTarget: target,
      isFlying: true,
      flightProgress: 0,
      pendingProductModal: target, // Queue for modal after landing
      lastSearchQuery: target.name,
    }));
    
    // Dispatch fly-to event for globe
    window.dispatchEvent(new CustomEvent('selfie-city-globe-fly-to', {
      detail: {
        lat: target.lat,
        lng: target.lng,
        name: target.name,
        zoom: target.zoom || 4,
        duration: 2000,
      }
    }));
    
    console.log('[NavigationBus] Flight started to:', target.name, { lat: target.lat, lng: target.lng });
    
    // Connect to Zoe Core
    window.dispatchEvent(new CustomEvent('zoe-core-event', {
      detail: {
        type: 'navigation_flight_started',
        payload: { target: target.name, lat: target.lat, lng: target.lng }
      }
    }));
    
    // Auto-complete flight after animation duration (backup)
    if (flightTimeoutRef.current) {
      clearTimeout(flightTimeoutRef.current);
    }
    flightTimeoutRef.current = setTimeout(() => {
      completeFlight();
    }, 2500); // 2.5s flight + buffer
  }, []);
  
  const completeFlight = useCallback(() => {
    setState(prev => {
      if (!prev.isFlying) return prev;
      
      console.log('[NavigationBus] Flight completed, queuing product modal');
      
      // Dispatch completion event
      window.dispatchEvent(new CustomEvent('navigation-bus-flight-complete', {
        detail: prev.pendingProductModal
      }));
      
      // Connect to Zoe Core
      window.dispatchEvent(new CustomEvent('zoe-core-event', {
        detail: {
          type: 'navigation_flight_complete',
          payload: { target: prev.pendingProductModal?.name }
        }
      }));
      
      return {
        ...prev,
        isFlying: false,
        flightProgress: 100,
      };
    });
    
    if (flightTimeoutRef.current) {
      clearTimeout(flightTimeoutRef.current);
      flightTimeoutRef.current = null;
    }
  }, []);
  
  const cancelFlight = useCallback(() => {
    setState(prev => ({
      ...prev,
      isFlying: false,
      flightProgress: 0,
      pendingProductModal: null,
    }));
    
    if (flightTimeoutRef.current) {
      clearTimeout(flightTimeoutRef.current);
      flightTimeoutRef.current = null;
    }
  }, []);
  
  const clearTarget = useCallback(() => {
    setState(prev => ({
      ...prev,
      searchTarget: null,
      pendingProductModal: null,
    }));
  }, []);
  
  const setFlightProgress = useCallback((progress: number) => {
    setState(prev => ({
      ...prev,
      flightProgress: Math.min(100, Math.max(0, progress)),
    }));
  }, []);
  
  const showProductModal = useCallback(() => {
    setState(prev => {
      if (prev.pendingProductModal) {
        window.dispatchEvent(new CustomEvent('navigation-bus-show-product', {
          detail: prev.pendingProductModal
        }));
      }
      return prev;
    });
  }, []);
  
  const dismissProductModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      pendingProductModal: null,
    }));
  }, []);
  
  return (
    <NavigationBusContext.Provider value={{
      ...state,
      setSearchTarget,
      startFlight,
      completeFlight,
      cancelFlight,
      clearTarget,
      setFlightProgress,
      showProductModal,
      dismissProductModal,
    }}>
      {children}
    </NavigationBusContext.Provider>
  );
};

export const useNavigationBus = (): NavigationBusContextValue => {
  const context = useContext(NavigationBusContext);
  if (!context) {
    throw new Error('useNavigationBus must be used within NavigationBusProvider');
  }
  return context;
};

// Safe version that doesn't throw
export const useNavigationBusSafe = (): NavigationBusContextValue | null => {
  return useContext(NavigationBusContext);
};
