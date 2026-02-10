// ═══════════════════════════════════════════════════════════════════════════════
// SELFIE CITY SOVEREIGN - Deep integration with Zoe DHF Quantum ASI Core
// Connects AR Commerce to emotional intelligence, proactive notifications,
// premium user detection, and platform-wide health monitoring
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface BrandDeal {
  id: string;
  brand_name: string;
  brand_logo_url?: string;
  store_name?: string;
  category: string;
  subcategory?: string;
  discount_text?: string;
  description?: string;
  location_lat: number;
  location_lng: number;
  is_online: boolean;
  is_premium: boolean;
  valid_until?: string;
}

interface OnRouteNotification {
  id: string;
  type: 'deal' | 'friend' | 'brand' | 'premium';
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
  timestamp: string;
}

interface UserBrandPreference {
  brand_name: string;
  category: string;
  affinity_score: number;
  interaction_count: number;
}

interface SelfieCitySovereignState {
  isInitialized: boolean;
  isPremiumUser: boolean;
  nearbyDeals: BrandDeal[];
  activeNotifications: OnRouteNotification[];
  userPreferences: UserBrandPreference[];
  currentLocation: { lat: number; lng: number } | null;
  isTracking: boolean;
  healthScore: number;
}

// Calculate distance between two coordinates in meters
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Calculate direction based on bearing
const calculateDirection = (lat1: number, lng1: number, lat2: number, lng2: number): 'left' | 'right' | 'ahead' => {
  const dLon = (lng2 - lng1);
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  
  if (bearing >= -30 && bearing <= 30) return 'ahead';
  if (bearing > 30 && bearing < 150) return 'right';
  return 'left';
};

export const useSelfieCitySovereign = () => {
  const { user } = useAuth();
  const [state, setState] = useState<SelfieCitySovereignState>({
    isInitialized: false,
    isPremiumUser: false,
    nearbyDeals: [],
    activeNotifications: [],
    userPreferences: [],
    currentLocation: null,
    isTracking: false,
    healthScore: 100,
  });
  
  const watchIdRef = useRef<number | null>(null);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const notificationCooldownRef = useRef<Set<string>>(new Set());

  // Initialize sovereign system with robust error handling and retry limits
  const initRetryCountRef = useRef(0);
  const MAX_INIT_RETRIES = 3;
  
  const initialize = useCallback(async () => {
    if (!user?.id || state.isInitialized) return;
    
    // Prevent infinite retry loops
    if (initRetryCountRef.current >= MAX_INIT_RETRIES) {
      console.warn('[SelfieCitySovereign] Max init retries reached, marking as initialized');
      setState(prev => ({ ...prev, isInitialized: true }));
      return;
    }
    
    initRetryCountRef.current++;
    
    try {
      console.log('[SelfieCitySovereign] Initializing with Zoe DHF core... (attempt', initRetryCountRef.current, ')');
      
      const [preferencesRes, dealsRes, profileRes] = await Promise.allSettled([
        supabase
          .from('user_brand_preferences')
          .select('*')
          .eq('user_id', user.id)
          .order('affinity_score', { ascending: false }),
        supabase
          .from('brand_deals')
          .select('*')
          .or('valid_until.is.null,valid_until.gt.now()'),
        supabase
          .from('profiles')
          .select('current_tier, total_points')
          .eq('user_id', user.id)
          .single()
      ]);
      
      const preferences = preferencesRes.status === 'fulfilled' && preferencesRes.value ? (preferencesRes.value as any).data : [];
      const deals = dealsRes.status === 'fulfilled' && dealsRes.value ? (dealsRes.value as any).data : [];
      const profile = profileRes.status === 'fulfilled' && profileRes.value ? (profileRes.value as any).data : null;
      
      const isPremium = profile?.current_tier === 'Diamond' || 
                        profile?.current_tier === 'Platinum' ||
                        (profile?.total_points || 0) > 10000;
      
      setState(prev => ({
        ...prev,
        isInitialized: true,
        isPremiumUser: isPremium,
        nearbyDeals: deals || [],
        userPreferences: preferences || [],
      }));
      
      // Reset retry count on success
      initRetryCountRef.current = 0;
      
      // Log initialization event (non-blocking)
      supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'selfie_city_init',
        event_category: 'ar_commerce',
        context_snippet: `Premium: ${isPremium}, Deals: ${deals?.length || 0}`,
        metadata: { isPremium, dealCount: deals?.length || 0 },
        dhf_logged: true,
      });
      
      console.log('[SelfieCitySovereign] Initialized successfully');
    } catch (error) {
      console.warn('[SelfieCitySovereign] Initialization error (non-fatal):', error);
      // Still mark as initialized to prevent infinite retry loops
      setState(prev => ({ ...prev, isInitialized: true }));
    }
  }, [user?.id, state.isInitialized]);

  // Start GPS tracking for on-route notifications
  const startTracking = useCallback(() => {
    if (!navigator.geolocation || state.isTracking) return;
    
    console.log('[SelfieCitySovereign] Starting GPS tracking...');
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        const newLocation = { lat, lng };
        
        setState(prev => ({ ...prev, currentLocation: newLocation }));
        
        // Only process if moved significantly (>10m)
        if (lastLocationRef.current) {
          const moved = calculateDistance(
            lastLocationRef.current.lat,
            lastLocationRef.current.lng,
            lat, lng
          );
          if (moved < 10) return;
        }
        
        lastLocationRef.current = newLocation;
        
        // Record route history
        if (user?.id) {
          await supabase.from('user_route_history').insert({
            user_id: user.id,
            location_lat: lat,
            location_lng: lng,
          });
        }
        
        // Check for nearby deals
        await checkNearbyDeals(newLocation);
      },
      (error) => {
        console.error('[SelfieCitySovereign] GPS error:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );
    
    setState(prev => ({ ...prev, isTracking: true }));
  }, [state.isTracking, user?.id]);

  // Stop GPS tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState(prev => ({ ...prev, isTracking: false }));
    console.log('[SelfieCitySovereign] Stopped tracking');
  }, []);

  // Check for nearby deals and generate notifications
  const checkNearbyDeals = useCallback(async (location: { lat: number; lng: number }) => {
    if (!user?.id) return;
    
    const { nearbyDeals, userPreferences, isPremiumUser } = state;
    const notifications: OnRouteNotification[] = [];
    const NOTIFICATION_RADIUS = 500; // 500m radius
    
    for (const deal of nearbyDeals) {
      // Skip online-only deals for on-route
      if (deal.is_online || !deal.location_lat || !deal.location_lng) continue;
      
      // Skip premium deals for non-premium users
      if (deal.is_premium && !isPremiumUser) continue;
      
      // Calculate distance
      const distance = calculateDistance(
        location.lat, location.lng,
        deal.location_lat, deal.location_lng
      );
      
      // Check if within radius and not on cooldown
      if (distance <= NOTIFICATION_RADIUS && !notificationCooldownRef.current.has(deal.id)) {
        const direction = calculateDirection(
          location.lat, location.lng,
          deal.location_lat, deal.location_lng
        );
        
        // Calculate affinity score for personalization
        const preference = userPreferences.find(p => 
          p.brand_name.toLowerCase() === deal.brand_name.toLowerCase()
        );
        const affinityBoost = preference ? preference.affinity_score * 10 : 0;
        
        notifications.push({
          id: deal.id,
          type: deal.is_premium ? 'premium' : 'deal',
          title: deal.discount_text || 'Special Offer',
          description: deal.description || `Check out ${deal.brand_name}`,
          brandName: deal.brand_name,
          brandLogo: deal.brand_logo_url,
          distance: Math.round(distance),
          direction,
          discount: deal.discount_text,
          expiresIn: deal.valid_until ? getTimeRemaining(deal.valid_until) : undefined,
          category: deal.category,
          isNew: true,
          isPremium: deal.is_premium,
          timestamp: new Date().toISOString(),
        });
        
        // Add to cooldown (5 minutes)
        notificationCooldownRef.current.add(deal.id);
        setTimeout(() => {
          notificationCooldownRef.current.delete(deal.id);
        }, 5 * 60 * 1000);
        
        // Log notification event
        await supabase.from('on_route_notifications').insert({
          user_id: user.id,
          deal_id: deal.id,
          notification_type: deal.is_premium ? 'premium' : 'deal',
        });
        
        // Log to behavioral events
        await supabase.from('behavioral_events').insert({
          user_id: user.id,
          event_type: 'on_route_notification',
          event_category: 'ar_commerce',
          context_snippet: `${deal.brand_name} - ${distance}m away`,
          metadata: {
            deal_id: deal.id,
            brand: deal.brand_name,
            distance,
            is_premium: deal.is_premium,
          },
          dhf_logged: true,
        });
      }
    }
    
    // Sort by distance and preference
    notifications.sort((a, b) => {
      const prefA = userPreferences.find(p => p.brand_name === a.brandName)?.affinity_score || 0;
      const prefB = userPreferences.find(p => p.brand_name === b.brandName)?.affinity_score || 0;
      return (prefB - prefA) || (a.distance - b.distance);
    });
    
    if (notifications.length > 0) {
      setState(prev => ({
        ...prev,
        activeNotifications: [...notifications, ...prev.activeNotifications].slice(0, 20),
      }));
    }
  }, [state, user?.id]);

  // Update brand preference based on interaction
  const recordBrandInteraction = useCallback(async (
    brandName: string, 
    category: string, 
    interactionType: 'view' | 'click' | 'purchase' | 'save'
  ) => {
    if (!user?.id) return;
    
    const scoreMap = { view: 1, click: 3, save: 5, purchase: 10 };
    const score = scoreMap[interactionType];
    
    try {
      // Upsert preference
      await supabase.from('user_brand_preferences').upsert({
        user_id: user.id,
        brand_name: brandName,
        category,
        affinity_score: score,
        interaction_count: 1,
        last_interaction: new Date().toISOString(),
      }, {
        onConflict: 'user_id,brand_name',
      });
      
      // Update local state
      setState(prev => {
        const existing = prev.userPreferences.find(p => p.brand_name === brandName);
        if (existing) {
          return {
            ...prev,
            userPreferences: prev.userPreferences.map(p =>
              p.brand_name === brandName
                ? { ...p, affinity_score: p.affinity_score + score, interaction_count: p.interaction_count + 1 }
                : p
            ),
          };
        }
        return {
          ...prev,
          userPreferences: [...prev.userPreferences, {
            brand_name: brandName,
            category,
            affinity_score: score,
            interaction_count: 1,
          }],
        };
      });
      
      // Log behavioral event
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'brand_interaction',
        event_category: 'ar_commerce',
        context_snippet: `${interactionType}: ${brandName}`,
        metadata: { brandName, category, interactionType, score },
        dhf_logged: true,
      });
      
    } catch (error) {
      console.error('[SelfieCitySovereign] Brand interaction error:', error);
    }
  }, [user?.id]);

  // Detect premium products in image
  const detectPremiumProducts = useCallback(async (detectedProducts: any[]): Promise<boolean> => {
    const premiumBrands = [
      'Louis Vuitton', 'Gucci', 'Prada', 'Chanel', 'Hermès', 'Dior',
      'BMW', 'Mercedes', 'Audi', 'Porsche', 'Jaguar', 'Land Rover',
      'Rolex', 'Omega', 'Patek Philippe', 'Cartier', 'Tiffany',
      'Apple', 'Samsung Premium', 'Bose', 'Bang & Olufsen'
    ];
    
    for (const product of detectedProducts) {
      if (premiumBrands.some(b => 
        product.brand?.toLowerCase().includes(b.toLowerCase()) ||
        product.name?.toLowerCase().includes(b.toLowerCase())
      )) {
        // Update user as premium
        if (user?.id) {
          await supabase.from('behavioral_events').insert({
            user_id: user.id,
            event_type: 'premium_product_detected',
            event_category: 'ar_commerce',
            context_snippet: product.brand || product.name,
            metadata: product,
            dhf_logged: true,
          });
        }
        return true;
      }
    }
    return false;
  }, [user?.id]);

  // Dismiss a notification
  const dismissNotification = useCallback(async (notificationId: string) => {
    setState(prev => ({
      ...prev,
      activeNotifications: prev.activeNotifications.filter(n => n.id !== notificationId),
    }));
    
    if (user?.id) {
      await supabase.from('on_route_notifications')
        .update({ dismissed: true })
        .eq('deal_id', notificationId)
        .eq('user_id', user.id);
    }
  }, [user?.id]);

  // Mark notification as clicked
  const clickNotification = useCallback(async (notification: OnRouteNotification) => {
    await recordBrandInteraction(notification.brandName, notification.category, 'click');
    
    if (user?.id) {
      await supabase.from('on_route_notifications')
        .update({ clicked: true })
        .eq('deal_id', notification.id)
        .eq('user_id', user.id);
    }
  }, [user?.id, recordBrandInteraction]);

  // Get health score for self-healer integration
  const getHealthScore = useCallback((): number => {
    let score = 100;
    
    if (!state.isInitialized) score -= 30;
    if (!state.currentLocation) score -= 20;
    if (state.nearbyDeals.length === 0) score -= 15;
    if (!state.isTracking) score -= 10;
    
    return Math.max(0, score);
  }, [state]);

  // Get system health status
  const getSystemHealth = useCallback((): 'healthy' | 'degraded' | 'critical' => {
    const score = getHealthScore();
    if (score >= 80) return 'healthy';
    if (score >= 50) return 'degraded';
    return 'critical';
  }, [getHealthScore]);

  // Log DHF event
  const logDHFEvent = useCallback(async (eventType: string, metadata: Record<string, any> = {}) => {
    if (!user?.id) return;
    
    try {
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: eventType,
        event_category: 'ar_commerce',
        context_snippet: JSON.stringify(metadata).slice(0, 100),
        metadata,
        dhf_logged: true,
      });
    } catch (error) {
      console.error('[SelfieCitySovereign] DHF log error:', error);
    }
  }, [user?.id]);

  // Trigger health check
  const triggerHealthCheck = useCallback(async () => {
    const score = getHealthScore();
    const status = getSystemHealth();
    
    console.log(`[SelfieCitySovereign] Health check: ${status} (${score}%)`);
    
    // Auto-recovery actions
    if (!state.isInitialized && user?.id) {
      await initialize();
    }
    
    if (!state.isTracking && state.isInitialized) {
      startTracking();
    }
    
    return { score, status };
  }, [getHealthScore, getSystemHealth, state.isInitialized, state.isTracking, user?.id, initialize, startTracking]);

  // Initialize on mount
  useEffect(() => {
    if (user?.id && !state.isInitialized) {
      initialize();
    }
  }, [user?.id, state.isInitialized, initialize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    // State
    ...state,
    systemHealth: getSystemHealth(),
    
    // Actions
    initialize,
    startTracking,
    stopTracking,
    recordBrandInteraction,
    detectPremiumProducts,
    dismissNotification,
    clickNotification,
    getHealthScore,
    logDHFEvent,
    triggerHealthCheck,
    
    // Computed
    notificationCount: state.activeNotifications.length,
    hasNearbyDeals: state.nearbyDeals.length > 0,
  };
};

// Helper function
function getTimeRemaining(dateString: string): string {
  const remaining = new Date(dateString).getTime() - Date.now();
  if (remaining <= 0) return 'Expired';
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  if (hours >= 24) return `${Math.floor(hours / 24)}d left`;
  if (hours >= 1) return `${hours}h left`;
  
  const minutes = Math.floor(remaining / (1000 * 60));
  return `${minutes}m left`;
}
